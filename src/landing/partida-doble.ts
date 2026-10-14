// Partida Doble: algoritmo generativo (la filosofía está en docs/partida-doble.md).
//
// Cada transacción nace como un par de hilos, un débito y un crédito, en dos carriles distintos del libro.
// Viajan a la misma velocidad hacia una línea de cierre como imágenes especulares: lo que uno se desplaza hacia
// arriba, el otro lo hace hacia abajo. Un campo de ruido de Perlin los trenza, pero la amplitud del trenzado
// nace en cero y vuelve a cero en el cierre, así que ambos llegan al mismo punto al mismo tiempo y se anulan.
// Rara vez nace un hilo SIN PAREJA: cruza la línea sin cancelarse y se vuelve una brasa a la deriva.
//
// Diseño:
//  - Toda la aleatoriedad sale de una semilla (mulberry32): la misma semilla da siempre el mismo libro.
//  - La simulación avanza con un paso fijo de 1/60 s y no depende del dibujo: `render` solo lee el estado.
//  - Las estelas son parte del estado (buffers circulares), no píxeles acumulados: no hay residuos de
//    desvanecimiento y el dibujo se puede repetir, congelar o redimensionar sin cambiar la lógica.

export interface Params {
  seed: number;
  /** Carriles (cuentas) del libro. */
  lanes: number;
  /** Pares nuevos por segundo. */
  spawn: number;
  /** Velocidad horizontal, en píxeles por segundo. */
  speed: number;
  /** Amplitud del trenzado, en separaciones de carril. */
  braid: number;
  /** Escala espacial del ruido, por píxel. */
  flow: number;
  /** Velocidad con que el ruido cambia en el tiempo. */
  drift: number;
  /** Posición de la línea de cierre (0 a 1 del ancho). */
  settle: number;
  /** Probabilidad de que un par nazca sin pareja. */
  orphan: number;
  /** Longitud de la estela de los pares, en pasos. */
  trail: number;
  /** Longitud de la estela de las brasas, en pasos. */
  scar: number;
  /** Grosor de línea, en píxeles. */
  weight: number;
  debit: string;
  credit: string;
  orphanColor: string;
  bg: string;
}

export const DEFAULTS: Params = {
  seed: 4,
  lanes: 10,
  spawn: 9.5,
  speed: 118,
  braid: 1.15,
  flow: 0.0042,
  drift: 0.35,
  settle: 0.64,
  orphan: 0.028,
  trail: 150,
  scar: 230,
  weight: 1.35,
  debit: '#e0a23e',
  credit: '#6fb3c7',
  orphanColor: '#ef6a4a',
  bg: '#14100b'
};

/**
 * Ajusta los parámetros al tamaño del lienzo para que la composición conserve su densidad y su ritmo:
 * en pantallas angostas el recorrido es corto, así que los hilos van más despacio y las estelas son más cortas;
 * y el número de carriles sigue la altura, para que la separación entre cuentas se mantenga legible.
 */
export function adaptParams(width: number, height: number, base: Partial<Params> = {}): Params {
  const p = { ...DEFAULTS, ...base };
  const k = Math.max(0.3, Math.min(1.2, width / 1200));
  return {
    ...p,
    speed: p.speed * Math.sqrt(k),
    flow: p.flow / Math.sqrt(k),
    trail: Math.max(40, Math.round(p.trail * Math.pow(k, 0.6))),
    scar: Math.max(80, Math.round(p.scar * Math.pow(k, 0.6))),
    lanes: base.lanes ?? Math.max(5, Math.min(14, Math.round((height * 0.82) / 26)))
  };
}

export const DT = 1 / 60;
/** Segundos que vive una brasa a la deriva. */
const EMBER_LIFE = 16;
const RING_LIFE = 1.4;
const TICK_LIFE = 0.8;

// ---------- Aleatoriedad con semilla ----------

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const fadeCurve = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const smoother = fadeCurve;

