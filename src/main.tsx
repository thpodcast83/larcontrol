import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Registra o Service Worker do Firebase Messaging para PWA e Notificações Push
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then((reg) => {
        console.log('Service Worker do Firebase registrado com sucesso:', reg.scope);
      })
      .catch((erro) => {
        console.error('Falha ao registrar o Service Worker do Firebase:', erro);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
