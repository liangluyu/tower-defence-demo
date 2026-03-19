export class GameLoop {
  private lastTime = 0;
  private rafId = 0;

  constructor(private readonly update: (delta: number, elapsed: number) => void) {}

  start() {
    this.lastTime = performance.now();
    const tick = (now: number) => {
      const delta = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;
      this.update(delta, now / 1000);
      this.rafId = window.requestAnimationFrame(tick);
    };

    this.rafId = window.requestAnimationFrame(tick);
  }

  stop() {
    window.cancelAnimationFrame(this.rafId);
  }
}
