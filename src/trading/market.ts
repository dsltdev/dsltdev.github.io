// Mercado simulado de la Mesa de trading. Todo es ficticio: precios generados por un modelo,
// sin datos reales. Es determinista (generador de números con semilla) para poder probarlo.

export interface AssetDef {
  id: string;
  ticker: string;
  name: string;
  /** Precio de referencia hacia el que el mercado tiende a volver con el tiempo. */
  base: number;
  /** Volatilidad por tick (desviación estándar del retorno logarítmico). */
  sigma: number;
  /** Decimales con los que se muestra el precio. */
  digits: number;
  color: string;
}

export const ASSETS: AssetDef[] = [
  { id: 'btc', ticker: 'BTC', name: 'Bitcoin', base: 64000, sigma: 0.006, digits: 0, color: '#f3c778' },
  { id: 'eth', ticker: 'ETH', name: 'Ethereum', base: 3200, sigma: 0.0052, digits: 1, color: '#c9b8f0' },
  { id: 'acc', ticker: 'TECH', name: 'Acción tecnológica', base: 180, sigma: 0.0034, digits: 2, color: '#8fc4e8' },
  { id: 'pet', ticker: 'PET', name: 'Petróleo', base: 78, sigma: 0.003, digits: 2, color: '#b08968' },
  { id: 'oro', ticker: 'ORO', name: 'Oro', base: 2350, sigma: 0.0016, digits: 1, color: '#e0a23e' },
  { id: 'cop', ticker: 'USD/COP', name: 'Dólar / Peso', base: 4100, sigma: 0.0012, digits: 1, color: '#9bd0a5' }
];

export const TICKS_PER_CANDLE = 5;
export const MAX_CANDLES = 90;
/** Fuerza con la que el precio vuelve hacia su base: evita que se vaya a cero o al infinito. */
const REVERSION = 0.0006;

export interface Candle {
  o: number;
  h: number;
  l: number;
  c: number;
}

export interface AssetState {
  price: number;
  /** Multiplicador de volatilidad que cambia despacio (rachas de calma y de nervios). */
  volMult: number;
  /** Tendencia de fondo por tick y ticks que le quedan. */
  drift: number;
  driftLeft: number;
  /** Efecto de una noticia: tendencia extra por tick y ticks que le quedan. */
  newsDrift: number;
  newsLeft: number;
  candles: Candle[];
  cur: Candle & { n: number };
}

export interface News {
  text: string;
  asset: string;
  /** +1 si el titular suena alcista, -1 si bajista (no siempre acierta). */
  tone: 1 | -1;
  tick: number;
}

export interface Market {
  rng: number;
  tick: number;
  assets: Record<string, AssetState>;
  news: News | null;
  nextNewsAt: number;
}

// ---------- Números aleatorios con semilla (mulberry32) ----------