/** Ruido de Perlin 2D con tabla de permutación sembrada. Devuelve valores en [-1, 1]. */
function makeNoise(rand: () => number): (x: number, y: number) => number {
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  const grad = (h: number, x: number, y: number) => {
    switch (h & 7) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      case 3: return -x - y;
      case 4: return x;
      case 5: return -x;
      case 6: return y;
      default: return -y;
    }
  };
  return (x, y) => {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const X = fx & 255;
    const Y = fy & 255;
    const xf = x - fx;
    const yf = y - fy;
    const u = fadeCurve(xf);
    const v = fadeCurve(yf);
    const aa = p[p[X] + Y];
    const ab = p[p[X] + Y + 1];
    const ba = p[p[X + 1] + Y];
    const bb = p[p[X + 1] + Y + 1];
    const l1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const l2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return Math.max(-1, Math.min(1, lerp(l1, l2, v)));
  };
}

// ---------- Estructuras ----------

/** Estela: buffer circular de posiciones. */
class Trail {
  readonly xs: Float32Array;
  readonly ys: Float32Array;
  n = 0;
  private head = 0;
  constructor(readonly cap: number) {
    this.xs = new Float32Array(cap);
    this.ys = new Float32Array(cap);
  }
  push(x: number, y: number) {
    this.xs[this.head] = x;
    this.ys[this.head] = y;
    this.head = (this.head + 1) % this.cap;
    if (this.n < this.cap) this.n++;
  }
  /** Índice físico del punto i (0 = el más antiguo). */
  idx(i: number) {
    return (this.head - this.n + i + this.cap) % this.cap;
  }
}

interface Pair {
  id: number;
  /** x de partida, fuera de pantalla a la izquierda. */
  x0: number;
  /** Desfase inicial del débito respecto a la línea media; el crédito tiene el opuesto. */
  off0: number;
  ym: number;
  ph: number;
  v: number;
  s: number;
  /** Con pareja o sin ella. */
  orphan: boolean;
  /** Si es huérfano: qué hilo existe (+1 débito, -1 crédito). */
  lone: 1 | -1;
  /** Hilo débito (+1) y hilo crédito (-1). */
  debit: Trail | null;
  credit: Trail | null;
  free: boolean;
  age: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ring: number;
}

export interface Stats {
  spawned: number;
  balancedSpawned: number;
  orphansSpawned: number;
  closed: number;
  live: number;
  orphansLive: number;
  orphansExpired: number;
}

// ---------- Colores ----------

function hexRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255];
}

// ---------- El libro ----------

export class PartidaDoble {
  readonly params: Params;
  readonly w: number;
  readonly h: number;
  stepCount = 0;
  t = 0;

  private rand: () => number;
  private noise: (x: number, y: number) => number;
  private lanesY: number[] = [];
  private laneGap = 0;
  private x0: number;
  private xS: number;
  private pairs: Pair[] = [];
  private pulses: { y: number; t: number }[] = [];
  private nextId = 1;
  private counts = { spawned: 0, balanced: 0, orphans: 0, closed: 0, expired: 0 };
  private colors: Record<'debit' | 'credit' | 'orphan' | 'cream', [number, number, number]>;
  private rgbaCache = new Map<string, string>();

  constructor(params: Partial<Params>, width: number, height: number) {
    this.params = { ...DEFAULTS, ...params };
    this.w = Math.max(1, width);
    this.h = Math.max(1, height);
    this.rand = mulberry32(this.params.seed);
    this.noise = makeNoise(this.rand);
    this.x0 = -24;
    this.xS = this.params.settle * this.w;
    this.colors = {
      debit: hexRgb(this.params.debit),
      credit: hexRgb(this.params.credit),
      orphan: hexRgb(this.params.orphanColor),
      cream: [239, 230, 214]
    };

    // Carriles: repartidos en vertical con una leve irregularidad, como un libro escrito a mano.
    const L = Math.max(2, Math.round(this.params.lanes));
    const mT = this.h * 0.09;
    const mB = this.h * 0.09;
    this.laneGap = (this.h - mT - mB) / L;
    for (let i = 0; i < L; i++) {
      this.lanesY.push(mT + (i + 0.5) * this.laneGap + 0.16 * this.laneGap * this.noise(i * 3.7, 11.3));
    }
  }

  /** Avanza la simulación `n` pasos fijos (no dibuja nada). */
  warm(n: number) {
    for (let i = 0; i < n; i++) this.step();
  }

