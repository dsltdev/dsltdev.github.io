// Escena 2D en canvas: moneda clickeable, ciudad que crece con tus negocios,
// monedas que caen según tu producción y textos flotantes.
import { GENERATORS, GOLDEN } from './config';
import { cps, ownedOf, type State } from './logic';

interface Floater { x: number; y: number; text: string; age: number; life: number; big?: boolean }
interface Golden { x: number; y: number; vx: number; vy: number; age: number; life: number }
interface Particle { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number; spin: number }

const AMBER = '#e0a23e';
const AMBER_LIGHT = '#f3c778';
const AMBER_DIM = '#a97324';
const INK = '#1a1206';
const MAX_BLOCKS = 14;

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private floaters: Floater[] = [];
  private particles: Particle[] = [];
  private rain: Particle[] = [];
  private pulse = 0; // 0..1, rebote de la moneda al hacer click
  private t = 0;
  private spawnAcc = 0;
  private reduced: boolean;
  private golden: Golden | null = null;
  /** Instante (this.t) de la última compra por negocio, para animar el bloque nuevo. */
  private pops = new Map<string, number>();

  constructor(private canvas: HTMLCanvasElement, private getState: () => State) {
    this.ctx = canvas.getContext('2d')!;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  }

  private coin() {
    const r = Math.min(this.w * 0.26, this.h * 0.3, 105);
    return { x: this.w / 2, y: this.h * 0.38, r };
  }

  /** Centro de la moneda en px del canvas (para clicks por teclado). */
  coinCenter() {
    const { x, y } = this.coin();
    return { x, y };
  }

  // ----- Pago VIP -----

  hasGolden() {
    return this.golden !== null;
  }

  spawnGolden() {
    const a = Math.random() * Math.PI * 2;
    const sp = 18 + Math.random() * 16;
    this.golden = {
      x: this.w * (0.15 + Math.random() * 0.7),
      y: this.h * (0.15 + Math.random() * 0.4),
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      age: 0,
      life: GOLDEN.life
    };
  }

  /** Si el toque cae sobre el Pago VIP lo recoge. Con margen generoso para el dedo. */
  tryCollectGolden(px: number, py: number): boolean {
    const g = this.golden;
    if (!g || Math.hypot(px - g.x, py - g.y) > 42) return false;
    this.burst(g.x, g.y, 16);
    this.golden = null;
    return true;
  }

  /** Aviso de compra: el bloque nuevo del negocio "aparece" con un pequeño salto. */
  onBuy(id: string) {
    this.pops.set(id, this.t);
  }

  private burst(x: number, y: number, n: number) {
    if (this.reduced) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 160;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, age: 0, life: 0.5 + Math.random() * 0.5, size: 2 + Math.random() * 3, spin: 0 });
    }
    if (this.particles.length > 200) this.particles.splice(0, this.particles.length - 200);
  }

  /** Texto flotante grande en el centro de la moneda (bonus, logros). */
  announce(text: string) {
    const c = this.coin();
    this.floaters.push({ x: c.x, y: c.y - c.r * 0.9, text, age: 0, life: 1.6, big: true });
  }

  onClick(px: number, py: number, label: string) {
    this.pulse = 1;
    this.floaters.push({ x: px, y: py, text: label, age: 0, life: 0.9 });
    if (this.floaters.length > 40) this.floaters.shift();
    this.burst(px, py, 7);
  }

  update(dt: number) {
    this.t += dt;
    this.pulse = Math.max(0, this.pulse - dt * 5);
    for (const f of this.floaters) f.age += dt;
    this.floaters = this.floaters.filter((f) => f.age < f.life);
    for (const p of this.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 380 * dt;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);

    const g = this.golden;
    if (g) {
      g.age += dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      if (g.x < 30 || g.x > this.w - 30) g.vx *= -1;
      if (g.y < 30 || g.y > this.h * 0.62) g.vy *= -1;
      if (g.age >= g.life) this.golden = null;
    }

    // Lluvia de monedas: crece con el log10 de la producción por segundo.
    if (!this.reduced) {
      const rate = Math.min(14, Math.log10(1 + cps(this.getState())) * 2.2);
      this.spawnAcc += rate * dt;
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1;
        if (this.rain.length < 70) {
          this.rain.push({ x: Math.random() * this.w, y: -10, vx: (Math.random() - 0.5) * 12, vy: 50 + Math.random() * 60, age: 0, life: 6, size: 3 + Math.random() * 3, spin: Math.random() * 6 });
        }
      }
      for (const p of this.rain) {
        p.age += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.spin += dt * 3;
      }
      this.rain = this.rain.filter((p) => p.y < this.h * 0.82 && p.age < p.life);
    }
  }

  draw() {
    const { ctx, w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    this.drawBackdrop();
    this.drawRain();
    this.drawCity();
    this.drawCoin();
    this.drawGolden();
    this.drawParticles();
    this.drawFloaters();
  }

  private drawBackdrop() {
    const { ctx, w, h } = this;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1c150d');
    g.addColorStop(1, '#14100b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(224,162,62,0.06)';
    ctx.lineWidth = 1;
    const step = 32;
    const off = (this.t * 6) % step;
    ctx.beginPath();
    for (let x = -off; x < w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0; y < h; y += step) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
  }

  private drawRain() {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(243,199,120,0.55)';
    for (const p of this.rain) {
      const sx = Math.abs(Math.cos(p.spin));
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.size * sx + 0.6, p.size, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Una columna por negocio; cada unidad comprada suma un bloque (hasta MAX_BLOCKS). */
  private drawCity() {
    const { ctx, w, h } = this;
    const s = this.getState();
    const ground = h - 14;
    const colW = w / GENERATORS.length;
    const bw = Math.min(colW - 8, 46);
    const bh = Math.min(16, (h * 0.25) / MAX_BLOCKS);

    ctx.fillStyle = '#0f0c08';
    ctx.fillRect(0, ground, w, 14);
    ctx.fillStyle = AMBER_DIM;
    ctx.fillRect(0, ground, w, 1);

    GENERATORS.forEach((g, i) => {
      const n = ownedOf(s, g.id);
      const blocks = Math.min(MAX_BLOCKS, n);
      const x = i * colW + (colW - bw) / 2;
      const popT = this.pops.get(g.id);
      const k = popT === undefined ? 1 : Math.min(1, (this.t - popT) / 0.35);
      for (let b = 0; b < blocks; b++) {
        const newest = b === blocks - 1 && k < 1;
        const y = ground - (b + 1) * bh - (newest ? (1 - k) * bh * 1.6 : 0);
        ctx.fillStyle = newest ? '#fff3d6' : g.color;
        ctx.globalAlpha = newest ? 0.5 + 0.5 * k : 0.28 + 0.5 * ((b + 1) / MAX_BLOCKS);
        ctx.fillRect(x, y + 1, bw, bh - 2);
        ctx.globalAlpha = 1;
        // Ventana que parpadea: se ve vivo sin ser ruidoso.
        const on = this.reduced || Math.sin(this.t * 1.7 + i * 2.1 + b * 3.3) > -0.5;
        if (on) {
          ctx.fillStyle = INK;
          ctx.fillRect(x + bw * 0.2, y + bh * 0.3, bw * 0.18, bh * 0.4);
          ctx.fillRect(x + bw * 0.62, y + bh * 0.3, bw * 0.18, bh * 0.4);
        }
      }
      if (n > MAX_BLOCKS) {
        ctx.fillStyle = AMBER_LIGHT;
        ctx.font = '600 11px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`x${n}`, x + bw / 2, ground - blocks * bh - 6);
      }
    });
  }

  private drawCoin() {
    const { ctx } = this;
    const c = this.coin();
    const bob = this.reduced ? 0 : Math.sin(this.t * 2) * 3;
    const scale = 1 - this.pulse * 0.1;
    const r = c.r * scale;
    const y = c.y + bob;

    const frenzy = this.getState().frenzyLeft > 0;
    if (frenzy) {
      const wob = this.reduced ? 0 : Math.sin(this.t * 9) * 4;
      ctx.strokeStyle = 'rgba(255,236,190,0.75)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c.x, y, r + 12 + wob, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.shadowColor = frenzy ? 'rgba(255,236,190,0.9)' : 'rgba(224,162,62,0.45)';
    ctx.shadowBlur = (frenzy ? 46 : 28) + this.pulse * 20;
    const g = ctx.createRadialGradient(c.x - r * 0.3, y - r * 0.3, r * 0.1, c.x, y, r);
    g.addColorStop(0, '#fbe6b8');
    g.addColorStop(0.55, AMBER);
    g.addColorStop(1, AMBER_DIM);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(26,18,6,0.55)';
    ctx.lineWidth = Math.max(2, r * 0.06);
    ctx.beginPath();
    ctx.arc(c.x, y, r * 0.8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = INK;
    ctx.font = `700 ${Math.round(r * 0.95)}px "IBM Plex Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', c.x, y + r * 0.04);
    ctx.textBaseline = 'alphabetic';
  }

  private drawGolden() {
    const g = this.golden;
    if (!g) return;
    const { ctx } = this;
    const left = g.life - g.age;
    // Aparece suave y parpadea en los últimos segundos para avisar que se va.
    const fadeIn = Math.min(1, g.age / 0.3);
    const blink = left < 2.5 && !this.reduced ? 0.55 + 0.45 * Math.sin(this.t * 16) : 1;
    const pulse = this.reduced ? 1 : 1 + Math.sin(this.t * 6) * 0.07;
    const r = 26 * pulse;
    ctx.save();
    ctx.globalAlpha = fadeIn * blink;
    ctx.shadowColor = 'rgba(255,236,190,0.95)';
    ctx.shadowBlur = 26;
    const grad = ctx.createRadialGradient(g.x - r * 0.3, g.y - r * 0.3, r * 0.1, g.x, g.y, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#ffe29a');
    grad.addColorStop(1, '#e0a23e');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(g.x, g.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = INK;
    ctx.font = '700 15px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VIP', g.x, g.y + 1);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  private drawParticles() {
    const { ctx } = this;
    ctx.fillStyle = AMBER_LIGHT;
    for (const p of this.particles) {
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawFloaters() {
    const { ctx } = this;
    ctx.textAlign = 'center';
    for (const f of this.floaters) {
      ctx.font = f.big ? '700 22px "IBM Plex Mono", monospace' : '700 18px "IBM Plex Mono", monospace';
      const k = f.age / f.life;
      ctx.globalAlpha = 1 - k * k;
      ctx.fillStyle = INK;
      ctx.fillText(f.text, f.x + 1, f.y - k * 60 + 1);
      ctx.fillStyle = AMBER_LIGHT;
      ctx.fillText(f.text, f.x, f.y - k * 60);
    }
    ctx.globalAlpha = 1;
  }
}
