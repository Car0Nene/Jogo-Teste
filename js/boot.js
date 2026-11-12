// Recupera abertura presa por arquivos antigos do cache offline.
(() => {
  'use strict';
  const KEY = 'ff-boot-repair';
  let failed = false;

  async function clearOffline() {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(reg => reg.unregister()));
      }
      if (window.caches) {
        const names = await caches.keys();
        await Promise.all(names.filter(name => name.startsWith('familia-fighter-')).map(name => caches.delete(name)));
      }
    } catch { /* a tela de erro ainda oferece recarga */ }
  }

  function showHelp(detail) {
    if (document.getElementById('bootError')) return;
    const box = document.createElement('div');
    box.id = 'bootError';
    box.setAttribute('role', 'alert');
    box.style.cssText = 'position:fixed;inset:0;z-index:99;display:grid;place-content:center;gap:14px;padding:24px;background:#100d20;color:#fff;font:16px system-ui,sans-serif;text-align:center';
    const title = document.createElement('strong');
    title.textContent = 'O jogo não conseguiu abrir.';
    title.style.cssText = 'font-size:22px;color:#ffd94a';
    const text = document.createElement('p');
    text.textContent = 'Toque no botão para atualizar os arquivos do jogo.';
    text.style.margin = '0';
    const small = document.createElement('small');
    small.textContent = detail ? String(detail).slice(0, 160) : '';
    small.style.opacity = '0.6';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'ATUALIZAR O JOGO';
    button.style.cssText = 'justify-self:center;padding:12px 22px;border-radius:12px;border:2px solid #fff1bd;background:#dc4d15;color:#fff;font-weight:900;font-size:16px;cursor:pointer';
    button.addEventListener('click', async () => {
      button.disabled = true;
      await clearOffline();
      location.reload();
    });
    box.append(title, text, button, small);
    document.body.append(box);
  }

  async function onFatal(detail) {
    if (failed) return;
    failed = true;
    console.error('Falha ao iniciar o jogo:', detail);
    if (!sessionStorage.getItem(KEY)) {
      sessionStorage.setItem(KEY, '1');
      await clearOffline();
      location.reload();
      return;
    }
    if (document.body) showHelp(detail);
    else addEventListener('DOMContentLoaded', () => showHelp(detail));
  }

  addEventListener('error', event => {
    const target = event.target;
    if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
      onFatal(`Arquivo não carregou: ${target.src || target.href}`);
    } else if (!window.FF_READY) onFatal(event.message || event.error);
  }, true);

  addEventListener('load', () => {
    setTimeout(() => {
      if (window.FF_READY) sessionStorage.removeItem(KEY);
      else onFatal('O jogo não terminou de iniciar.');
    }, 4000);
  });

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      location.reload();
    });
  }
})();
