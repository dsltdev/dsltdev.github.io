// Formato de números compartido por la Mesa de trading y su terminal.
import { fmt } from '../game/logic';
import type { AssetDef } from './market';

const nf = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Dinero virtual: $1.234,56 · con signo opcional · compacto desde el millón. */
export function money(n: number, signed = false): string {
  const abs = Math.abs(n);
  if (abs < 0.005) return '$0,00';
  const body = abs >= 1e6 ? fmt(abs) : nf.format(abs);
  return `${n < 0 ? '-' : signed ? '+' : ''}$${body}`;
}

export const pctText = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1).replace('.', ',')}%`;

export function fmtPrice(def: AssetDef, p: number): string {
  return p.toLocaleString('es-CO', { minimumFractionDigits: def.digits, maximumFractionDigits: def.digits });
}

const BLOCKS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

/** Mini gráfico de una línea con bloques: ▁▂▃▅▇█ */
export function sparkline(values: number[], width: number): string {
  const v = values.slice(-width);
  if (v.length === 0) return '';
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  if (hi - lo < 1e-12) return BLOCKS[3].repeat(v.length);
  return v.map((x) => BLOCKS[Math.min(7, Math.floor(((x - lo) / (hi - lo)) * 8))]).join('');
}

/** Gráfico ASCII de varias filas (columnas de bloques). Devuelve las líneas con el eje de precios. */
export function asciiChart(values: number[], def: AssetDef, width = 48, height = 8): string[] {
  const v = values.slice(-width);
  if (v.length < 2) return ['(sin datos suficientes)'];
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const span = Math.max(hi - lo, 1e-12);
  const steps = height * 8;
  const levels = v.map((x) => Math.round(((x - lo) / span) * (steps - 1)) + 1);
  const label = (r: number) => (r === 0 ? fmtPrice(def, hi) : r === height - 1 ? fmtPrice(def, lo) : r === Math.floor(height / 2) ? fmtPrice(def, (hi + lo) / 2) : '');
  const labelW = Math.max(fmtPrice(def, hi).length, fmtPrice(def, lo).length);
  const lines: string[] = [];
  for (let r = 0; r < height; r++) {
    const rowBase = (height - 1 - r) * 8;
    const cells = levels.map((lv) => BLOCKS[Math.max(0, Math.min(8, lv - rowBase)) - 1] ?? ' ').join('');
    lines.push(`${label(r).padStart(labelW)} ┤${cells}`);
  }
  return lines;
}
