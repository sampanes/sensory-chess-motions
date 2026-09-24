import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './ui/App.tsx';
import { Maker } from './ui/Maker.tsx';
import { SharedPuzzle } from './ui/SharedPuzzle.tsx';

// Earlier versions installed a caching service worker. Remove it so nobody is
// stuck on an old copy of the game.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => void r.unregister()))
    .catch(() => {});
}

const params = new URLSearchParams(window.location.search);
const shared = params.get('p');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {params.has('maker') ? <Maker /> : shared !== null ? <SharedPuzzle code={shared} /> : <App />}
  </StrictMode>,
);
