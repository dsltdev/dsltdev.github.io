// Cuenta de la Mesa de trading: posiciones largas y cortas con apalancamiento,
// comisiones, stop-loss, take-profit y liquidación. Dinero 100 % simulado.
import { ASSETS, type Market } from './market';

export const START_CASH = 10000;
export const RECHARGE = 5000;
/** Comisión sobre el valor de la operación, al abrir y al cerrar. */
export const FEE = 0.0008;
export const MAX_POSITIONS = 8;
export const MIN_MARGIN = 10;
export const LEVERAGES = [1, 2, 5, 10] as const;
/** Se liquida al perder este porcentaje del margen. */
export const LIQ_LOSS = 0.9;

export type Side = 'long' | 'short';
export type CloseReason = 'manual' | 'sl' | 'tp' | 'liq';

export interface Position {
  id: number;
  asset: string;
  side: Side;
  entry: number;
  qty: number;
  margin: number;
  lev: number;
  sl: number | null;
  tp: number | null;
  openFee: number;
  openedTick: number;
}

export interface Trade {
  asset: string;
  side: Side;
  lev: number;
  entry: number;
  exit: number;
  pnl: number;
  /** Rendimiento sobre el margen. */
  pct: number;
  reason: CloseReason;
  tick: number;
}

export interface Stats {
  trades: number;
  wins: number;
  best: number;
  worst: number;
  liquidations: number;
  streak: number;
  bestStreak: number;
  shortWins: number;
  peak: number;
  resets: number;
  recharges: number;
}

export interface Account {
  cash: number;
  positions: Position[];
  history: Trade[];
  nextId: number;
  stats: Stats;
  achievements: string[];
}

export function newAccount(): Account {
  return {
    cash: START_CASH,
    positions: [],
    history: [],
    nextId: 1,
    achievements: [],
    stats: { trades: 0, wins: 0, best: 0, worst: 0, liquidations: 0, streak: 0, bestStreak: 0, shortWins: 0, peak: START_CASH, resets: 0, recharges: 0 }
  };
}

const dir = (side: Side) => (side === 'long' ? 1 : -1);

export function unrealized(p: Position, price: number): number {
  return dir(p.side) * (price - p.entry) * p.qty;
}

/** Precio al que la posición se liquida. */
export function liqPrice(p: Position): number {
  return p.entry - dir(p.side) * ((LIQ_LOSS * p.margin) / p.qty);
}

export function equity(a: Account, m: Market): number {
  let e = a.cash;
  for (const p of a.positions) e += p.margin + unrealized(p, m.assets[p.asset].price);
  return e;
}

export function openPnl(a: Account, m: Market): number {
  let t = 0;
  for (const p of a.positions) t += unrealized(p, m.assets[p.asset].price);
  return t;
}

export interface OpenRequest {
  asset: string;
  side: Side;
  margin: number;
  lev: number;
  /** Porcentajes de movimiento en contra / a favor desde la entrada (opcionales). */
  slPct?: number | null;
  tpPct?: number | null;
}

export type OpenResult = { ok: true; position: Position } | { ok: false; error: string };

export function openPosition(a: Account, m: Market, r: OpenRequest): OpenResult {
  const st = m.assets[r.asset];
  if (!st || !ASSETS.some((d) => d.id === r.asset)) return { ok: false, error: 'Activo desconocido.' };
  if (!(LEVERAGES as readonly number[]).includes(r.lev)) return { ok: false, error: 'Apalancamiento no válido.' };
  if (!Number.isFinite(r.margin) || r.margin < MIN_MARGIN) return { ok: false, error: `El margen mínimo es $${MIN_MARGIN}.` };
  if (a.positions.length >= MAX_POSITIONS) return { ok: false, error: `Máximo ${MAX_POSITIONS} posiciones abiertas.` };

  const notional = r.margin * r.lev;
  const fee = notional * FEE;
  if (r.margin + fee > a.cash + 1e-9) return { ok: false, error: 'No tienes efectivo suficiente.' };

  const maxPct = LIQ_LOSS * 100 / r.lev; // más allá de esto la liquidación llega primero
  const level = (pct: number | null | undefined, against: boolean): number | null | 'bad' => {
    if (pct == null) return null;
    if (!Number.isFinite(pct) || pct <= 0 || (against && pct >= maxPct)) return 'bad';
    const move = against ? -1 : 1;
    return st.price * (1 + (dir(r.side) * move * pct) / 100);
  };
  const sl = level(r.slPct, true);
  const tp = level(r.tpPct, false);
  if (sl === 'bad') return { ok: false, error: `El stop-loss debe ser mayor que 0 y menor que ${maxPct.toFixed(1)} % con ese apalancamiento.` };
  if (tp === 'bad') return { ok: false, error: 'El take-profit debe ser mayor que 0 %.' };

  const position: Position = {
    id: a.nextId++,
    asset: r.asset,
    side: r.side,
    entry: st.price,
    qty: notional / st.price,
    margin: r.margin,
    lev: r.lev,
    sl,
    tp,
    openFee: fee,
    openedTick: m.tick
  };
  a.cash -= r.margin + fee;
  a.positions.push(position);
  return { ok: true, position };
}

