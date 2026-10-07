// Lógica pura del juego: sin DOM, sin canvas. Se puede probar con Node.
import {
  COST_GROWTH,
  GENERATORS,
  GOLD_HOURS,
  LICENSE_BONUS,
  LICENSE_DIVISOR,
  MONETIZATION,
  OFFLINE_CAP_SECONDS,
  OFFLINE_EFFICIENCY,
  UPGRADES,
  type GeneratorDef,
  type ProductId,
  type UpgradeDef
} from './config';

export interface State {
  coins: number;
  runEarned: number;
  lifetimeEarned: number;
  clicks: number;
  owned: Record<string, number>;
  upgrades: string[];
  licenses: number;
  resets: number;
  /** Segundos que le quedan al boost por anuncio. */
  boostLeft: number;
  pro: boolean;
  /** Hashes de códigos ya canjeados en este dispositivo. */
  redeemed: string[];
  savedAt: number;
}

export function newState(now = Date.now()): State {
  return {
    coins: 0,
    runEarned: 0,
    lifetimeEarned: 0,
    clicks: 0,
    owned: {},
    upgrades: [],
    licenses: 0,
    resets: 0,
    boostLeft: 0,
    pro: false,
    redeemed: [],
    savedAt: now
  };
}

const genById = new Map<string, GeneratorDef>(GENERATORS.map((g) => [g.id, g]));
const upgradeById = new Map<string, UpgradeDef>(UPGRADES.map((u) => [u.id, u]));

export const ownedOf = (s: State, id: string) => s.owned[id] ?? 0;

// ---------- Producción ----------

function genMultiplier(s: State, id: string): number {
  let m = 1;
  for (const uid of s.upgrades) {
    const u = upgradeById.get(uid);
    if (u?.kind === 'gen' && u.target === id) m *= u.value;
  }
  return m;
}

/** Multiplicador global: licencias, Pase Pro y boost de anuncio. */
export function globalMultiplier(s: State): number {
  const boost = s.boostLeft > 0 ? MONETIZATION.rewardedBoost.multiplier : 1;
  return (1 + LICENSE_BONUS * s.licenses) * (s.pro ? 2 : 1) * boost;
}

/** Producción por segundo sin el boost temporal (sirve para el offline). */
export function baseCps(s: State): number {
  let total = 0;
  for (const g of GENERATORS) total += ownedOf(s, g.id) * g.baseCps * genMultiplier(s, g.id);
  return total * (1 + LICENSE_BONUS * s.licenses) * (s.pro ? 2 : 1);
}

/** Producción por segundo de una sola unidad de un negocio (con mejoras, licencias y Pase Pro). */
export function unitCps(s: State, id: string): number {
  const def = genById.get(id);
  if (!def) return 0;
  return def.baseCps * genMultiplier(s, id) * (1 + LICENSE_BONUS * s.licenses) * (s.pro ? 2 : 1);
}

export function cps(s: State): number {
  return baseCps(s) * (s.boostLeft > 0 ? MONETIZATION.rewardedBoost.multiplier : 1);
}

export function clickPower(s: State): number {
  let mult = 1;
  let pct = 0;
  for (const uid of s.upgrades) {
    const u = upgradeById.get(uid);
    if (u?.kind === 'click') mult *= u.value;
    if (u?.kind === 'clickCps') pct += u.value;
  }
  return (1 * mult + cps(s) * pct) * (1 + LICENSE_BONUS * s.licenses) * (s.pro ? 2 : 1);
}

function earn(s: State, amount: number) {
  s.coins += amount;
  s.runEarned += amount;
  s.lifetimeEarned += amount;
}

export function tick(s: State, dt: number) {
  earn(s, cps(s) * dt);
  if (s.boostLeft > 0) s.boostLeft = Math.max(0, s.boostLeft - dt);
}

export function click(s: State): number {
  const gain = clickPower(s);
  earn(s, gain);
  s.clicks++;
  return gain;
}

// ---------- Compras ----------

/** Costo de comprar `n` unidades empezando por las que ya tienes. */
export function bulkCost(def: GeneratorDef, owned: number, n: number): number {
  const r = COST_GROWTH;
  return Math.ceil((def.baseCost * Math.pow(r, owned) * (Math.pow(r, n) - 1)) / (r - 1));
}