  step() {
    this.stepCount++;
    this.t += DT;
    const p = this.params;
    if (this.rand() < p.spawn * DT) this.spawnPair();

    const alive: Pair[] = [];
    for (const pr of this.pairs) {
      if (this.advance(pr)) alive.push(pr);
    }
    this.pairs = alive;
    for (const k of this.pulses) k.t += DT;
    this.pulses = this.pulses.filter((k) => k.t < TICK_LIFE);
  }

  private spawnPair() {
    const p = this.params;
    const L = this.lanesY.length;
    const a = Math.floor(this.rand() * L);
    // El crédito cae casi siempre en un carril cercano; a veces lejos.
    const span = Math.min(L - 1, 1 + Math.floor(-Math.log(1 - this.rand()) * 1.6));
    let b = this.rand() < 0.5 ? a + span : a - span;
    if (b < 0 || b >= L) b = b < 0 ? a + span : a - span;
    if (b < 0 || b >= L) b = a === 0 ? 1 : a - 1;
    const ya = this.lanesY[a];
    const yb = this.lanesY[b];
    const ym = (ya + yb) / 2;
    const orphan = this.rand() < p.orphan;
    const lone: 1 | -1 = this.rand() < 0.5 ? 1 : -1;
    // Las brasas guardan una estela mucho más larga: la cicatriz que dejan tarda en borrarse.
    const cap = orphan ? p.scar : p.trail;
    const pr: Pair = {
      id: this.nextId++,
      x0: this.x0,
      off0: ya - ym,
      ym,
      ph: this.rand() * 200,
      v: p.speed * (0.85 + 0.3 * this.rand()),
      s: 0,
      orphan,
      lone,
      debit: !orphan || lone === 1 ? new Trail(cap) : null,
      credit: !orphan || lone === -1 ? new Trail(cap) : null,
      free: false,
      age: 0,
      x: this.x0,
      y: ya,
      vx: 0,
      vy: 0,
      ring: -1
    };
    this.pairs.push(pr);
    this.counts.spawned++;
    if (orphan) this.counts.orphans++;
    else this.counts.balanced++;
  }

  /** Devuelve false cuando el par ya no existe. */
  private advance(pr: Pair): boolean {
    const p = this.params;
    if (pr.free) return this.advanceEmber(pr);

    pr.s += (pr.v * DT) / (this.xS - pr.x0);
    const closing = pr.s >= 1;
    const s = closing ? 1 : pr.s;
    const x = pr.x0 + (this.xS - pr.x0) * s;
    const e = smoother(s);
    // El trenzado nace en 0, florece a mitad de camino y vuelve a 0: ambos hilos llegan juntos al cierre.
    const w = Math.pow(Math.sin(Math.PI * s), 1.2);
    const wob = closing ? 0 : p.braid * this.laneGap * w * this.noise(x * p.flow + this.t * p.drift, pr.ph);
    const off = pr.off0 * (1 - e) + wob;
    const yD = pr.ym + off;
    const yC = pr.ym - off;
    pr.x = x;
    pr.debit?.push(x, yD);
    pr.credit?.push(x, yC);
    pr.y = pr.lone === 1 || !pr.orphan ? yD : yC;

    if (!closing) return true;
    if (!pr.orphan) {
      this.counts.closed++;
      this.pulses.push({ y: pr.ym, t: 0 });
      return false;
    }
    // Sin pareja: cruza la línea sin cancelarse y se vuelve brasa.
    pr.free = true;
    pr.age = 0;
    pr.ring = 0;
    pr.x = this.xS;
    pr.y = pr.ym;
    return true;
  }

  private advanceEmber(pr: Pair): boolean {
    pr.age += DT;
    if (pr.ring >= 0) pr.ring += DT;
    if (pr.age > EMBER_LIFE) {
      this.counts.expired++;
      return false;
    }
    const decay = Math.exp(-pr.age / 5.5);
    const nx = this.noise(pr.x * 0.006 + 7.3, pr.y * 0.006 + this.t * 0.2);
    const ny = this.noise(pr.y * 0.006 + 3.1, pr.x * 0.006 + this.t * 0.2);
    pr.vx = pr.v * 0.55 * decay + 3 + 9 * nx;
    pr.vy = -(9 + 5 * decay) + 7 * ny;
    pr.x = Math.min(this.w - 18, pr.x + pr.vx * DT);
    pr.y = Math.max(8, pr.y + pr.vy * DT);
    (pr.lone === 1 ? pr.debit : pr.credit)?.push(pr.x, pr.y);
    return true;
  }

