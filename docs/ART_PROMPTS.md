# Art prompts

Prompts for an image generator (ChatGPT or Gemini), one per sheet. Each sheet comes back as one
picture with several pieces on it; a script cuts the pieces apart, traces each into a small SVG,
and snaps its colors to the game's own palette. Today every picture in the game is hand-drawn SVG
in `src/ui/art.tsx`; these sheets are meant to replace it piece by piece, never all at once.

## What stays code, and why

- **Faces.** Eyes, mouth, cheeks and the sleepy "z" stay drawn by code on top of the art, so the
  friends keep blinking, keep their four moods (happy, sleepy, wow, grumpy) and keep one face
  across every sheet. So the friend sheets ask for bodies with NO face, and a plain smooth patch
  where the face will go.
- **Recoloring.** The gray side (guards, the grumpy king, the racing pawn) and the ivory "dressed
  up" friends are the same art with its colors swapped by code. That only works if each friend is
  drawn in exactly its own two colors, so every prompt names them.
- **The board, hop spots, rings and footprints.** These carry the contrast and the color-blind
  rules (dots vs rings, shapes as well as colors). They stay code.

## Sizes

The build is one HTML file (342 KB on 2026-11-12) and the art is inlined, so every byte is in the
first load. Budget: about 4 KB per traced friend or treat, 10 KB per scene, 150 KB for all of it.
Flat color with a dark outline traces to tiny SVG; shading, gradients and texture do not. A sheet
that comes back shaded gets re-rolled, not traced.

## How to run them