/** Cierra una posición al precio dado y registra la operación. */
export function closePosition(a: Account, m: Market, id: number, reason: CloseReason, atPrice?: number): Trade | null {
  const i = a.positions.findIndex((p) => p.id === id);
  if (i < 0) return null;
  const p = a.positions[i];
  const price = atPrice ?? m.assets[p.asset].price;
  const gross = unrealized(p, price);

  let pnl: number;
  if (reason === 'liq') {
    // Liquidación: se pierde el margen completo.
    pnl = -p.margin - p.openFee;
  } else {
    const closeFee = p.qty * price * FEE;
    a.cash += p.margin + gross - closeFee;
    pnl = gross - p.openFee - closeFee;
  }
  a.positions.splice(i, 1);

  const trade: Trade = { asset: p.asset, side: p.side, lev: p.lev, entry: p.entry, exit: price, pnl, pct: (pnl / p.margin) * 100, reason, tick: m.tick };
  a.history.unshift(trade);
  if (a.history.length > 50) a.history.pop();

  const s = a.stats;
  s.trades++;
  if (pnl > 0) {
    s.wins++;
    s.streak++;
    if (p.side === 'short') s.shortWins++;
  } else s.streak = 0;
  if (s.streak > s.bestStreak) s.bestStreak = s.streak;
  if (pnl > s.best) s.best = pnl;
  if (pnl < s.worst) s.worst = pnl;
  if (reason === 'liq') s.liquidations++;
  return trade;
}

/** Revisa liquidaciones, stop-loss y take-profit tras cada tick. Devuelve lo que se cerró. */
export function processTick(a: Account, m: Market): Trade[] {
  const closed: Trade[] = [];
  for (const p of [...a.positions]) {
    const price = m.assets[p.asset].price;
    const liq = liqPrice(p);
    const hitLiq = p.side === 'long' ? price <= liq : price >= liq;
    let reason: CloseReason | null = null;
    if (hitLiq) reason = 'liq';
    else if (p.sl !== null && (p.side === 'long' ? price <= p.sl : price >= p.sl)) reason = 'sl';
    else if (p.tp !== null && (p.side === 'long' ? price >= p.tp : price <= p.tp)) reason = 'tp';
    if (reason) {
      const t = closePosition(a, m, p.id, reason);
      if (t) closed.push(t);
    }
  }
  const e = equity(a, m);
  if (e > a.stats.peak) a.stats.peak = e;
  return closed;
}

// ---------- Cuenta nueva y recarga ----------

/** Empieza de cero conservando logros y totales de partidas. */
export function resetAccount(a: Account): void {
  const keep = { achievements: a.achievements, resets: a.stats.resets + 1, recharges: a.stats.recharges, peak: a.stats.peak };
  Object.assign(a, newAccount());
  a.achievements = keep.achievements;
  a.stats.resets = keep.resets;
  a.stats.recharges = keep.recharges;
  a.stats.peak = Math.max(START_CASH, keep.peak);
}

/** Recarga de capital (tras ver un anuncio). Solo si estás casi en quiebra y sin posiciones. */
export function canRecharge(a: Account, m: Market): boolean {
  return a.positions.length === 0 && equity(a, m) < 500;
}

export function recharge(a: Account, m: Market): boolean {
  if (!canRecharge(a, m)) return false;
  a.cash += RECHARGE;
  a.stats.recharges++;
  return true;
}