export function maxAffordable(def: GeneratorDef, owned: number, coins: number): number {
  const r = COST_GROWTH;
  const unit = def.baseCost * Math.pow(r, owned);
  const n = Math.floor(Math.log((coins * (r - 1)) / unit + 1) / Math.log(r));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function buyGenerator(s: State, id: string, n: number): boolean {
  const def = genById.get(id);
  if (!def || n < 1) return false;
  const cost = bulkCost(def, ownedOf(s, id), n);
  if (s.coins < cost) return false;
  s.coins -= cost;
  s.owned[id] = ownedOf(s, id) + n;
  return true;
}

export function upgradeVisible(s: State, u: UpgradeDef): boolean {
  if (s.upgrades.includes(u.id)) return false;
  const { owned, earned } = u.requires;
  if (owned && ownedOf(s, owned.id) < owned.count) return false;
  if (earned && s.runEarned < earned) return false;
  return true;
}

export function visibleUpgrades(s: State): UpgradeDef[] {
  return UPGRADES.filter((u) => upgradeVisible(s, u));
}

export function buyUpgrade(s: State, id: string): boolean {
  const u = upgradeById.get(id);
  if (!u || !upgradeVisible(s, u) || s.coins < u.cost) return false;
  s.coins -= u.cost;
  s.upgrades.push(u.id);
  return true;
}

// ---------- Reinvertir (prestigio) ----------

export function pendingLicenses(s: State): number {
  return Math.max(0, Math.floor(Math.sqrt(s.runEarned / LICENSE_DIVISOR)));
}

export function prestige(s: State): number {
  const gained = pendingLicenses(s);
  if (gained < 1) return 0;
  const keep = { licenses: s.licenses + gained, resets: s.resets + 1, lifetimeEarned: s.lifetimeEarned, clicks: s.clicks, pro: s.pro, redeemed: s.redeemed };
  Object.assign(s, newState(), keep);
  return gained;
}

// ---------- Boost, offline y canje ----------

export function addBoost(s: State): number {
  const { seconds, maxSeconds } = MONETIZATION.rewardedBoost;
  s.boostLeft = Math.min(maxSeconds, s.boostLeft + seconds);
  return s.boostLeft;
}

/** Aplica la producción de cuando el jugador estuvo fuera. Devuelve lo ganado. */
export function applyOffline(s: State, now = Date.now()): { seconds: number; gained: number } {
  const elapsed = Math.min(OFFLINE_CAP_SECONDS, Math.max(0, (now - s.savedAt) / 1000));
  if (elapsed < 30) return { seconds: 0, gained: 0 };
  const gained = baseCps(s) * elapsed * OFFLINE_EFFICIENCY;
  if (gained > 0) earn(s, gained);
  return { seconds: elapsed, gained };
}

export function applyProduct(s: State, id: ProductId): string {
  if (id === 'pro') {
    s.pro = true;
    return 'Pase Pro activado: producción x2 para siempre.';
  }
  const gained = baseCps(s) * GOLD_HOURS * 3600;
  earn(s, gained);
  return `Maletín de oro: +${GOLD_HOURS} horas de producción.`;
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text.trim().toUpperCase());
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Canjea un código. Devuelve el mensaje o null si no es válido / ya se usó. */
export async function redeem(s: State, code: string): Promise<string | null> {
  const hash = await sha256Hex(code);
  const product = MONETIZATION.redeemCodes[hash];
  if (!product || s.redeemed.includes(hash)) return null;
  s.redeemed.push(hash);
  return applyProduct(s, product);
}

// ---------- Guardado ----------

export function serialize(s: State): string {
  return JSON.stringify({ ...s, savedAt: Date.now() });
}

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);

/** Carga un guardado validando cada campo; ante cualquier duda parte de cero. */
export function deserialize(raw: string | null): State {
  const s = newState();
  if (!raw) return s;
  try {
    const d = JSON.parse(raw) as Record<string, unknown>;
    s.coins = num(d.coins);
    s.runEarned = num(d.runEarned);
    s.lifetimeEarned = num(d.lifetimeEarned);
    s.clicks = num(d.clicks);
    s.licenses = Math.floor(num(d.licenses));
    s.resets = Math.floor(num(d.resets));
    s.boostLeft = num(d.boostLeft);
    s.pro = d.pro === true;
    s.savedAt = num(d.savedAt, Date.now());
    if (d.owned && typeof d.owned === 'object') {
      for (const g of GENERATORS) s.owned[g.id] = Math.floor(num((d.owned as Record<string, unknown>)[g.id]));
    }
    if (Array.isArray(d.upgrades)) s.upgrades = d.upgrades.filter((id): id is string => typeof id === 'string' && upgradeById.has(id));
    if (Array.isArray(d.redeemed)) s.redeemed = d.redeemed.filter((h): h is string => typeof h === 'string');
    return s;
  } catch {
    return newState();
  }
}

// ---------- Formato ----------

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'];

export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  if (n < 1000) return n < 10 && n % 1 !== 0 ? n.toFixed(1) : Math.floor(n).toLocaleString('es-CO');
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(n) / 3));
  const v = n / Math.pow(1000, tier);
  return `${v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0)}${SUFFIXES[tier]}`;
}

export function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m}:${String(s).padStart(2, '0')}`;
  return `${s} s`;
}
