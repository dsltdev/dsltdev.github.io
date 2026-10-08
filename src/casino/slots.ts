// Tragamonedas de 3 rodillos x 3 filas y 5 líneas. Fichas virtuales: no tienen valor real.
// Todo lo que se muestra al jugador (retorno, tabla de premios) sale de este mismo código.
import { randInt, type Rand } from './rng';

export const SYMBOLS = ['coin', 'card', 'bank', 'chart', 'diamond', 'seven'] as const;
export type Sym = (typeof SYMBOLS)[number];

export const NAMES: Record<Sym, string> = { coin: 'Moneda', card: 'Tarjeta', bank: 'Banco', chart: 'Gráfico', diamond: 'Diamante', seven: 'Siete' };

/** Cuántas veces aparece cada símbolo en la cinta de cada rodillo. */
const COUNTS: Record<Sym, number> = { coin: 6, card: 5, bank: 3, chart: 2, diamond: 2, seven: 2 };

/** Cinta de un rodillo: símbolos intercalados para que no queden en bloques. */
export const STRIP: Sym[] = (() => {
  const pools = SYMBOLS.map((s) => COUNTS[s]);
  const total = pools.reduce((a, b) => a + b, 0);
  const out: Sym[] = [];
  while (out.length < total) {
    SYMBOLS.forEach((s, i) => {
      if (pools[i] > 0) {
        out.push(s);
        pools[i]--;
      }
    });
  }
  return out;
})();

export const REELS = 3;
export const ROWS = 3;
/** Fila que recorre cada línea en cada rodillo: 3 horizontales y 2 diagonales. */
export const LINES: number[][] = [
  [0, 0, 0],
  [1, 1, 1],
  [2, 2, 2],
  [0, 1, 2],
  [2, 1, 0]
];

/** Premio por línea (múltiplo de la apuesta de esa línea) al alinear 3 símbolos iguales. */
export const PAY: Record<Sym, number> = { coin: 4, card: 8, bank: 16, chart: 40, diamond: 100, seven: 400 };
/** Premio por línea con dos monedas seguidas desde la izquierda. */
export const TWO_COINS = 2;
/** Apuestas permitidas (múltiplos de 5, porque se reparten en 5 líneas). */
export const BETS = [50, 100, 250, 500, 1000, 2500];

export interface LineWin {
  line: number;
  sym: Sym;
  mult: number;
  /** true si es el premio de dos monedas. */
  partial: boolean;
}

export interface SpinResult {
  stops: number[];
  /** grid[rodillo][fila] */
  grid: Sym[][];
  wins: LineWin[];
  /** Suma de los premios, en múltiplos de la apuesta de una línea. */
  mult: number;
}

const at = (stop: number, row: number): Sym => STRIP[(stop + row) % STRIP.length];

export function evaluate(stops: number[]): SpinResult {
  const grid: Sym[][] = stops.map((s) => [0, 1, 2].map((r) => at(s, r)));
  const wins: LineWin[] = [];
  LINES.forEach((rows, line) => {
    const s = rows.map((row, reel) => grid[reel][row]);
    if (s[0] === s[1] && s[1] === s[2]) wins.push({ line, sym: s[0], mult: PAY[s[0]], partial: false });
    else if (s[0] === 'coin' && s[1] === 'coin') wins.push({ line, sym: 'coin', mult: TWO_COINS, partial: true });
  });
  return { stops, grid, wins, mult: wins.reduce((a, w) => a + w.mult, 0) };
}

export function spin(rand: Rand = randInt): SpinResult {
  return evaluate([rand(STRIP.length), rand(STRIP.length), rand(STRIP.length)]);
}

/** Fichas que devuelve la jugada (incluye la ganancia; la apuesta ya se descontó antes). */
export function payout(bet: number, r: SpinResult): number {
  return (bet / LINES.length) * r.mult;
}

/** Retorno al jugador exacto, calculado recorriendo TODAS las combinaciones posibles. */
export function exactStats(): { rtp: number; hitRate: number; winsAboveBet: number; combos: number } {
  const n = STRIP.length;
  let total = 0;
  let hits = 0;
  let above = 0;
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++)
      for (let c = 0; c < n; c++) {
        const r = evaluate([a, b, c]);
        total += r.mult;
        if (r.mult > 0) hits++;
        if (r.mult > LINES.length) above++;
      }
  const combos = n ** 3;
  return { rtp: total / combos / LINES.length, hitRate: hits / combos, winsAboveBet: above / combos, combos };
}