// ---------- Rangos y logros ----------

export const RANKS: { min: number; name: string }[] = [
  { min: 0, name: 'Novato en apuros' },
  { min: 8000, name: 'Aprendiz' },
  { min: 15000, name: 'Trader' },
  { min: 40000, name: 'Gestor de fondos' },
  { min: 150000, name: 'Tiburón' },
  { min: 1000000, name: 'Leyenda de la mesa' }
];

export function rankOf(equityNow: number): { name: string; next: { name: string; min: number } | null } {
  let idx = 0;
  RANKS.forEach((r, i) => {
    if (equityNow >= r.min) idx = i;
  });
  const next = RANKS[idx + 1];
  return { name: RANKS[idx].name, next: next ? { name: next.name, min: next.min } : null };
}

export interface TraderAchievement {
  id: string;
  name: string;
  desc: string;
  done: (a: Account, equityNow: number) => boolean;
}

export const TRADER_ACHIEVEMENTS: TraderAchievement[] = [
  { id: 'first', name: 'Primera operación', desc: 'Cierra una operación.', done: (a) => a.stats.trades >= 1 },
  { id: 'win', name: 'En verde', desc: 'Cierra una operación con ganancia.', done: (a) => a.stats.wins >= 1 },
  { id: 'ten', name: 'Constancia', desc: 'Cierra 10 operaciones.', done: (a) => a.stats.trades >= 10 },
  { id: 'short', name: 'Contra la corriente', desc: 'Gana con una posición corta.', done: (a) => a.stats.shortWins >= 1 },
  { id: 'streak3', name: 'Racha', desc: 'Encadena 3 ganancias seguidas.', done: (a) => a.stats.bestStreak >= 3 },
  { id: 'liq', name: 'Lección aprendida', desc: 'Sufre una liquidación (a todos nos pasa).', done: (a) => a.stats.liquidations >= 1 },
  { id: 'double', name: 'Capital x2', desc: 'Alcanza $20.000 de patrimonio.', done: (_a, e) => e >= 2 * START_CASH },
  { id: 'big', name: 'Gran golpe', desc: 'Gana $1.000 en una sola operación.', done: (a) => a.stats.best >= 1000 },
  { id: 'rank', name: 'Gestor de fondos', desc: 'Llega a $40.000 de patrimonio.', done: (_a, e) => e >= 40000 }
];

export function checkTraderAchievements(a: Account, equityNow: number): TraderAchievement[] {
  const fresh: TraderAchievement[] = [];
  for (const t of TRADER_ACHIEVEMENTS) {
    if (!a.achievements.includes(t.id) && t.done(a, equityNow)) {
      a.achievements.push(t.id);
      fresh.push(t);
    }
  }
  return fresh;
}

// ---------- Guardado ----------

export function deserializeAccount(raw: unknown): Account | null {
  try {
    const d = raw as Account;
    const ok = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
    if (!d || !ok(d.cash) || d.cash < 0 || !Array.isArray(d.positions) || !d.stats) return null;
    const base = newAccount();
    const a: Account = { ...base, cash: d.cash, nextId: ok(d.nextId) ? d.nextId : 1 };
    for (const p of d.positions) {
      const good =
        p && ASSETS.some((x) => x.id === p.asset) && (p.side === 'long' || p.side === 'short') && ok(p.entry) && p.entry > 0 && ok(p.qty) && p.qty > 0 && ok(p.margin) && p.margin > 0 && ok(p.lev) && ok(p.openFee) && ok(p.openedTick);
      if (!good) return null;
      a.positions.push({ ...p, sl: ok(p.sl) ? p.sl : null, tp: ok(p.tp) ? p.tp : null });
      a.nextId = Math.max(a.nextId, p.id + 1);
    }
    for (const k of Object.keys(base.stats) as (keyof Stats)[]) a.stats[k] = ok(d.stats[k]) ? d.stats[k] : base.stats[k];
    if (Array.isArray(d.history)) a.history = d.history.filter((t) => t && ok(t.pnl) && ok(t.entry) && ok(t.exit)).slice(0, 50);
    if (Array.isArray(d.achievements)) a.achievements = d.achievements.filter((id) => TRADER_ACHIEVEMENTS.some((t) => t.id === id));
    return a;
  } catch {
    return null;
  }
}
