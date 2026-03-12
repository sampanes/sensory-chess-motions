# Sensory Chess Motions

A visually engaging, interactive chess adventure designed to teach the fundamental movements of chess pieces through a series of "nature trail" puzzles. 

**[Live Demo](https://sampanes.github.io/sensory-chess-motions/)**

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
