import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { realmDB } from './lib/realm.ts';
import { startRealtimeSync } from './lib/firebaseSync.ts';

// Initialize bi-directional Cloud Firestore sync
startRealtimeSync(realmDB);

// Register service worker immediately to enable robust Direct Desktop & Mobile offline installation
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then((reg) => {
      console.log('ServiceWorker registered successfully');
      // Force update check on any immediate load
      reg.update();
    })
    .catch((err) => {
      console.log('ServiceWorker registration failed: ', err);
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
