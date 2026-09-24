import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './ui/App.tsx';
import { Maker } from './ui/Maker.tsx';
import { registerOffline } from './ui/offline.ts';
import { SharedPuzzle } from './ui/SharedPuzzle.tsx';

registerOffline();

const params = new URLSearchParams(window.location.search);
const shared = params.get('p');
const maker = params.has('maker');

if (!maker) {
  // iOS Safari ignores touch-action for pinch zoom; a toddler's pinch should
  // never shrink or blow up the board. The maker (grown-ups only) may zoom.
  document.addEventListener('gesturestart', (e) => e.preventDefault());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {maker ? <Maker /> : shared !== null ? <SharedPuzzle code={shared} /> : <App />}
  </StrictMode>,
);
