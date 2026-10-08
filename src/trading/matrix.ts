// Lluvia de código estilo Matrix en canvas. Ligera: columnas de 16 px, ~24 cuadros por segundo,
// se detiene sola cuando la pestaña no se ve y respeta "reducir movimiento".
const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789$%+=<>'.split('');
const SIZE = 16;
const FRAME_MS = 1000 / 24;
const BG = 'rgba(2, 10, 4, 0.14)';

export class Rain {
  private ctx: CanvasRenderingContext2D;
  private drops: number[] = [];
  private w = 0;
  private h = 0;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private on = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  private resize() {
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, Math.floor(r.width));
    this.h = Math.max(1, Math.floor(r.height));
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    const cols = Math.ceil(this.w / SIZE);
    // Columnas nuevas arrancan en posiciones al azar para que no caigan todas a la vez.
    while (this.drops.length < cols) this.drops.push(Math.floor(Math.random() * -40));
    this.drops.length = cols;
    this.ctx.fillStyle = '#020a04';
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  get enabled() {
    return this.on;
  }

  setEnabled(on: boolean) {
    if (on === this.on) return;
    this.on = on;
    this.canvas.style.visibility = on ? 'visible' : 'hidden';
    cancelAnimationFrame(this.raf);
    if (on) {
      this.last = performance.now();
      this.raf = requestAnimationFrame((t) => this.frame(t));
    }
  }

  private frame(now: number) {
    this.acc += now - this.last;
    this.last = now;
    if (this.acc >= FRAME_MS) {
      this.acc %= FRAME_MS;
      this.step();
    }
    if (this.on) this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  private step() {
    const { ctx } = this;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.font = `${SIZE - 1}px "IBM Plex Mono", monospace`;
    ctx.textBaseline = 'top';
    for (let i = 0; i < this.drops.length; i++) {
      const y = this.drops[i] * SIZE;
      if (y >= -SIZE) {
        const g = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        // La cabeza de la columna brilla; el resto deja estela verde gracias al desvanecido.
        ctx.fillStyle = '#d8ffe0';
        ctx.fillText(g, i * SIZE, y);
        ctx.fillStyle = '#00ff41';
        ctx.fillText(GLYPHS[Math.floor(Math.random() * GLYPHS.length)], i * SIZE, y - SIZE);
      }
      this.drops[i] = y > this.h && Math.random() > 0.975 ? Math.floor(Math.random() * -12) : this.drops[i] + 1;
    }
  }
}