1. Run prompt 0 first. Keep the best result: it is the style anchor.
2. For every later prompt, attach the anchor image and keep its first line ("Same style as the
   attached picture"). The style block is repeated in full in each prompt on purpose: generators
   forget it otherwise.
3. Ask for a transparent background if the tool offers it; otherwise plain white is fine (the cut
   script flood-fills from the edges, and the dark outline protects white inside a piece).
4. Save the sheets to `art/sheets/` as `00-anchor.png`, `01-friend-bodies.png`, and so on, and add
   a line under "Results" below saying which tool made it and which roll was kept.

## The style block (inside every prompt)

```
Style: flat vector sticker art for a toddler's game. Thick, even, dark outline around every shape
(the outline is a darker shade of that shape's own color, never black). Flat solid fills only: no
gradients, no shading, no texture, no glow, no drop shadow, no highlights except where named. Round,
chunky, soft corners, nothing thin or spiky. Very few colors. No text, no letters, no numbers, no
logos anywhere. Each item sits alone in its own cell of an even grid with wide empty space around
it; nothing touches anything else. Transparent background (or plain white). Square image.
```

---

## 0. The cast (style anchor)

The six friends together, with faces, so the style is fixed before anything else. Not used in the
game directly; it may become the grown-up card's header and the "meet a friend" picture.

```
Six cute chess-piece characters standing in a row, for a wordless chess game for 2 to 4 year olds.
Each one is the real shape of its chess piece (a child should later recognize it on a real chess
board), made soft and round, with a short chubby body on a wide round base and a simple happy face:
two black dot eyes with a tiny white shine, a small curved smile, pink cheeks.
1. King: golden yellow (#fcd34d, outline #b45309). A crown with a small cross on top; three round
   jewels on the crown band (red, blue, red).
2. Queen: pink (#f9a8d4, outline #be185d). A pointed crown with three round balls on its tips.
3. Rook: sky blue (#93c5fd, outline #1d4ed8). A castle tower top with three square notches.
4. Bishop: lilac (#c4b5fd, outline #6d28d9). A tall rounded hat like a raindrop, a small ball on
   top, and one diagonal slit across the hat.
5. Knight: orange (#fdba74, outline #c2410c). A horse head in profile facing left, with a mane;
   its face is on the horse head (one eye, a nostril, a smile).
6. Pawn: mint green (#86efac, outline #15803d). A round ball head on a small collar.
All six the same height except the pawn, which is a little shorter. Six cells in one row.
Style: flat vector sticker art for a toddler's game. Thick, even, dark outline around every shape
(the outline is a darker shade of that shape's own color, never black). Flat solid fills only: no
gradients, no shading, no texture, no glow, no drop shadow, no highlights except where named. Round,
chunky, soft corners, nothing thin or spiky. Very few colors. No text, no letters, no numbers, no
logos anywhere. Each item sits alone in its own cell of an even grid with wide empty space around
it; nothing touches anything else. Transparent background (or plain white). Wide image.
```

## 1. Friend bodies, no faces (the in-game friends)

```
Same style as the attached picture. The same six chess-piece characters (king, queen, rook,
bishop, knight, pawn), in the same order and the same colors, but with NO face at all: no eyes, no
mouth, no cheeks. Where the face was, leave a smooth, plain, empty area of the body color, wide
enough for a face to be drawn on later. On the knight, the plain area is the side of the horse
head. Each character uses only its two colors (fill and outline), plus the king's three jewels.
Every character faces the viewer straight on except the knight (profile, facing left). Same
height, same base width, standing on the same baseline. Grid: 3 columns, 2 rows.
Style: flat vector sticker art for a toddler's game. Thick, even, dark outline around every shape
(the outline is a darker shade of that shape's own color, never black). Flat solid fills only: no
gradients, no shading, no texture, no glow, no drop shadow, no highlights except where named. Round,
chunky, soft corners, nothing thin or spiky. Very few colors. No text, no letters, no numbers, no
logos anywhere. Each item sits alone in its own cell of an even grid with wide empty space around
it; nothing touches anything else. Transparent background (or plain white). Square image.
```

## 2. Friends dressed up as real chess pieces (milestone 5, "friends into pieces")

The roadmap's missing Staunton shapes: the end of "set up the board", where the friends turn into
a real chess set and keep their faces. Drawn in ivory; code turns a copy dark for the other side.

```
Same style as the first attached picture. The same six characters, now dressed up as real classic
(Staunton) tournament chess pieces: taller and slimmer, each with the real piece's details: a
stepped round base, a thin collar ring, and the real top (king: crown with a cross; queen: crown
with a ring of small balls; rook: notched castle top; bishop: tall mitre with a slit and a small
ball; knight: a carved horse head in profile facing left; pawn: a ball on a collar). Still cute
and chubby, not realistic. All six are ivory (#fffdf3) with a dark brown-gray outline (#3f3a36),
and NO face: leave a smooth plain area where a face will be drawn later (on the knight, the side
of the horse head). Same height order as a real set: king tallest, then queen, bishop, knight,
rook, pawn shortest. The second attached picture shows the taller real-piece shapes wanted;
keep the first picture's chunky outline and flat color. Grid: 3 columns, 2 rows.
Style: flat vector sticker art for a toddler's game. Thick, even, dark outline around every shape
(the outline is a darker shade of that shape's own color, never black). Flat solid fills only: no
gradients, no shading, no texture, no glow, no drop shadow, no highlights except where named. Round,
chunky, soft corners, nothing thin or spiky. Very few colors. No text, no letters, no numbers, no
logos anywhere. Each item sits alone in its own cell of an even grid with wide empty space around
it; nothing touches anything else. Transparent background (or plain white). Square image.
```

## 3. Treats

Seven treats. Each must be told apart by its outline alone (the color-blind rule), so the prompt
asks for clearly different silhouettes.

```
Same style as the attached picture. Seven treats for the chess characters to munch, each with a
clearly different outline so they can be told apart even in black and white:
1. Berry: a round red strawberry (#ef4444, outline #991b1b) with pale yellow seeds (#fde68a) and a
   green leafy cap (#22c55e, outline #15803d).
2. Star: a fat five-point star, golden yellow (#facc15, outline #ca8a04), rounded tips.
3. Carrot: an orange carrot (#f97316, outline #c2410c), point down, with green leaves on top
   (#22c55e).
4. Cupcake: a blue paper cup (#60a5fa, outline #1d4ed8) with pink swirled frosting (#fbcfe8,
   outline #db2777) and a red cherry on top (#ef4444).
5. Apple: a round red apple (#f87171, outline #b91c1c) with a brown stem (#78350f) and one green
   leaf (#22c55e).
6. Candy: a wrapped candy with twisted ends, lilac (#c4b5fd, outline #6d28d9) with darker purple
   stripes (#a78bfa).
7. Cookie: a round golden-brown cookie (#d6a064, outline #92400e) with dark chocolate chips
   (#5b3a1a).
All the same size. No faces. Grid: 4 columns, 2 rows (the last cell empty).
Style: flat vector sticker art for a toddler's game. Thick, even, dark outline around every shape
(the outline is a darker shade of that shape's own color, never black). Flat solid fills only: no
gradients, no shading, no texture, no glow, no drop shadow, no highlights except where named. Round,
chunky, soft corners, nothing thin or spiky. Very few colors. No text, no letters, no numbers, no
logos anywhere. Each item sits alone in its own cell of an even grid with wide empty space around
it; nothing touches anything else. Transparent background (or plain white). Square image.
```

## 4. Rocks

Boulders block a square. Three variants so a board with several rocks does not look stamped.

```
Same style as the attached picture. Three different round gray boulders that block a path in a
garden game: each a lumpy, friendly stone that fills most of its cell, gray (#a8a29e, outline
#57534e), one with a small green moss patch (#84cc16), one with a single crack line, one plain.
No faces. Grid: 3 columns, 1 row.
Style: flat vector sticker art for a toddler's game. Thick, even, dark outline around every shape
(the outline is a darker shade of that shape's own color, never black). Flat solid fills only: no
gradients, no shading, no texture, no glow, no drop shadow, no highlights except where named. Round,
chunky, soft corners, nothing thin or spiky. Very few colors. No text, no letters, no numbers, no
logos anywhere. Each item sits alone in its own cell of an even grid with wide empty space around
it; nothing touches anything else. Transparent background (or plain white). Wide image.
```

## 5. Home-screen bubbles (scenery only)

The home screen is a row of round bubbles. Today each is a flat sky color with friends drawn on
top. These are the backdrops only: code keeps drawing the friends in front, so the scenes have NO
characters. Seven worlds plus four modes.

```
Same style as the attached picture. Eleven small round landscape scenes, each inside a circle, for
the buttons of a toddler's game. Very simple: a sky, one or two hills or shapes, at most one small
detail. The lower middle of every circle is left empty and calm (characters will stand there
later). No characters, no animals, no people, no faces.
1. Sunny meadow, pale yellow sky (#fef3c7), a small sun.
2. Blue hills with a tiny far-away castle, pale blue sky (#dbeafe).
3. Lilac hills with a tiny pointed tower, pale lilac sky (#ede9fe).
4. A flower garden, pale pink sky (#fce7f3), a few round flowers.
5. Orange autumn hills with one round tree, pale peach sky (#ffedd5).
6. A green field with a short dirt path going away, pale green sky (#dcfce7).
7. A rainbow over soft hills, pale sky blue (#e0f2fe).
8. Night: dark blue sky, a crescent moon, three stars, dark hills.
9. Tall grass at the edge of a garden, pale lime sky (#ecfccb) (a place to tiptoe).
10. A straight path with a finish line of small flags at the top, pale sky blue (#e0f2fe).
11. A big round sun with no face, rising over a hill, warm morning sky.
Grid: 4 columns, 3 rows (the last cell empty).
Style: flat vector sticker art for a toddler's game. Thick, even, dark outline around every shape
(the outline is a darker shade of that shape's own color, never black). Flat solid fills only: no
gradients, no shading, no texture, no glow, no drop shadow, no highlights except where named. Round,
chunky, soft corners, nothing thin or spiky. Very few colors. No text, no letters, no numbers, no
logos anywhere. Each item sits alone in its own cell of an even grid with wide empty space around
it; nothing touches anything else. Transparent background (or plain white). Square image.
```

## 6. The teaching hand and the buttons

The game has no words, so the buttons and the hand that teaches the first puzzle are the only
instructions a kid gets. Low priority: the code-drawn ones work; this sheet only matters if the
new friends make the old buttons look out of place.

```
Same style as the attached picture. Eight simple icons for a wordless toddler game, each one bold
and readable at thumb size:
1. A small chubby cartoon hand pointing with one finger, skin tone peach (#fcd9b8, outline
   #b07a52), seen from the back, finger pointing up and to the left.
2. Home: a little house, white (#ffffff) with a dark slate outline (#334155).
3. Go: a big right-pointing arrow, green (#22c55e, outline #15803d).
4. Start over: a circular arrow going around, white with a dark slate outline.
5. A gear, white with a dark slate outline.
6. A filled star, golden yellow (#facc15, outline #ca8a04).
7. An empty star, only the outline (#ca8a04).
8. A round sun with short rays, golden yellow, no face.
Grid: 4 columns, 2 rows.
Style: flat vector sticker art for a toddler's game. Thick, even, dark outline around every shape
(the outline is a darker shade of that shape's own color, never black). Flat solid fills only: no
gradients, no shading, no texture, no glow, no drop shadow, no highlights except where named. Round,
chunky, soft corners, nothing thin or spiky. Very few colors. No text, no letters, no numbers, no
logos anywhere. Each item sits alone in its own cell of an even grid with wide empty space around
it; nothing touches anything else. Transparent background (or plain white). Square image.
```

## 7. App icon

What sits on the tablet's home screen. One picture, filling the square, with the subject inside the
middle 80% so Android's round mask does not cut it.

```
Same style as the attached picture. An app icon: the golden king character (with his happy face)
hopping happily over a pale green checkered meadow (#eaf7d8 and #bfe6a4), a red strawberry beside
him. Square, filled edge to edge with the meadow; the king and the berry stay inside the middle 80%
of the square. No text. Flat colors, thick outlines, no gradients.
```

---

## After a sheet comes back

Built for the friends: `python scripts/bake-friends.py` (`--check` fails when the output is stale
or a friend is over 6000 characters of path; `--preview DIR` saves the snapped pictures). It cuts
the sheet on its empty bands, puts every friend on one shared canvas (one scale, one baseline),
snaps each pixel to the friend's own colors, traces with `vtracer`, and writes
`src/ui/friendBodies.ts`: paths tagged with a role (fill, dark, shade, ruby, sapphire), not a
color, so the game paints them in any colors. Faces are drawn on top by `FriendArt` at `FACE_AT`.
Needs `pip install vtracer pillow numpy`. vtracer 0.6.15 on Python 3.14 crashes when given any
setting, so the script runs it on its defaults (fine on a snapped picture). Treats, rocks and the
rest will get the same treatment, one sheet at a time, each with a shots page of before and
after.

## Results

(Which tool made each sheet, which roll was kept, and anything that had to be re-rolled.)

- **0, the anchor (2026-11-13):** ChatGPT, `art/sheets/00-anchor.png` (transparent PNG). Kept over
  Gemini's because it reads at board-square size: chunky shapes, big faces on the head. Faces sit
  on the head, so prompt 1's plain face patch lands there too.
- **Gemini's roll of prompt 0** is kept as `art/sheets/00-staunton-shapes.jpg`: taller, more real
  Staunton shapes, faces on the belly, light shading. Too fine for the board (the faces vanish when
  small), but the right shapes for prompt 2, where it is the second attached picture.
- **1, friend bodies (2026-11-13):** ChatGPT, first roll, `art/sheets/01-friend-bodies.png`. No
  faces, two colors each plus the knight's mane shade and the king's jewels. The knight faces
  left, as in the anchor (an earlier note here said right: wrong). In the game since this date.
