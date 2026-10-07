// Gráfico de velas en canvas, con las líneas de tus posiciones (entrada, stop, objetivo, liquidación).
import { liqPrice, type Position } from './account';
import type { AssetDef, AssetState } from './market';

const UP = '#7f9a6a';
const DOWN = '#c06a54';
const AMBER = '#e0a23e';
const TEXT = '#998c76';
const AXIS_W = 64;

export function fmtPrice(def: AssetDef, p: number): string {
  return p.toLocaleString('es-CO', { minimumFractionDigits: def.digits, maximumFractionDigits: def.digits });
}

export class Chart {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  private resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  }

  draw(def: AssetDef, st: AssetState, positions: Position[]) {
    const { ctx, w, h } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1c150d');
    bg.addColorStop(1, '#14100b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const plotW = w - AXIS_W;
    const slot = Math.max(5, Math.min(11, plotW / 60));
    const bodyW = Math.max(2, slot - 2);
    const fit = Math.max(8, Math.floor(plotW / slot));
    const candles = [...st.candles, { o: st.cur.o, h: st.cur.h, l: st.cur.l, c: st.cur.c }].slice(-fit);

    let lo = Infinity;
    let hi = -Infinity;
    for (const c of candles) {
      if (c.l < lo) lo = c.l;
      if (c.h > hi) hi = c.h;
    }
    const pad = Math.max((hi - lo) * 0.12, def.base * 0.0008);
    lo -= pad;
    hi += pad;

    // Niveles de las posiciones de este activo, solo si caen dentro (o cerca) del rango visible.
    const levels: { y: number; label: string; color: string; dash: number[] }[] = [];
    const span = hi - lo;
    const yOf = (p: number) => 6 + (1 - (p - lo) / (hi - lo)) * (h - 12);
    for (const p of positions) {
      if (p.asset !== def.id) continue;
      const add = (price: number | null, label: string, color: string, dash: number[]) => {
        if (price === null || price < lo - span * 0.15 || price > hi + span * 0.15) return;
        levels.push({ y: yOf(price), label, color, dash });
      };
      add(p.entry, `${p.side === 'long' ? '▲' : '▼'} ${fmtPrice(def, p.entry)}`, AMBER, [6, 4]);
      add(p.sl, 'SL', DOWN, [3, 3]);
      add(p.tp, 'TP', UP, [3, 3]);
      add(liqPrice(p), 'LIQ', DOWN, [1, 3]);
    }

    // Rejilla y eje de precios
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const price = lo + ((hi - lo) * i) / 4;
      const y = yOf(price);
      ctx.strokeStyle = 'rgba(224,162,62,0.07)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(plotW, y);
      ctx.stroke();
      ctx.fillStyle = TEXT;
      ctx.fillText(fmtPrice(def, price), plotW + 6, y);
    }

    // Velas (alineadas a la derecha: la más reciente pegada al eje)
    const x0 = plotW - candles.length * slot;
    candles.forEach((c, i) => {
      const x = x0 + i * slot + slot / 2;
      const up = c.c >= c.o;
      ctx.strokeStyle = ctx.fillStyle = up ? UP : DOWN;
      ctx.beginPath();
      ctx.moveTo(x, yOf(c.h));
      ctx.lineTo(x, yOf(c.l));
      ctx.stroke();
      const top = yOf(Math.max(c.o, c.c));
      const bottom = yOf(Math.min(c.o, c.c));
      ctx.fillRect(x - bodyW / 2, top, bodyW, Math.max(1, bottom - top));
    });

    // Líneas de las posiciones
    for (const l of levels) {
      ctx.strokeStyle = l.color;
      ctx.setLineDash(l.dash);
      ctx.beginPath();
      ctx.moveTo(0, l.y);
      ctx.lineTo(plotW, l.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = l.color;
      ctx.textAlign = 'left';
      ctx.fillText(l.label, 6, l.y - 7);
    }

    // Precio actual
    const yNow = yOf(st.price);
    ctx.strokeStyle = 'rgba(243,199,120,0.55)';
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(0, yNow);
    ctx.lineTo(plotW, yNow);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = AMBER;
    ctx.fillRect(plotW, yNow - 9, AXIS_W, 18);
    ctx.fillStyle = '#1a1206';
    ctx.font = '600 11px "IBM Plex Mono", monospace';
    ctx.fillText(fmtPrice(def, st.price), plotW + 6, yNow);
    ctx.textBaseline = 'alphabetic';
  }
}
