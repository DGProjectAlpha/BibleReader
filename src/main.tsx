import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { PopoutApp } from './PopoutApp';
import './index.css';
import { initBibleData } from './data/bibleLoader';
import { initStrongs } from './data/strongs';
import { initTsk } from './data/tskLoader';

async function bootstrap() {
  // Load all bible data before rendering. These are fetched as static assets
  // (not bundled by Vite) so build memory is not a problem.
  await Promise.all([initBibleData(), initStrongs(), initTsk()]);

  // Detect pop-out mode via URL param injected by the parent window
  const isPopout = new URLSearchParams(window.location.search).get('popout') === '1';

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      {isPopout ? <PopoutApp /> : <App />}
    </React.StrictMode>
  );
}

bootstrap();
