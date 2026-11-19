import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const workerPath = location.pathname.includes('/prototype-2.5d/') ? '../sw.js' : './sw.js';
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(workerPath).catch((error) => {
      console.warn('Não foi possível ativar o modo offline.', error);
    });
  });
}
