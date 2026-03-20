import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionGlobalConfig } from "framer-motion";
import "./index.css";
import App from "./App";
import { LevelCreator } from "./LevelCreator";
import AdventureApp from "./AdventureApp";
import { FreePlayGame } from "./FreePlayGame";

// Disable all Framer Motion animations when user prefers reduced motion
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  MotionGlobalConfig.skipAnimations = true;
}

// ?hc=1 — high-contrast mode: stronger board colors, no transparency tricks
const _rootParams = new URLSearchParams(window.location.search);
if (_rootParams.has('hc')) {
  document.documentElement.classList.add('hc');
}

// Capture PWA install prompt for use after Act 1 completes
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as unknown as Record<string, unknown>).__tbkA2HS = e;
});

const params = new URLSearchParams(window.location.search);
const isCreator   = params.has('creator');
const isAdventure = params.has('adventure');
const isFreePlay  = params.has('freeplay');

// Register service worker for PWA / offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* ignore in dev */ });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isCreator ? <LevelCreator /> : isFreePlay ? <FreePlayGame /> : isAdventure ? <AdventureApp /> : <App />}
  </StrictMode>
);
