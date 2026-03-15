# Sensory Chess Motions

A visually engaging, interactive chess adventure designed to teach the fundamental movements of chess pieces through a series of "nature trail" puzzles. 

**[Live Demo](https://sampanes.github.io/sensory-chess-motions/)** — Play the game, one level at a time

**[Cheat Mode](https://sampanes.github.io/sensory-chess-motions/?cheat)** — start with all levels unlocked

**[Level Creator](https://sampanes.github.io/sensory-chess-motions/?creator)** — build and export custom levels

**[Adventure Mode](https://sampanes.github.io/sensory-chess-motions/?adventure)** — The Friendship Kingdom chess story

---

## 👨 Dad Cheat — Testing & Debug Routes

All routes below unlock everything and skip the Trial mastery checks, so you can jump straight to any level for testing.

| URL | What it does |
|-----|-------------|
| `/?adventure&dadcheat` | Adventure mode with all worlds unlocked, all trials skipped. Starts at the title screen. |
| `/?adventure&dadcheat&world=0` | Jump straight into **World 0 — The King's Start** (level 1) |
| `/?adventure&dadcheat&world=1` | Jump straight into **World 1 — Pawn's Farm** (level 1) |
| `/?adventure&dadcheat&world=2` | Jump straight into **World 2 — Rook's Roads** (level 1) |
| `/?adventure&dadcheat&world=3` | Jump straight into **World 3 — Bishop's Grove** (level 1) |
| `/?adventure&dadcheat&world=4` | Jump straight into **World 4 — Knight's Mountains** (level 1) |
| `/?adventure&dadcheat&world=5` | Jump straight into **World 5 — Queen's Realm** (level 1) |
| `/?adventure&dadcheat&world=2&level=7` | Jump to **World 2, Level 7** (R7 — The Moat) |
| `/?adventure&dadcheat&world=2&level=8` | Jump to **World 2, Level 8** (R8 — Road's End scroll level) |

**Level numbers are 1-indexed** (level 1 = first level of that world).

While in dad cheat mode, **◀ Prev level** and **Next level ▶** buttons appear on the intro card so you can step through levels without returning to the world map.

## 🧩 The Game
Navigate your chess piece across a 5x5 grid to reach the red flag. Each level introduces different terrains and obstacles that test your understanding of how pieces move.

### Features
- **Progressive Learning**: Start with basic moves and advance to complex puzzles.
- **Interactive Feedback**: Valid moves are highlighted as you play.
- **Star System**: Earn up to 3 stars per level by finding the most efficient path.
- **Diverse Terrains**: Navigate across grass, over bridges, through rivers, and around fences.
- **Sensory Experience**: Smooth animations and a vibrant, child-friendly aesthetic.

### Piece Guide
- **🏰 Rook**: Slides in straight lines — up, down, left, and right.
- **⛪ Bishop**: Slides diagonally — corner to corner.
- **🐴 Knight**: Jumps in an "L-shape" (two squares one way, one square the other) — the only piece that can jump over obstacles!

## 🚀 GitHub Pages Deployment

This project is configured to deploy automatically to GitHub Pages using **GitHub Actions**.

### Setup Instructions
1. **Push to Main**: Any changes pushed to the `main` branch will trigger the `Deploy static content to Pages` workflow.
2. **Enable Actions for Pages**:
   - Go to your repository on GitHub.
   - Click **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, ensure **"GitHub Actions"** is selected.
3. **View Live**: Your site will be available at `https://<your-username>.github.io/sensory-chess-motions/`.

### Local Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 🛠️ Tech Stack
- **React 19** & **TypeScript**
- **Vite** (Build tool)
- **Framer Motion** (Animations)
- **Tailwind CSS** (Styling)
- **Lucide React** (Icons)
