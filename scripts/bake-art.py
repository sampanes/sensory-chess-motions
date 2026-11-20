"""Bake an art sheet into small SVG paths for the game.

usage: python scripts/bake-art.py [friends|treats|rocks|all]        write the TS file(s)
       python scripts/bake-art.py [which] --check    fail if a file is stale or over budget
       python scripts/bake-art.py [which] --preview DIR   also write each snapped piece as a PNG
A sheet that is not in art/sheets/ yet is skipped with a note (its prompt is in
docs/ART_PROMPTS.md), so --check passes until the sheet arrives.

Steps, per piece:
  1. cut the sheet apart on its empty bands (rows, then columns), in reading order;
  2. place it on one shared square canvas (the same scale for every piece on the sheet; friends
     stand on one baseline, everything else is centered), shrunk smoothly;
  3. snap every solid pixel to the nearest of the piece's own colors (its palette below), so the
     traced shapes come out flat and few;
  4. trace with vtracer and keep each path with its role (friends: the game paints them) or its
     palette color (treats and rocks: drawn as they are).

Needs: pip install vtracer pillow numpy
"""

import argparse
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SHEETS = ROOT / 'art' / 'sheets'

# One recipe per sheet. `palette` lists, per piece and in sheet order, the colors to snap to:
# sampled from the sheet once it exists, until then the colors its prompt asks for. `roles`:
# write the palette names (the game paints them) instead of the colors themselves.
GREEN, GREEN_DARK = '#22c55e', '#15803d'
RECIPES = {
    'friends': {
        'sheet': '01-friend-bodies.png',
        'out': 'src/ui/friendBodies.ts',
        'layout': 'stand',
        'roles': True,
        'budget': 6000,
        'palette': {
            'king': {'fill': '#fcb70b', 'dark': '#903600', 'ruby': '#e8141b', 'sapphire': '#1e74e0'},
            'queen': {'fill': '#fb88b2', 'dark': '#a60b44'},
            'rook': {'fill': '#6db5fb', 'dark': '#013fbd'},
            'bishop': {'fill': '#b58df9', 'dark': '#4f1cb2'},
            'knight': {'fill': '#fca335', 'dark': '#963701', 'shade': '#dc7820'},
            'pawn': {'fill': '#83f5ae', 'dark': '#036c25'},
        },
        'open': 'export const FRIEND_BODIES: Record<Kind, readonly (readonly [BodyRole, string])[]> = {',
        'head': [
            '// Each friend is a stack of paths, bottom first, in the 0..100 box FriendArt draws in.',
            "// A role is painted by the game: fill and dark are the friend's two colors, shade sits",
            "// between them, ruby and sapphire are the king's jewels.",
            '',
            "import type { Kind } from '../core/types.ts';",
            '',
            "export type BodyRole = 'fill' | 'dark' | 'shade' | 'ruby' | 'sapphire';",
            '',
        ],
    },
    'treats': {
        'sheet': '03-treats.png',
        'out': 'src/ui/treatArt.ts',
        'layout': 'center',
        'roles': False,
        'budget': 4000,
        'palette': {
            'berry': {'red': '#ef4444', 'dark': '#991b1b', 'seed': '#fde68a', 'leaf': GREEN, 'leafDark': GREEN_DARK},
            'star': {'gold': '#facc15', 'dark': '#ca8a04'},
            'carrot': {'orange': '#f97316', 'dark': '#c2410c', 'leaf': GREEN, 'leafDark': GREEN_DARK},
            'cupcake': {'cup': '#60a5fa', 'cupDark': '#1d4ed8', 'frosting': '#fbcfe8', 'frostingDark': '#db2777', 'cherry': '#ef4444'},
            'apple': {'red': '#f87171', 'dark': '#b91c1c', 'stem': '#78350f', 'leaf': GREEN},
            'candy': {'lilac': '#c4b5fd', 'dark': '#6d28d9', 'stripe': '#a78bfa'},
            'cookie': {'dough': '#d6a064', 'dark': '#92400e', 'chip': '#5b3a1a'},
        },
        'open': 'export const TREAT_PATHS: Record<TreatKind, readonly (readonly [string, string])[]> = {',
        'head': [
            '// Each treat is a stack of [color, path] pairs, bottom first, in the 0..100 box TreatArt',
            '// draws in.',
            '',
            "import type { TreatKind } from '../content/worlds.ts';",
            '',
        ],
    },
    'rocks': {
        'sheet': '04-rocks.png',
        'out': 'src/ui/rockArt.ts',
        'layout': 'center',
        'roles': False,
        'budget': 3000,
        'palette': {
            'moss': {'gray': '#a8a29e', 'dark': '#57534e', 'moss': '#84cc16'},
            'crack': {'gray': '#a8a29e', 'dark': '#57534e'},
            'plain': {'gray': '#a8a29e', 'dark': '#57534e'},
        },
        'open': 'export const ROCK_PATHS: Record<string, readonly (readonly [string, string])[]> = {',
        'head': [
            '// Three rocks, so a board with several does not look stamped. Each is a stack of',
            '// [color, path] pairs, bottom first, in the 0..100 box RockArt draws in.',
            '',
        ],
    },
}
MIRROR: set = set()  # the friends sheet's knight already faces left, like the game's

# Keys the tracer sees: one far-apart color per palette entry, in palette order.
KEYS = [(255, 0, 0), (0, 0, 255), (0, 255, 0), (255, 0, 255), (0, 255, 255), (255, 255, 0), (128, 0, 0), (0, 0, 128)]
BACK = (255, 255, 255)