  // ---------- Lectura del estado (pruebas y estadísticas) ----------

  stats(): Stats {
    const live = this.pairs.length;
    const orphansLive = this.pairs.filter((q) => q.orphan).length;
    return {
      spawned: this.counts.spawned,
      balancedSpawned: this.counts.balanced,
      orphansSpawned: this.counts.orphans,
      closed: this.counts.closed,
      live,
      orphansLive,
      orphansExpired: this.counts.expired
    };
  }

  /** Estado de cada par vivo: sirve para comprobar la simetría. */
  inspect() {
    return this.pairs.map((q) => {
      const last = (tr: Trail | null) => (tr && tr.n > 0 ? tr.ys[tr.idx(tr.n - 1)] : null);
      return { id: q.id, orphan: q.orphan, free: q.free, s: q.s, ym: q.ym, yDebit: last(q.debit), yCredit: last(q.credit) };
    });
  }

  /** Huella numérica del estado: igual semilla y pasos, igual huella. */
  checksum(): number {
    let h = 2166136261 >>> 0;
    const mix = (v: number) => {
      h ^= Math.round(v * 100) | 0;
      h = Math.imul(h, 16777619) >>> 0;
    };
    mix(this.stepCount);
    mix(this.counts.spawned);
    mix(this.counts.closed);
    for (const q of this.pairs) {
      mix(q.id);
      mix(q.x);
      mix(q.y);
      mix(q.s * 1000);
    }
    return h;
  }

  // ---------- Dibujo ----------

  private rgba(c: [number, number, number], a: number): string {
    const q = Math.max(0, Math.min(1, Math.round(a * 24) / 24));
    const key = `${c[0]},${c[1]},${c[2]},${q}`;
    let s = this.rgbaCache.get(key);
    if (!s) {
      s = `rgba(${c[0]},${c[1]},${c[2]},${q})`;
      this.rgbaCache.set(key, s);
    }
    return s;
  }

  private strokeTrail(ctx: CanvasRenderingContext2D, tr: Trail, c: [number, number, number], alpha: number) {
    const n = tr.n;
    if (n < 2) return;
    const bands = Math.min(6, n - 1);
    for (let b = 0; b < bands; b++) {
      const i0 = Math.floor((b * (n - 1)) / bands);
      const i1 = Math.floor(((b + 1) * (n - 1)) / bands);
      ctx.strokeStyle = this.rgba(c, alpha * Math.pow((b + 1) / bands, 1.7));
      ctx.beginPath();
      let k = tr.idx(i0);
      ctx.moveTo(tr.xs[k], tr.ys[k]);
      for (let i = i0 + 1; i <= i1; i++) {
        k = tr.idx(i);
        ctx.lineTo(tr.xs[k], tr.ys[k]);
      }
      ctx.stroke();
    }
  }

