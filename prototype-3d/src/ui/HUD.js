export class HUD {
  constructor(root) {
    this.root = root;
    this.health1 = root.querySelector('#health1');
    this.health2 = root.querySelector('#health2');
    this.energy1 = root.querySelector('#energy1');
    this.energy2 = root.querySelector('#energy2');
    this.timer = root.querySelector('#timer');
    this.message = root.querySelector('#message');
    this.combo = root.querySelector('#combo');
    this.debug = document.querySelector('#debug-readout');
  }

  update({ timer, p1, p2, combo, message, debug, energy1, energy2 }) {
    if (this.health1) this.health1.style.width = `${Math.max(0, Math.min(100, p1))}%`;
    if (this.health2) this.health2.style.width = `${Math.max(0, Math.min(100, p2))}%`;
    if (this.energy1 && typeof energy1 !== 'undefined') this.energy1.style.width = `${Math.max(0, Math.min(100, energy1))}%`;
    if (this.energy2 && typeof energy2 !== 'undefined') this.energy2.style.width = `${Math.max(0, Math.min(100, energy2))}%`;
    if (this.timer) this.timer.textContent = timer;
    if (this.message) this.message.textContent = message || 'LUTA 3D PROVISÓRIA';
    if (this.combo) this.combo.textContent = combo || '0x';
    if (this.debug) {
      if (debug) {
        const lines = [
          `P1: ${debug.p1 ?? '--'}`,
          `P2: ${debug.p2 ?? '--'}`,
          `Erro: ${debug.lastError ?? 'Nenhuma'}`,
        ];
        this.debug.innerHTML = lines.join('<br>');
      }
      this.debug.classList.toggle('visible', Boolean(debug));
    }
  }

  setMessage(message) {
    if (this.message) this.message.textContent = message;
  }

  setDebugState(enabled, data = {}) {
    if (!this.debug) return;
    const lines = [
      `Cena: ${data.scene ?? 'arena-3d'}`,
      `Estado: ${data.gameState ?? 'menu'}`,
      `FPS: ${data.fps ?? '--'}`,
      `Loop: ${data.loop ?? 'stopped'}`,
      `Renderer: ${data.renderer ?? 'unknown'}`,
      `P1: ${data.p1 ? `${data.p1.x.toFixed(2)}, ${data.p1.y.toFixed(2)}, ${data.p1.z.toFixed(2)} / HP ${data.p1.health.toFixed(0)}` : '---'}`,
      `P2: ${data.p2 ? `${data.p2.x.toFixed(2)}, ${data.p2.y.toFixed(2)}, ${data.p2.z.toFixed(2)} / HP ${data.p2.health.toFixed(0)}` : '---'}`,
      `Erro: ${data.lastError ?? 'Nenhuma'}`,
    ];
    this.debug.innerHTML = lines.join('<br>');
    this.debug.classList.toggle('visible', !!enabled);
  }
}
