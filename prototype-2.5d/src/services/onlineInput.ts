/**
 * Comandos do convidado no online: teclado (mesmo mapa do 1P), controle e toque viram "segurando"
 * (direções/defesa) e "apertou" (golpes) enviados ao anfitrião, que os aplica no 2P.
 */
import type { PressAction } from '../engine/GameEngine';
import type { Player1KeyBindings } from '../data/settings';
import { platform } from '../platform/platform';

export interface GuestInputSink {
  holds: (set: string[]) => void;
  press: (action: PressAction) => void;
}

export class GuestInput {
  private keys = new Set<string>();
  private pad = new Set<string>();
  private touch = new Set<string>();
  private prevPad: Record<string, boolean> = {};
  private lastSent = '';
  private raf = 0;
  private disposed = false;

  constructor(
    private bindings: Player1KeyBindings,
    private gamepadEnabled: boolean,
    private sink: GuestInputSink
  ) {
    window.addEventListener('keydown', this.onDown);
    window.addEventListener('keyup', this.onUp);
    window.addEventListener('blur', this.onBlur);
    this.raf = requestAnimationFrame(this.poll);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onDown);
    window.removeEventListener('keyup', this.onUp);
    window.removeEventListener('blur', this.onBlur);
    this.keys.clear();
    this.pad.clear();
    this.touch.clear();
    this.sync(true);
  }

  setTouchHold(action: string, down: boolean) {
    if (down) this.touch.add(action);
    else this.touch.delete(action);
    this.sync();
  }

  touchPress(action: PressAction) {
    this.sync();
    this.sink.press(action);
  }

  private holdOf(code: string): string | null {
    const kb = this.bindings;
    if (code === kb.left || code === 'ArrowLeft') return 'left';
    if (code === kb.right || code === 'ArrowRight') return 'right';
    if (code === kb.up || code === 'ArrowUp' || code === 'Space') return 'up';
    if (code === kb.down || code === 'ArrowDown') return 'down';
    if (code === kb.guard || code === 'KeyH') return 'guard';
    return null;
  }

  private pressOf(code: string): PressAction | null {
    const kb = this.bindings;
    if (code === kb.up || code === 'ArrowUp' || code === 'Space') return 'jump';
    if (code === kb.light || code === 'KeyF' || code === 'Enter') return 'light';
    if (code === kb.heavy || code === 'KeyG') return 'heavy';
    if (code === kb.special || code === 'KeyT') return 'special';
    if (code === 'KeyY') return 'taunt';
    return null;
  }

  private onDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    const first = !this.keys.has(e.code);
    this.keys.add(e.code);
    this.sync();
    if (first) {
      const p = this.pressOf(e.code);
      if (p) this.sink.press(p);
    }
  };

  private onUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    this.sync();
  };

  private onBlur = () => {
    this.keys.clear();
    this.sync();
  };

  private poll = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.poll);
    this.pad.clear();
    const gp = this.gamepadEnabled && navigator.getGamepads ? navigator.getGamepads()?.[0] : null;
    if (gp && gp.connected) {
      const ax = gp.axes?.[0] ?? 0;
      const ay = gp.axes?.[1] ?? 0;
      const btn = (i: number) => Boolean(gp.buttons?.[i]?.pressed);
      if (Math.abs(ax) > 0.5 || Math.abs(ay) > 0.6 || gp.buttons?.some((b) => b.pressed)) platform.noteGamepad();
      if (ax < -0.35 || btn(14)) this.pad.add('left');
      if (ax > 0.35 || btn(15)) this.pad.add('right');
      if (ay > 0.42 || btn(13)) this.pad.add('down');
      if (ay < -0.45 || btn(12)) this.pad.add('up');
      if (btn(4) || btn(5) || btn(6) || btn(7)) this.pad.add('guard');
      const edge = (name: string, pressed: boolean, action: PressAction) => {
        const was = Boolean(this.prevPad[name]);
        this.prevPad[name] = pressed;
        if (pressed && !was) {
          this.sync();
          this.sink.press(action);
        }
      };
      edge('jump', btn(1) || btn(12) || ay < -0.58, 'jump');
      edge('light', btn(0), 'light');
      edge('heavy', btn(2), 'heavy');
      edge('special', btn(3), 'special');
      edge('taunt', btn(8), 'taunt');
    }
    this.sync();
  };

  /** manda o conjunto "segurando" só quando muda */
  private sync(force = false) {
    const set = new Set<string>();
    for (const code of this.keys) {
      const h = this.holdOf(code);
      if (h) set.add(h);
    }
    this.pad.forEach((a) => set.add(a));
    this.touch.forEach((a) => set.add(a));
    const list = [...set].sort();
    const key = list.join(',');
    if (!force && key === this.lastSent) return;
    this.lastSent = key;
    this.sink.holds(list);
  }
}