  /** Dibuja el cuadro actual. `opaque` pinta también el fondo (para exportar PNG). */
  render(ctx: CanvasRenderingContext2D, opaque = false) {
    const { w, h, params: p, colors } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    if (opaque) {
      ctx.fillStyle = p.bg;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // El libro: carriles y línea de cierre.
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.rgba(colors.cream, 0.07);
    ctx.beginPath();
    for (const y of this.lanesY) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(this.xS, Math.round(y) + 0.5);
    }
    ctx.stroke();
    ctx.strokeStyle = this.rgba(colors.cream, 0.03);
    ctx.beginPath();
    for (const y of this.lanesY) {
      ctx.moveTo(this.xS, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
    }
    ctx.stroke();
    ctx.setLineDash([2, 7]);
    ctx.strokeStyle = this.rgba(colors.cream, 0.16);
    ctx.beginPath();
    ctx.moveTo(Math.round(this.xS) + 0.5, 0);
    ctx.lineTo(Math.round(this.xS) + 0.5, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Hilos con pareja y hebras de las brasas, con mezcla aditiva para que la densidad brille.
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = p.weight;
    for (const q of this.pairs) {
      if (!q.orphan) {
        if (q.debit) this.strokeTrail(ctx, q.debit, colors.debit, 0.6);
        if (q.credit) this.strokeTrail(ctx, q.credit, colors.credit, 0.6);
      }
    }
    ctx.lineWidth = p.weight * 1.15;
    for (const q of this.pairs) {
      if (!q.orphan) continue;
      const life = q.free ? Math.max(0, Math.min(1, (EMBER_LIFE - q.age) / 5)) : 1;
      const tr = q.lone === 1 ? q.debit : q.credit;
      if (tr) this.strokeTrail(ctx, tr, colors.orphan, 0.62 * life);
    }

    // El asiento: un hilo fino une el débito con su crédito y se acorta hasta cerrarse en la línea.
    ctx.lineWidth = 1;
    for (const q of this.pairs) {
      if (q.orphan || !q.debit || !q.credit || q.debit.n === 0) continue;
      const kd = q.debit.idx(q.debit.n - 1);
      const kc = q.credit.idx(q.credit.n - 1);
      const near = Math.max(0, Math.min(1, (q.s - 0.55) / 0.45));
      ctx.strokeStyle = this.rgba(colors.cream, 0.1 + 0.3 * near);
      ctx.beginPath();
      ctx.moveTo(q.debit.xs[kd], q.debit.ys[kd]);
      ctx.lineTo(q.credit.xs[kc], q.credit.ys[kc]);
      ctx.stroke();
    }
    ctx.lineWidth = p.weight;

    // Cabezas de los hilos.
    for (const q of this.pairs) {
      if (q.orphan) continue;
      const near = q.s > 0.88 ? (q.s - 0.88) / 0.12 : 0;
      for (const tr of [q.debit, q.credit]) {
        if (!tr || tr.n === 0) continue;
        const k = tr.idx(tr.n - 1);
        ctx.fillStyle = this.rgba(tr === q.debit ? colors.debit : colors.credit, 0.5 + 0.45 * near);
        ctx.beginPath();
        ctx.arc(tr.xs[k], tr.ys[k], p.weight * (1.2 + 0.8 * near), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Brasas: resplandor, y una onda de alarma que se abre una sola vez al cruzar la línea.
    for (const q of this.pairs) {
      if (!q.orphan) continue;
      const tr = q.lone === 1 ? q.debit : q.credit;
      if (!tr || tr.n === 0) continue;
      const k = tr.idx(tr.n - 1);
      const hx = tr.xs[k];
      const hy = tr.ys[k];
      const life = q.free ? Math.max(0, Math.min(1, (EMBER_LIFE - q.age) / 5)) : 1;
      const pulse = 0.85 + 0.15 * Math.sin(this.t * 3.1 + q.id);
      const r = 17 * pulse;
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, r);
      g.addColorStop(0, this.rgba(colors.orphan, 0.55 * life));
      g.addColorStop(1, this.rgba(colors.orphan, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(hx, hy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this.rgba(colors.orphan, 0.95 * life);
      ctx.beginPath();
      ctx.arc(hx, hy, p.weight * 1.9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 1;
    for (const q of this.pairs) {
      if (q.orphan && q.ring >= 0 && q.ring < RING_LIFE) {
        const k = q.ring / RING_LIFE;
        ctx.strokeStyle = this.rgba(colors.orphan, (1 - k) * 0.55);
        ctx.beginPath();
        ctx.arc(this.xS, q.ym, 6 + k * 34, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Cada cierre deja un tic de contabilidad en la línea.
    for (const k of this.pulses) {
      const a = 1 - k.t / TICK_LIFE;
      ctx.strokeStyle = this.rgba(colors.cream, a * 0.7);
      ctx.beginPath();
      ctx.moveTo(Math.round(this.xS) + 0.5, k.y - 6);
      ctx.lineTo(Math.round(this.xS) + 0.5, k.y + 6);
      ctx.stroke();
    }
    ctx.restore();
  }
}
