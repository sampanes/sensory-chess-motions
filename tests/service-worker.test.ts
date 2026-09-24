import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const SOURCE = readFileSync('public/sw.js', 'utf8');
const SCOPE = 'https://example.test/tiny-hops/';

type Listener = (event: Record<string, unknown>) => void;

interface FakeCache {
  add: (key: string) => Promise<unknown>;
  put: (key: unknown, value: unknown) => Promise<unknown>;
  match: (key: unknown) => Promise<unknown>;
}

function worker(options: {
  cache: FakeCache;
  keys?: string[];
  fetch?: (request: unknown) => Promise<unknown>;
}) {
  const listeners: Record<string, Listener> = {};
  const deleted: string[] = [];
  let claimed = false;
  let skipped = false;
  const caches = {
    open: async () => options.cache,
    keys: async () => options.keys ?? [],
    delete: async (key: string) => { deleted.push(key); return true; },
  };
  const self = {
    registration: { scope: SCOPE },
    location: { origin: new URL(SCOPE).origin },
    clients: { claim: async () => { claimed = true; } },
    skipWaiting: async () => { skipped = true; },
    addEventListener: (name: string, listener: Listener) => { listeners[name] = listener; },
  };
  runInNewContext(SOURCE, {
    self,
    caches,
    fetch: options.fetch ?? (async () => { throw new Error('offline'); }),
    URL,
    // Leave the slow-network branch pending without keeping Node alive for 4s.
    setTimeout: () => 0,
    Error,
    Promise,
  });
  return {
    listeners,
    deleted,
    wasClaimed: () => claimed,
    wasSkipped: () => skipped,
  };
}

function blankCache(overrides: Partial<FakeCache> = {}): FakeCache {
  return {
    add: async () => undefined,
    put: async () => undefined,
    match: async () => undefined,
    ...overrides,
  };
}

function waitFor(listener: Listener): Promise<unknown> {
  let promise: Promise<unknown> | undefined;
  listener({ waitUntil: (value: Promise<unknown>) => { promise = value; } });
  assert.ok(promise);
  return promise;
}

test('service worker refuses to install without the required app shell', async () => {
  const root = new URL('./', SCOPE).href;
  const loaded = worker({
    cache: blankCache({ add: async (key) => {
      if (key === root) throw new Error('root failed');
    } }),
  });
  await assert.rejects(waitFor(loaded.listeners.install), /root failed/);
  assert.equal(loaded.wasSkipped(), false);
});

test('optional install art may fail after the app shell is cached', async () => {
  const root = new URL('./', SCOPE).href;
  const added: string[] = [];
  const loaded = worker({
    cache: blankCache({ add: async (key) => {
      added.push(key);
      if (key !== root) throw new Error('optional failed');
    } }),
  });
  await waitFor(loaded.listeners.install);
  assert.equal(added[0], root);
  assert.equal(loaded.wasSkipped(), true);
});

test('activation deletes only Tiny Hops and known legacy caches', async () => {
  const loaded = worker({
    cache: blankCache(),
    keys: ['tiny-hops-v1', 'tiny-hops-v3', 'tbk-v1', 'another-pages-app'],
  });
  await waitFor(loaded.listeners.activate);
  assert.deepEqual(loaded.deleted.sort(), ['tbk-v1', 'tiny-hops-v1']);
  assert.equal(loaded.wasClaimed(), true);
});

test('a cache-write failure cannot discard a successful online response', async () => {
  const response = { ok: true, type: 'basic', clone: () => ({ copy: true }) };
  const loaded = worker({
    cache: blankCache({ put: async () => { throw new Error('storage full'); } }),
    fetch: async () => response,
  });
  let answer: Promise<unknown> | undefined;
  let lifetime: Promise<unknown> | undefined;
  loaded.listeners.fetch({
    request: { method: 'GET', mode: 'navigate', url: `${SCOPE}?p=K-t` },
    respondWith: (value: Promise<unknown>) => { answer = value; },
    waitUntil: (value: Promise<unknown>) => { lifetime = value; },
  });
  assert.ok(answer);
  assert.equal(await answer, response);
  assert.ok(lifetime);
  await lifetime;
});

test('offline shared links use the cached root shell from the current cache', async () => {
  const root = new URL('./', SCOPE).href;
  const offline = { ok: true, source: 'cache' };
  const matched: unknown[] = [];
  const loaded = worker({
    cache: blankCache({ match: async (key) => { matched.push(key); return offline; } }),
  });
  let answer: Promise<unknown> | undefined;
  loaded.listeners.fetch({
    request: { method: 'GET', mode: 'navigate', url: `${SCOPE}?p=K-t` },
    respondWith: (value: Promise<unknown>) => { answer = value; },
    waitUntil: () => {},
  });
  assert.ok(answer);
  assert.equal(await answer, offline);
  assert.deepEqual(matched, [root]);
});
