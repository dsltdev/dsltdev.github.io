// Billetera del casino: fichas virtuales sin ningún valor real. Se guardan solo en este navegador.
export const SAVE_KEY = 'pagos-casino:v1';
export const START_CHIPS = 10000;
export const REFILL_CHIPS = 5000;
export const DAILY_BASE = 2000;
export const DAILY_STREAK_STEP = 500;
export const DAILY_STREAK_MAX = 6;

export interface Level {
  name: string;
  /** Fichas apostadas en total para llegar a este nivel. */
  min: number;
  /** Tema de mesa que desbloquea (solo cosmético). */
  theme: string;
}

export const LEVELS: Level[] = [
  { name: 'Bronce', min: 0, theme: 'verde' },
  { name: 'Plata', min: 50_000, theme: 'azul' },
  { name: 'Oro', min: 250_000, theme: 'vino' },
  { name: 'Platino', min: 1_000_000, theme: 'negro' },
  { name: 'Diamante', min: 5_000_000, theme: 'dorado' }
];

export interface Wallet {
  chips: number;
  /** Fichas apostadas en total (da el nivel VIP). */
  wagered: number;
  spins: number;
  hands: number;
  rounds: number;
  biggestWin: number;
  /** Fecha local (AAAA-MM-DD) del último regalo diario y racha de días seguidos. */
  dailyDay: string;
  dailyStreak: number;
  theme: string;
  /** Marca de tiempo en que confirmó ser mayor de 18. */
  adultAt: number | null;
  refills: number;
  /** Fin (marca de tiempo) de una pausa que la persona se puso a sí misma; null si no hay. */
  breakUntil: number | null;
}

export function newWallet(): Wallet {
  return { chips: START_CHIPS, wagered: 0, spins: 0, hands: 0, rounds: 0, biggestWin: 0, dailyDay: '', dailyStreak: 0, theme: 'verde', adultAt: null, refills: 0, breakUntil: null };
}

export const levelIndex = (w: Wallet) => LEVELS.reduce((idx, l, i) => (w.wagered >= l.min ? i : idx), 0);
export const levelOf = (w: Wallet): Level => LEVELS[levelIndex(w)];
export const nextLevel = (w: Wallet): Level | null => LEVELS[levelIndex(w) + 1] ?? null;
export const unlockedThemes = (w: Wallet) => LEVELS.slice(0, levelIndex(w) + 1).map((l) => l.theme);

/** Descuenta una apuesta. Falla si no alcanzan las fichas. */
export function bet(w: Wallet, amount: number): boolean {
  if (!Number.isInteger(amount) || amount <= 0 || amount > w.chips) return false;
  w.chips -= amount;
  w.wagered += amount;
  return true;
}

/** Acredita fichas que vuelven al jugador (apuesta + ganancia). */
export function credit(w: Wallet, amount: number, stakeForRecord = 0): void {
  if (!(amount > 0)) return;
  w.chips += amount;
  const net = amount - stakeForRecord;
  if (net > w.biggestWin) w.biggestWin = net;
}

export const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function dayDiff(a: string, b: string): number {
  const t = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(b) - t(a)) / 86400000);
}

export const canClaimDaily = (w: Wallet, now = new Date()) => w.dailyDay !== localDay(now);

/** Regalo diario: 2.000 fichas y +500 por cada día seguido (hasta 6 días). Devuelve lo recibido o 0. */
export function claimDaily(w: Wallet, now = new Date()): number {
  const today = localDay(now);
  if (w.dailyDay === today) return 0;
  w.dailyStreak = w.dailyDay && dayDiff(w.dailyDay, today) === 1 ? Math.min(DAILY_STREAK_MAX, w.dailyStreak + 1) : 0;
  w.dailyDay = today;
  const gift = DAILY_BASE + w.dailyStreak * DAILY_STREAK_STEP;
  w.chips += gift;
  return gift;
}

/** Pausa voluntaria: el casino se bloquea hasta que termine. No se puede acortar. */
export function startBreak(w: Wallet, minutes: number, now = Date.now()): void {
  const until = now + minutes * 60_000;
  w.breakUntil = Math.max(w.breakUntil ?? 0, until);
}

/** Milisegundos que faltan para terminar la pausa (0 si no hay). */
export const breakLeft = (w: Wallet, now = Date.now()) => (w.breakUntil && w.breakUntil > now ? w.breakUntil - now : 0);

/** Quedarse sin fichas suficientes para la apuesta mínima del juego. */
export const isBroke = (w: Wallet, minBet: number) => w.chips < minBet;

export function refill(w: Wallet): void {
  w.chips += REFILL_CHIPS;
  w.refills++;
}

/** Reinicia las fichas (no el nivel VIP ni los totales). */
export function resetChips(w: Wallet): void {
  w.chips = START_CHIPS;
}

// ---------- Guardado ----------

const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);

export function deserialize(raw: string | null): Wallet {
  const w = newWallet();
  if (!raw) return w;
  try {
    const d = JSON.parse(raw) as Record<string, unknown>;
    w.chips = Math.floor(num(d.chips, START_CHIPS));
    w.wagered = Math.floor(num(d.wagered));
    w.spins = Math.floor(num(d.spins));
    w.hands = Math.floor(num(d.hands));
    w.rounds = Math.floor(num(d.rounds));
    w.biggestWin = Math.floor(num(d.biggestWin));
    w.dailyStreak = Math.min(DAILY_STREAK_MAX, Math.floor(num(d.dailyStreak)));
    w.refills = Math.floor(num(d.refills));
    w.dailyDay = typeof d.dailyDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.dailyDay) ? d.dailyDay : '';
    w.breakUntil = typeof d.breakUntil === 'number' && Number.isFinite(d.breakUntil) ? d.breakUntil : null;
    w.adultAt = typeof d.adultAt === 'number' && Number.isFinite(d.adultAt) ? d.adultAt : null;
    const themes = unlockedThemes(w);
    w.theme = typeof d.theme === 'string' && themes.includes(d.theme) ? d.theme : 'verde';
    return w;
  } catch {
    return newWallet();
  }
}

export const serialize = (w: Wallet) => JSON.stringify(w);
