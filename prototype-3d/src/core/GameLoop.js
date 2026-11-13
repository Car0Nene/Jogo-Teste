export class GameLoop {
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.fixedStep = 1 / 60;
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = true;
    this.raf = null;
  }

  start() {
    this.running = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame((time) => this.tick(time));
  }

  tick(time) {
    if (!this.running) return;
    const delta = Math.min(0.05, (time - (this.lastTime || time)) / 1000 || 0);
    this.lastTime = time;
    this.accumulator += delta;
    while (this.accumulator >= this.fixedStep) {
      this.update(this.fixedStep);
      this.accumulator -= this.fixedStep;
    }
    this.render(delta);
    this.raf = requestAnimationFrame((next) => this.tick(next));
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
  }
}