# The shared canvas. stand: the tallest piece fills TALL of it and everyone stands at BASE.
# center: the biggest piece fills FIT of it, each one centered.
TALL = 0.88
BASE = 0.90
FIT = 0.84
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


def cut(sheet, count):
    a = np.array(sheet.convert('RGBA'))
    solid = a[:, :, 3] > 128
    pieces = []
    for y0, y1 in runs(solid.any(axis=1), 40):
        for x0, x1 in runs(solid[y0:y1].any(axis=0), 40):
            sub = solid[y0:y1, x0:x1]
            ys = np.nonzero(sub.any(axis=1))[0]
            pieces.append(a[y0 + ys[0]:y0 + ys[-1] + 1, x0:x1])
    if len(pieces) != count:
        sys.exit(f'expected {count} pieces on the sheet, found {len(pieces)}')
    return pieces


def snap(piece, palette):
    """Every solid pixel becomes its nearest palette color's key; the rest is background."""
    rgb = piece[:, :, :3].astype(int)
    names = list(palette)
    refs = np.array([[int(palette[n][i:i + 2], 16) for i in (1, 3, 5)] for n in names])
    d = ((rgb[:, :, None, :] - refs[None, None, :, :]) ** 2).sum(axis=3)
    pick = d.argmin(axis=2)
    out = np.zeros(piece.shape[:2] + (3,), dtype=np.uint8)
    out[:] = BACK
    solid = piece[:, :, 3] > 128
    for k in range(len(names)):
        out[solid & (pick == k)] = KEYS[k]
    return out


def place(piece, side, mirror, layout):
    """The raw piece on the shared canvas, shrunk smoothly to TRACE_SIDE (then snapped)."""
    h, w = piece.shape[:2]
    canvas = np.zeros((side, side, 4), dtype=np.uint8)
    top = round(BASE * side) - h if layout == 'stand' else (side - h) // 2
    left = (side - w) // 2
    canvas[top:top + h, left:left + w] = piece[:, ::-1] if mirror else piece
    return np.array(Image.fromarray(canvas).resize((TRACE_SIDE, TRACE_SIDE), Image.LANCZOS))


def trace(canvas, names):
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
    keys = KEYS[:len(names)] + [BACK]
    paths = []
    for m in re.finditer(r'<path d="([^"]+)" fill="#([0-9A-Fa-f]{6})" transform="translate\(([-\d.]+),([-\d.]+)\)"', svg):
        d, hexc, tx, ty = m.group(1), m.group(2), float(m.group(3)), float(m.group(4))
        rgb = tuple(int(hexc[i:i + 2], 16) for i in (0, 2, 4))
        k = min(range(len(keys)), key=lambda i: sum((x - y) ** 2 for x, y in zip(rgb, keys[i])))
        if k == len(names):
            continue
        paths.append((names[k], d, tx, ty))
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


def bake(name, preview=None):
    """The TS text for one recipe and the path size per piece; (None, {}) when the sheet is missing."""
    rec = RECIPES[name]
    sheet = SHEETS / rec['sheet']
    if not sheet.exists():
        return None, {}
    order = list(rec['palette'])
    pieces = cut(Image.open(sheet), len(order))
    if rec['layout'] == 'stand':
        side = round(max(p.shape[0] for p in pieces) / TALL)
    else:
        side = round(max(max(p.shape[:2]) for p in pieces) / FIT)
    scale = 100 / TRACE_SIDE
    lines = [f'// GENERATED by scripts/bake-art.py {name} from art/sheets/{rec["sheet"]}. Do not edit.',
             *rec['head'], rec['open']]
    sizes = {}
    for key, piece in zip(order, pieces):
        palette = rec['palette'][key]
        names = list(palette)
        canvas = snap(place(piece, side, name == 'friends' and key in MIRROR, rec['layout']), palette)
        if preview:
            Image.fromarray(canvas).save(Path(preview) / f'{name}-{key}-snapped.png')
        body = [(n, to_units(d, tx, ty, scale)) for n, d, tx, ty in trace(canvas, names)]
        sizes[key] = sum(len(d) for _, d in body)
        lines.append(f'  {key}: [')
        for n, d in body:
            lines.append(f"    ['{n if rec['roles'] else palette[n]}', '{d}'],")
        lines.append('  ],')
    lines.append('};')
    return '\n'.join(lines) + '\n', sizes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('which', nargs='?', default='all', choices=[*RECIPES, 'all'])
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--preview')
    args = ap.parse_args()
    failed = False
    for name in (RECIPES if args.which == 'all' else [args.which]):
        rec = RECIPES[name]
        out = ROOT / rec['out']
        text, sizes = bake(name, args.preview)
        if text is None:
            print(f'{name}: no art/sheets/{rec["sheet"]} yet, skipped (its prompt is in docs/ART_PROMPTS.md)')
            continue
        for k, v in sizes.items():
            print(f'{name:7} {k:8} {v:5} chars of path')
        over = {k: v for k, v in sizes.items() if v > rec['budget']}
        if over:
            print(f'{name}: over the {rec["budget"]}-character budget: {over}')
            failed = True
            continue
        if args.check:
            if not out.exists() or out.read_text(encoding='utf-8') != text:
                print(f'{rec["out"]} is stale: run python scripts/bake-art.py {name}')
                failed = True
            else:
                print(f'{rec["out"]} is current')
            continue
        out.write_text(text, encoding='utf-8', newline='\n')
        print(f'wrote {rec["out"]} ({len(text)} bytes)')
    if failed:
        sys.exit(1)


if __name__ == '__main__':
    main()
