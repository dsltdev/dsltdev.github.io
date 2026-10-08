// Ruleta europea (un solo cero). Fichas virtuales: no tienen valor real.
import { randInt, type Rand } from './rng';

export const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const colorOf = (n: number): 'red' | 'black' | 'green' => (n === 0 ? 'green' : RED.has(n) ? 'red' : 'black');

export interface BetDef {
  id: string;
  label: string;
  numbers: number[];
  /** Cuánto paga por cada ficha apostada (además de devolver la apuesta). */
  pays: number;
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const all = range(1, 36);

const OUTSIDE: BetDef[] = [
  { id: 'red', label: 'Rojo', numbers: all.filter((n) => RED.has(n)), pays: 1 },
  { id: 'black', label: 'Negro', numbers: all.filter((n) => !RED.has(n)), pays: 1 },
  { id: 'even', label: 'Par', numbers: all.filter((n) => n % 2 === 0), pays: 1 },
  { id: 'odd', label: 'Impar', numbers: all.filter((n) => n % 2 === 1), pays: 1 },
  { id: 'low', label: '1-18', numbers: range(1, 18), pays: 1 },
  { id: 'high', label: '19-36', numbers: range(19, 36), pays: 1 },
  { id: 'd1', label: '1ª docena', numbers: range(1, 12), pays: 2 },
  { id: 'd2', label: '2ª docena', numbers: range(13, 24), pays: 2 },
  { id: 'd3', label: '3ª docena', numbers: range(25, 36), pays: 2 },
  { id: 'c1', label: 'Columna 1', numbers: all.filter((n) => n % 3 === 1), pays: 2 },
  { id: 'c2', label: 'Columna 2', numbers: all.filter((n) => n % 3 === 2), pays: 2 },
  { id: 'c3', label: 'Columna 3', numbers: all.filter((n) => n % 3 === 0), pays: 2 }
];

/** Todas las apuestas posibles: los 37 números a pleno y las apuestas externas. */
export const BET_DEFS: Record<string, BetDef> = Object.fromEntries([
  ...range(0, 36).map((n): [string, BetDef] => [`n${n}`, { id: `n${n}`, label: String(n), numbers: [n], pays: 35 }]),
  ...OUTSIDE.map((b): [string, BetDef] => [b.id, b])
]);

/** Orden real de los bolsillos en una rueda europea (para dibujar la rueda). */
export const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

export const OUTSIDE_IDS = OUTSIDE.map((b) => b.id);
export const CHIPS = [10, 50, 100, 500, 1000];
export const MAX_BET_TOTAL = 20000;

export const spinWheel = (rand: Rand = randInt): number => rand(37);

export interface Resolution {
  /** Fichas que vuelven al jugador (apuesta + ganancia de las apuestas ganadoras). */
  returned: number;
  staked: number;
  wins: { id: string; stake: number; returned: number }[];
}

/** placed: ficha apostada por cada apuesta (id -> monto). */
export function resolve(placed: Record<string, number>, result: number): Resolution {
  let returned = 0;
  let staked = 0;
  const wins: Resolution['wins'] = [];
  for (const [id, stake] of Object.entries(placed)) {
    const def = BET_DEFS[id];
    if (!def || !(stake > 0)) continue;
    staked += stake;
    if (def.numbers.includes(result)) {
      const ret = stake * (def.pays + 1);
      returned += ret;
      wins.push({ id, stake, returned: ret });
    }
  }
  return { returned, staked, wins };
}

/** Retorno exacto de una apuesta: promedio sobre los 37 resultados. */
export function exactRtp(id: string): number {
  let total = 0;
  for (let r = 0; r <= 36; r++) total += resolve({ [id]: 1 }, r).returned;
  return total / 37;
}
