// Aleatoriedad del casino. Usa el generador criptográfico del navegador y descarta valores
// para que no haya sesgo (un simple "% n" favorece ligeramente a los primeros resultados).

/** Entero uniforme en [0, n). Las funciones de los juegos reciben esto para poder probarlas con otra fuente. */
export type Rand = (n: number) => number;

export const randInt: Rand = (n) => {
  if (!Number.isInteger(n) || n < 1 || n > 0x100000000) throw new RangeError('randInt: n fuera de rango');
  if (n === 1) return 0;
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % n;
};

/** Baraja Fisher–Yates con la fuente indicada (modifica y devuelve el mismo arreglo). */
export function shuffle<T>(items: T[], rand: Rand = randInt): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
