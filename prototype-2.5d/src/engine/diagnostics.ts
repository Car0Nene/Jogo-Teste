// Modo diagnóstico: FPS, tempo de frame, picos, memória da GPU, shaders e objetos.
// Ativa com ?diag=1 na URL ou F3. Desligado, não roda nada (só o atalho de teclado).
import type { GameEngine } from './GameEngine';

type EngineView = {
  renderer: { info: { memory: { geometries: number; textures: number }; programs?: unknown[] | null; render: { calls: number; triangles: number } } };
  scene: { traverse: (fn: () => void) => void };
};

const HISTORY = 120;

export class Diagnostics {
  private el: HTMLDivElement | null = null;
  private raf = 0;
  private last = 0;
  private frames: number[] = [];
  private worst = 0;
  private worstAt = 0;
  private spikes = 0;
  private lastUi = 0;

  constructor(private readonly getEngine: () => GameEngine | null) {}

  static wanted(): boolean {
    try {
      return new URLSearchParams(window.location.search).get('diag') === '1';
    } catch {
      return false;
    }
  }

  get active(): boolean {
    return this.el !== null;
  }

  toggle() {
    if (this.el) this.stop();
    else this.start();
  }

  start() {
    if (this.el) return;
    const el = document.createElement('div');
    el.setAttribute('data-ff-diag', '');
    el.style.cssText =
      'position:fixed;left:8px;bottom:8px;z-index:9999;pointer-events:none;font:600 11px/1.35 ui-monospace,monospace;' +
      'color:#d1fae5;background:rgba(6,10,14,.82);padding:8px 10px;border-radius:8px;white-space:pre;min-width:210px';
    document.body.appendChild(el);
    this.el = el;
    this.last = performance.now();
    const tick = (t: number) => {
      const dt = t - this.last;
      this.last = t;
      this.frames.push(dt);
      if (this.frames.length > HISTORY) this.frames.shift();
      if (dt > 50) this.spikes++;
      if (dt > this.worst || t - this.worstAt > 2000) {
        this.worst = dt;
        this.worstAt = t;
      }
      if (t - this.lastUi > 250) {
        this.lastUi = t;
        this.render();
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.el?.remove();
    this.el = null;
  }

  /** Números atuais (também usados pelo benchmark). */
  snapshot() {
    const e = this.getEngine() as unknown as EngineView | null;
    const avg = this.frames.length ? this.frames.reduce((a, b) => a + b, 0) / this.frames.length : 0;
    let objects = 0;
    e?.scene.traverse(() => objects++);
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return {
      fps: avg ? 1000 / avg : 0,
      frameMs: avg,
      worstMs: this.worst,
      spikes: this.spikes,
      geometries: e?.renderer.info.memory.geometries ?? 0,
      textures: e?.renderer.info.memory.textures ?? 0,
      programs: e?.renderer.info.programs?.length ?? 0,
      drawCalls: e?.renderer.info.render.calls ?? 0,
      triangles: e?.renderer.info.render.triangles ?? 0,
      objects,
      heapMb: mem ? mem.usedJSHeapSize / 1048576 : null,
    };
  }

  private render() {
    if (!this.el) return;
    const s = this.snapshot();
    this.el.textContent =
      `DIAGNÓSTICO (F3)\n` +
      `FPS ${s.fps.toFixed(0)}   frame ${s.frameMs.toFixed(1)} ms\n` +
      `pior (2s) ${s.worstMs.toFixed(1)} ms   picos>50ms ${s.spikes}\n` +
      `draw calls ${s.drawCalls}   triângulos ${s.triangles}\n` +
      `geometrias ${s.geometries}   texturas ${s.textures}\n` +
      `shaders ${s.programs}   objetos na cena ${s.objects}\n` +
      (s.heapMb !== null ? `memória JS ${s.heapMb.toFixed(0)} MB` : '');
  }
}
