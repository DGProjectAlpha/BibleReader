import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { initBibleData } from './data/bibleLoader';
import { initStrongs } from './data/strongs';
import { initTsk } from './data/tskLoader';

async function bootstrap() {
  // Load all bible data before rendering. These are fetched as static assets
  // (not bundled by Vite) so build memory is not a problem.
  await Promise.all([initBibleData(), initStrongs(), initTsk()]);

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
