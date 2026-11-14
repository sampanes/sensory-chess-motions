"""Bake the friend bodies sheet into small SVG paths for the game.

usage: python scripts/bake-friends.py            write src/ui/friendBodies.ts
       python scripts/bake-friends.py --check    fail if that file is stale or over budget
       python scripts/bake-friends.py --preview DIR   also write one PNG per step into DIR

Input is art/sheets/01-friend-bodies.png (prompt 1 in docs/ART_PROMPTS.md): six faceless
friends on a transparent background, in reading order king, queen, rook, bishop, knight, pawn.

Steps, per friend:
  1. cut the sheet apart on its empty bands (rows, then columns);
  2. place it on one shared square canvas (same scale for all six, standing on one baseline),
     shrunk smoothly;
  3. snap every solid pixel to the nearest of the friend's own colors (its ROLES below), so the
     traced shapes come out flat and few;
  4. trace with vtracer and keep each path with its role, not its color.
The game paints the roles: fill and dark are the friend's two colors (or gray, or ivory),
shade sits between them, and the jewels keep their own colors.

Needs: pip install vtracer pillow numpy
"""

import argparse
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / 'art' / 'sheets' / '01-friend-bodies.png'
OUT = ROOT / 'src' / 'ui' / 'friendBodies.ts'
ORDER = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn']
MIRROR: set = set()  # the sheet's knight already faces left, like the game's
BUDGET = 6000  # characters of path data per friend

# The colors the sheet actually uses, by role (sampled from the sheet).
ROLES = {
    'king': {'fill': '#fcb70b', 'dark': '#903600', 'ruby': '#e8141b', 'sapphire': '#1e74e0'},
    'queen': {'fill': '#fb88b2', 'dark': '#a60b44'},
    'rook': {'fill': '#6db5fb', 'dark': '#013fbd'},
    'bishop': {'fill': '#b58df9', 'dark': '#4f1cb2'},
    'knight': {'fill': '#fca335', 'dark': '#963701', 'shade': '#dc7820'},
    'pawn': {'fill': '#83f5ae', 'dark': '#036c25'},
}
# Each role is traced from one key color, so the tracer sees exactly these and nothing else.
KEY = {'fill': (255, 0, 0), 'dark': (0, 0, 255), 'shade': (0, 255, 0), 'ruby': (255, 0, 255), 'sapphire': (0, 255, 255)}
BACK = (255, 255, 255)

# The shared canvas: tallest friend fills TALL of it, everyone stands at BASE.
TALL = 0.88
BASE = 0.90
# The canvas is traced at this many pixels a side: fewer pixels, fewer curve pieces.
TRACE_SIDE = 300


def runs(v, least):
    out, start = [], None
    for i, on in enumerate(list(v) + [False]):
        if on and start is None:
            start = i
        elif not on and start is not None:
            if i - start >= least:
                out.append((start, i))
            start = None
    return out


def cut(sheet):
    a = np.array(sheet.convert('RGBA'))
    solid = a[:, :, 3] > 128
    pieces = []
    for y0, y1 in runs(solid.any(axis=1), 40):
        for x0, x1 in runs(solid[y0:y1].any(axis=0), 40):
            sub = solid[y0:y1, x0:x1]
            ys = np.nonzero(sub.any(axis=1))[0]
            pieces.append(a[y0 + ys[0]:y0 + ys[-1] + 1, x0:x1])
    if len(pieces) != len(ORDER):
        sys.exit(f'expected {len(ORDER)} friends on the sheet, found {len(pieces)}')
    return pieces


def snap(piece, roles):
    """Every solid pixel becomes its nearest role's key color; the rest is background."""
    rgb = piece[:, :, :3].astype(int)
    names = list(roles)
    refs = np.array([[int(roles[n][i:i + 2], 16) for i in (1, 3, 5)] for n in names])
    d = ((rgb[:, :, None, :] - refs[None, None, :, :]) ** 2).sum(axis=3)
    pick = d.argmin(axis=2)
    out = np.zeros(piece.shape[:2] + (3,), dtype=np.uint8)
    out[:] = BACK
    solid = piece[:, :, 3] > 128
    for k, n in enumerate(names):
        out[solid & (pick == k)] = KEY[n]
    return out


def place(piece, side, mirror):
    """The raw piece on the shared canvas, shrunk smoothly to TRACE_SIDE (then snapped)."""
    h, w = piece.shape[:2]
    canvas = np.zeros((side, side, 4), dtype=np.uint8)
    top = round(BASE * side) - h
    left = (side - w) // 2
    canvas[top:top + h, left:left + w] = piece[:, ::-1] if mirror else piece
    return np.array(Image.fromarray(canvas).resize((TRACE_SIDE, TRACE_SIDE), Image.LANCZOS))