export function rand(m: { rng: number }): number {
  m.rng = (m.rng + 0x6d2b79f5) | 0;
  let t = m.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Normal estándar por Box–Muller. */
function randn(m: { rng: number }): number {
  const u1 = Math.max(rand(m), 1e-12);
  const u2 = rand(m);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ---------- Creación y avance ----------

function newAsset(def: AssetDef): AssetState {
  return {
    price: def.base,
    volMult: 1,
    drift: 0,
    driftLeft: 0,
    newsDrift: 0,
    newsLeft: 0,
    candles: [],
    cur: { o: def.base, h: def.base, l: def.base, c: def.base, n: 0 }
  };
}

export function newMarket(seed = (Date.now() ^ 0x9e3779b9) | 0): Market {
  const m: Market = { rng: seed, tick: 0, assets: {}, news: null, nextNewsAt: 45 };
  for (const a of ASSETS) m.assets[a.id] = newAsset(a);
  // Calienta el mercado para que la primera pantalla ya tenga velas y no una línea plana.
  for (let i = 0; i < TICKS_PER_CANDLE * 50; i++) stepMarket(m);
  m.tick = 0;
  m.news = null;
  m.nextNewsAt = 45;
  for (const a of Object.values(m.assets)) {
    a.newsLeft = 0;
    a.newsDrift = 0;
  }
  return m;
}

const BULL = ['Gran demanda impulsa a {a}', 'Un fondo grande compra {a}', 'Resultados mejores de lo esperado para {a}'];
const BEAR = ['Ventas masivas en {a}', 'Una regulación inesperada golpea a {a}', 'Toma de ganancias pesa sobre {a}'];

function maybeNews(m: Market) {
  if (m.tick < m.nextNewsAt) return;
  const def = ASSETS[Math.floor(rand(m) * ASSETS.length)];
  const tone: 1 | -1 = rand(m) < 0.5 ? 1 : -1;
  const list = tone === 1 ? BULL : BEAR;
  const text = list[Math.floor(rand(m) * list.length)].replace('{a}', def.name);
  // Los titulares no son una bola de cristal: el 30 % de las veces el mercado hace lo contrario.
  const real = rand(m) < 0.7 ? tone : (-tone as 1 | -1);
  const a = m.assets[def.id];
  a.newsDrift = real * def.sigma * 0.35;
  a.newsLeft = 20 + Math.floor(rand(m) * 15);
  m.news = { text, asset: def.id, tone, tick: m.tick };
  m.nextNewsAt = m.tick + 40 + Math.floor(rand(m) * 50);
}

export function stepMarket(m: Market) {
  m.tick++;
  for (const def of ASSETS) {
    const a = m.assets[def.id];

    // Tendencia de fondo: sube, baja o lateral durante un rato.
    if (a.driftLeft <= 0) {
      const pick = rand(m);
      a.drift = pick < 0.33 ? def.sigma * 0.06 : pick < 0.66 ? -def.sigma * 0.06 : 0;
      a.driftLeft = 60 + Math.floor(rand(m) * 120);
    }
    a.driftLeft--;

    // Volatilidad con memoria: vuelve despacio a 1 con sacudidas.
    a.volMult = Math.min(2.5, Math.max(0.5, 1 + 0.97 * (a.volMult - 1) + 0.06 * randn(m)));

    let drift = a.drift;
    if (a.newsLeft > 0) {
      drift += a.newsDrift;
      a.newsLeft--;
    }

    const s = def.sigma * a.volMult;
    const pull = -REVERSION * Math.log(a.price / def.base);
    a.price *= Math.exp(drift + pull - 0.5 * s * s + s * randn(m));

    // Velas
    const c = a.cur;
    c.c = a.price;
    if (a.price > c.h) c.h = a.price;
    if (a.price < c.l) c.l = a.price;
    c.n++;
    if (c.n >= TICKS_PER_CANDLE) {
      a.candles.push({ o: c.o, h: c.h, l: c.l, c: c.c });
      if (a.candles.length > MAX_CANDLES) a.candles.shift();
      a.cur = { o: a.price, h: a.price, l: a.price, c: a.price, n: 0 };
    }
  }
  maybeNews(m);
}

/** Variación porcentual del precio en las últimas `ticks` velas completas. */
export function changePct(a: AssetState, candles = 12): number {
  const list = a.candles;
  if (list.length === 0) return 0;
  const ref = list[Math.max(0, list.length - candles)].o;
  return ((a.price - ref) / ref) * 100;
}

// ---------- Guardado ----------

export function deserializeMarket(raw: unknown): Market | null {
  try {
    const d = raw as Market;
    if (!d || typeof d.rng !== 'number' || typeof d.tick !== 'number' || !d.assets) return null;
    const ok = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
    for (const def of ASSETS) {
      const a = d.assets[def.id];
      if (!a || !ok(a.price) || a.price <= 0 || !Array.isArray(a.candles) || !a.cur) return null;
      for (const k of ['volMult', 'drift', 'driftLeft', 'newsDrift', 'newsLeft'] as const) if (!ok(a[k])) return null;
      if (!a.candles.every((c) => ok(c.o) && ok(c.h) && ok(c.l) && ok(c.c))) return null;
      if (!ok(a.cur.o) || !ok(a.cur.h) || !ok(a.cur.l) || !ok(a.cur.c) || !ok(a.cur.n)) return null;
    }
    if (!ok(d.nextNewsAt)) d.nextNewsAt = d.tick + 45;
    return d;
  } catch {
    return null;
  }
}