def trace(canvas):
    # vtracer 0.6.15 on Python 3.14 crashes when given any setting, so it runs on its
    # defaults (color, stacked, spline). The snapped canvas holds only a few key colors
    # far apart, which is what the defaults need.
    import tempfile
    import vtracer
    with tempfile.TemporaryDirectory() as tmp:
        src, dst = Path(tmp) / 'in.png', Path(tmp) / 'out.svg'
        Image.fromarray(canvas).save(src)
        vtracer.convert_image_to_svg_py(str(src), str(dst))
        svg = dst.read_text(encoding='utf-8')
    paths = []
    for m in re.finditer(r'<path d="([^"]+)" fill="#([0-9A-Fa-f]{6})" transform="translate\(([-\d.]+),([-\d.]+)\)"', svg):
        d, hexc, tx, ty = m.group(1), m.group(2), float(m.group(3)), float(m.group(4))
        rgb = tuple(int(hexc[i:i + 2], 16) for i in (0, 2, 4))
        role = min(list(KEY) + ['back'], key=lambda n: sum((x - y) ** 2 for x, y in zip(rgb, KEY.get(n, BACK))))
        if role == 'back':
            continue
        paths.append((role, d, tx, ty))
    return paths


def to_units(d, tx, ty, scale):
    """Path data in the game's 0..100 box, one decimal, curves relative (shorter)."""
    def r(v):
        return round(v * 10) / 10

    def f(v):
        t = f'{v:.1f}'.rstrip('0').rstrip('.')
        t = '0' if t == '-0' else t
        return t.replace('0.', '.', 1) if t.startswith(('0.', '-0.')) else t

    out, here, nums, cmd = [], (0.0, 0.0), [], None
    for tok in re.findall(r'[A-Za-z]|-?\d+(?:\.\d+)?', d) + ['Z']:
        if tok.isalpha():
            pts = [(r((nums[i] + tx) * scale), r((nums[i + 1] + ty) * scale)) for i in range(0, len(nums), 2)]
            if cmd == 'M':
                here = pts[0]
                out.append('M' + f(here[0]) + ' ' + f(here[1]))
            elif cmd in ('C', 'L'):
                step = 3 if cmd == 'C' else 1
                for i in range(0, len(pts), step):
                    seg = pts[i:i + step]
                    out.append(cmd.lower() + ' '.join(f(x - here[0]) + ' ' + f(y - here[1]) for x, y in seg))
                    here = seg[-1]
            elif cmd == 'Z':
                out.append('z')
            elif cmd is not None:
                sys.exit(f'unexpected path command {cmd}')
            cmd, nums = tok, []
        else:
            nums.append(float(tok))
    text = ''.join(out[:-1] if out and out[-1] == 'z' and not d.rstrip().endswith('Z') else out)
    return text.replace(' -', '-')


def bake(preview=None):
    pieces = cut(Image.open(SHEET))
    side = round(max(p.shape[0] for p in pieces) / TALL)
    scale = 100 / TRACE_SIDE
    lines = [
        '// GENERATED by scripts/bake-friends.py from art/sheets/01-friend-bodies.png. Do not edit.',
        '// Each friend is a stack of paths, bottom first, in the 0..100 box FriendArt draws in.',
        '// A role is painted by the game: fill and dark are the friend\'s two colors, shade sits',
        '// between them, ruby and sapphire are the king\'s jewels.',
        '',
        "import type { Kind } from '../core/types.ts';",
        '',
        "export type BodyRole = 'fill' | 'dark' | 'shade' | 'ruby' | 'sapphire';",
        '',
        'export const FRIEND_BODIES: Record<Kind, readonly (readonly [BodyRole, string])[]> = {',
    ]
    sizes = {}
    for kind, piece in zip(ORDER, pieces):
        canvas = snap(place(piece, side, kind in MIRROR), ROLES[kind])
        if preview:
            Image.fromarray(canvas).save(Path(preview) / f'{kind}-snapped.png')
        paths = trace(canvas)
        body = [(role, to_units(d, tx, ty, scale)) for role, d, tx, ty in paths]
        sizes[kind] = sum(len(d) for _, d in body)
        lines.append(f'  {kind}: [')
        for role, d in body:
            lines.append(f"    ['{role}', '{d}'],")
        lines.append('  ],')
    lines.append('};')
    return '\n'.join(lines) + '\n', sizes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--preview')
    args = ap.parse_args()
    text, sizes = bake(args.preview)
    over = {k: v for k, v in sizes.items() if v > BUDGET}
    for k, v in sizes.items():
        print(f'{k:7} {v:5} chars of path')
    if over:
        sys.exit(f'over the {BUDGET}-character budget: {over}')
    if args.check:
        if not OUT.exists() or OUT.read_text(encoding='utf-8') != text:
            sys.exit(f'{OUT.relative_to(ROOT)} is stale: run python scripts/bake-friends.py')
        print('friendBodies.ts is current')
        return
    OUT.write_text(text, encoding='utf-8', newline='\n')
    print(f'wrote {OUT.relative_to(ROOT)} ({len(text)} bytes)')


if __name__ == '__main__':
    main()
