// Comandos de la terminal de trading. Lógica pura (sin DOM): recibe una línea y devuelve
// las líneas de salida y, si hace falta, una acción para la interfaz. Así se puede probar en Node.
import {
  FEE,
  LEVERAGES,
  LIQ_LOSS,
  MAX_POSITIONS,
  TRADER_ACHIEVEMENTS,
  checkTraderAchievements,
  closePosition,
  equity,
  liqPrice,
  openPnl,
  openPosition,
  rankOf,
  resetAccount,
  unrealized,
  type Account,
  type Side,
  type Trade
} from './account';
import { asciiChart, fmtPrice, money, pctText, sparkline } from './format';
import { ASSETS, changePct, type AssetDef, type Market, type News } from './market';

export type LineKind = 'in' | 'out' | 'ok' | 'err' | 'warn' | 'dim' | 'head';
export interface Line {
  kind: LineKind;
  text: string;
  /** Tablas y gráficos: no se ajustan al ancho (se desplazan) para conservar las columnas. */
  nowrap?: boolean;
}

export type Action = 'clear' | 'exit' | 'rain-on' | 'rain-off' | 'sound-on' | 'sound-off';
export type Sfx = 'buy' | 'win' | 'lose' | 'achievement';

export interface Result {
  lines: Line[];
  action?: Action;
  sfx?: Sfx;
  /** true si cambió la cuenta o el mercado y conviene guardar. */
  changed?: boolean;
}

export interface Env {
  market: Market;
  acct: Account;
  getSpeed: () => number;
  setSpeed: (n: number) => void;
}

const line = (kind: LineKind, text: string): Line => ({ kind, text });
const out = (text = '') => line('out', text);
const tbl = (kind: LineKind, text: string): Line => ({ kind, text, nowrap: true });
const err = (text: string) => line('err', text);

// ---------- Nombres de comandos ----------

const ALIASES: Record<string, string> = {
  ayuda: 'help', help: 'help', '?': 'help',
  mercado: 'market', m: 'market', market: 'market', precios: 'market',
  precio: 'price', price: 'price',
  grafico: 'chart', gráfico: 'chart', chart: 'chart',
  comprar: 'buy', buy: 'buy', long: 'buy', largo: 'buy',
  vender: 'sell', sell: 'sell', short: 'sell', corto: 'sell',
  posiciones: 'positions', pos: 'positions', positions: 'positions',
  cerrar: 'close', close: 'close',
  cuenta: 'account', saldo: 'account', cartera: 'account', account: 'account',
  historial: 'history', hist: 'history', history: 'history',
  noticias: 'news', noticia: 'news', news: 'news',
  velocidad: 'speed', speed: 'speed',
  logros: 'achievements', achievements: 'achievements',
  nueva: 'reset', reset: 'reset',
  limpiar: 'clear', clear: 'clear', cls: 'clear',
  lluvia: 'rain', rain: 'rain',
  sonido: 'sound', sound: 'sound',
  salir: 'exit', exit: 'exit'
};

/** Nombres que se ofrecen al autocompletar con Tab. */
export const COMMAND_NAMES = ['ayuda', 'mercado', 'precio', 'grafico', 'comprar', 'vender', 'posiciones', 'cerrar', 'cuenta', 'historial', 'noticias', 'velocidad', 'logros', 'nueva', 'limpiar', 'lluvia', 'sonido', 'salir'];
export const ASSET_TICKERS = ASSETS.map((a) => a.ticker);

/** Activo por ticker, id o nombre corto (sin distinguir mayúsculas ni la barra de USD/COP). */
export function resolveAsset(token: string | undefined): AssetDef | null {
  if (!token) return null;
  const t = token.toLowerCase().replace('/', '');
  return ASSETS.find((a) => a.id === t || a.ticker.toLowerCase().replace('/', '') === t) ?? null;
}

// ---------- Descripciones reutilizables ----------

export function describeTrade(t: Trade): string {
  const d = ASSETS.find((a) => a.id === t.asset)!;
  const why = { manual: 'CERRADA', sl: 'STOP-LOSS', tp: 'TAKE-PROFIT', liq: 'LIQUIDADA' }[t.reason];
  return `${why} ${d.ticker} ${t.side === 'long' ? 'largo' : 'corto'} x${t.lev} · ${money(t.pnl, true)} (${pctText(t.pct)})`;
}

export function describeNews(n: News): string {
  const d = ASSETS.find((a) => a.id === n.asset)!;
  return `[NOTICIA] ${d.ticker}: ${n.text}`;
}

/** Líneas de aviso para los logros recién desbloqueados. */
export function achievementLines(acct: Account, market: Market): Line[] {
  return checkTraderAchievements(acct, equity(acct, market)).map((a) => line('ok', `[LOGRO] ${a.name} — ${a.desc}`));
}

const closes = (st: Market['assets'][string]) => [...st.candles.map((c) => c.c), st.price];

// ---------- Ejecución ----------

export function runCommand(env: Env, input: string): Result {
  const raw = input.trim();
  if (!raw) return { lines: [] };
  const [head, ...args] = raw.split(/\s+/);
  const cmd = ALIASES[head.toLowerCase()];
  if (!cmd) {
    return { lines: [err(`comando no reconocido: ${head}`), line('dim', "escribe 'ayuda' para ver los comandos")] };
  }
  switch (cmd) {
    case 'help':
      return { lines: help() };
    case 'market':
      return { lines: marketTable(env) };
    case 'price':
      return { lines: price(env, args) };
    case 'chart':
      return { lines: chart(env, args) };
    case 'buy':
      return trade(env, 'long', args);
    case 'sell':
      return trade(env, 'short', args);
    case 'positions':
      return { lines: positions(env) };
    case 'close':
      return closeCmd(env, args);
    case 'account':
      return { lines: account(env) };
    case 'history':
      return { lines: history(env) };
    case 'news':
      return { lines: [out(env.market.news ? describeNews(env.market.news) : 'Sin noticias por ahora.')] };
    case 'speed':
      return speedCmd(env, args);
    case 'achievements':
      return { lines: achievements(env) };
    case 'reset':
      return resetCmd(env, args);
    case 'clear':
      return { lines: [], action: 'clear' };
    case 'rain':
      return onOff(args, 'rain', 'Lluvia de código');
    case 'sound':
      return onOff(args, 'sound', 'Sonido');
    case 'exit':
      return { lines: [line('dim', 'volviendo a la Mesa…')], action: 'exit' };
  }
  return { lines: [] };
}

function onOff(args: string[], what: 'rain' | 'sound', label: string): Result {
  const v = (args[0] ?? '').toLowerCase();
  if (v !== 'on' && v !== 'off') return { lines: [err(`uso: ${what === 'rain' ? 'lluvia' : 'sonido'} on|off`)] };
  return { lines: [line('ok', `${label}: ${v === 'on' ? 'activada' : 'desactivada'}`)], action: `${what}-${v}` as Action };
}

// ---------- Ayuda ----------

function help(): Line[] {
  const rows: [string, string][] = [
    ['mercado', 'precios de todos los activos (alias: m)'],
    ['precio <activo>', 'precio y rango reciente'],
    ['grafico <activo>', 'gráfico ASCII de las últimas velas'],
    ['comprar <activo> <monto> [xN] [sl=%] [tp=%]', 'abre una posición larga (sube)'],
    ['vender <activo> <monto> [xN] [sl=%] [tp=%]', 'abre una posición corta (baja)'],
    ['posiciones', 'tus posiciones abiertas (alias: pos)'],
    ['cerrar <id|activo|todo>', 'cierra posiciones'],
    ['cuenta', 'patrimonio, efectivo y rango'],
    ['historial', 'últimas operaciones cerradas'],
    ['noticias', 'la última noticia del mercado'],
    ['velocidad <0|1|3|10>', 'pausa o acelera el mercado'],
    ['logros', 'tus logros'],
    ['nueva', 'reinicia la cuenta con $10.000'],
    ['lluvia on|off · sonido on|off', 'efectos'],
    ['limpiar · salir', 'limpia la pantalla · vuelve a la Mesa']
  ];
  return [
    line('head', 'COMANDOS'),
    ...rows.map(([c, d]) => out(`  ${c.padEnd(44)} ${d}`)),
    out(),
    line('head', 'EJEMPLOS'),
    out('  comprar btc 25% x5 sl=2 tp=4     25 % de tu efectivo, apalancamiento x5, stop-loss 2 %, take-profit 4 %'),
    out('  vender eth $500 x2               $500 de margen en corto con x2'),
    out('  cerrar todo'),
    out(),
    line('dim', `Apalancamiento: ${LEVERAGES.map((l) => `x${l}`).join(' ')} · comisión ${(FEE * 100).toFixed(2).replace('.', ',')} % al abrir y al cerrar · se liquida al perder el ${LIQ_LOSS * 100} % del margen.`),
    line('dim', 'Todo es simulación con dinero virtual. No es asesoría financiera.')
  ];
}

// ---------- Mercado ----------

function marketTable(env: Env): Line[] {
  const rows = ASSETS.map((d) => {
    const st = env.market.assets[d.id];
    const ch = changePct(st);
    return tbl('out', `  ${d.ticker.padEnd(8)} ${fmtPrice(d, st.price).padStart(10)}  ${pctText(ch).padStart(7)}  ${sparkline(closes(st), 24)}`);
  });
  return [tbl('head', '  ACTIVO      PRECIO     CAMBIO  TENDENCIA'), ...rows];
}

function price(env: Env, args: string[]): Line[] {
  const d = resolveAsset(args[0]);
  if (!d) return [err(`uso: precio <activo>  (${ASSET_TICKERS.join(', ')})`)];
  const st = env.market.assets[d.id];
  const v = closes(st).slice(-60);
  return [
    out(`  ${d.ticker} · ${d.name}`),
    out(`  precio ${fmtPrice(d, st.price)}   cambio ${pctText(changePct(st))}`),
    out(`  mín ${fmtPrice(d, Math.min(...v))}   máx ${fmtPrice(d, Math.max(...v))}   (últimas ${v.length} velas)`)
  ];
}

function chart(env: Env, args: string[]): Line[] {
  const d = resolveAsset(args[0]);
  if (!d) return [err(`uso: grafico <activo>  (${ASSET_TICKERS.join(', ')})`)];
  const st = env.market.assets[d.id];
  return [line('head', `  ${d.ticker} · cierres de las últimas velas`), ...asciiChart(closes(st), d, 48, 8).map((t) => tbl('out', `  ${t}`)), line('dim', `  ahora ${fmtPrice(d, st.price)}`)];
}

// ---------- Operar ----------

const EXAMPLE = 'ejemplo: comprar btc 25% x5 sl=2 tp=4';

function parseNumber(s: string): number {
  return Number(s.replace(',', '.'));
}

function trade(env: Env, side: Side, args: string[]): Result {
  const verb = side === 'long' ? 'comprar' : 'vender';
  const d = resolveAsset(args[0]);
  if (!d) return { lines: [err(`activo desconocido: ${args[0] ?? '(falta)'}`), line('dim', `uso: ${verb} <activo> <monto|%> [xN] [sl=%] [tp=%] · activos: ${ASSET_TICKERS.join(', ')}`)] };

  let amount: { kind: 'pct' | 'abs'; value: number } | null = null;
  let lev = 1;
  let sl: number | null = null;
  let tp: number | null = null;

  for (const tok of args.slice(1)) {
    const t = tok.toLowerCase();
    let m: RegExpMatchArray | null;
    if ((m = t.match(/^(?:x(\d+)|(\d+)x|lev=(\d+))$/))) lev = Number(m[1] ?? m[2] ?? m[3]);
    else if ((m = t.match(/^sl=(\d+(?:[.,]\d+)?)%?$/))) sl = parseNumber(m[1]);
    else if ((m = t.match(/^tp=(\d+(?:[.,]\d+)?)%?$/))) tp = parseNumber(m[1]);
    else if ((m = t.match(/^(\d+(?:[.,]\d+)?)%$/))) amount = { kind: 'pct', value: parseNumber(m[1]) };
    else if ((m = t.match(/^\$?(\d+(?:[.,]\d+)?)$/))) amount = { kind: 'abs', value: parseNumber(m[1]) };
    else return { lines: [err(`no entiendo "${tok}"`), line('dim', EXAMPLE)] };
  }
  if (!amount) return { lines: [err('falta el monto (en $ o en % de tu efectivo)'), line('dim', EXAMPLE)] };
  if (!(LEVERAGES as readonly number[]).includes(lev)) return { lines: [err(`apalancamiento no válido: x${lev}`), line('dim', `opciones: ${LEVERAGES.map((l) => `x${l}`).join(' ')}`)] };
  if (amount.kind === 'pct' && (amount.value <= 0 || amount.value > 100)) return { lines: [err('el porcentaje debe estar entre 0 y 100')] };

  const cash = env.acct.cash;
  const margin =
    amount.kind === 'abs' ? amount.value : Math.floor((amount.value === 100 ? cash / (1 + lev * FEE) : (cash * amount.value) / 100) * 100) / 100;

  const res = openPosition(env.acct, env.market, { asset: d.id, side, margin, lev, slPct: sl, tpPct: tp });
  if (!res.ok) return { lines: [err(res.error)] };
  const p = res.position;
  const lines: Line[] = [
    line('ok', `OK #${p.id} ${side === 'long' ? '▲ LARGO' : '▼ CORTO'} ${d.ticker} x${p.lev} @ ${fmtPrice(d, p.entry)} · margen ${money(p.margin)} · exposición ${money(p.margin * p.lev)}`),
    line('dim', `   liquida a ${fmtPrice(d, liqPrice(p))}${p.sl !== null ? ` · SL ${fmtPrice(d, p.sl)}` : ''}${p.tp !== null ? ` · TP ${fmtPrice(d, p.tp)}` : ''}`)
  ];
  return { lines, sfx: 'buy', changed: true };
}

function positions(env: Env): Line[] {
  const list = env.acct.positions;
  if (list.length === 0) return [out('  Sin posiciones abiertas.')];
  const rows = list.map((p) => {
    const d = ASSETS.find((a) => a.id === p.asset)!;
    const now = env.market.assets[p.asset].price;
    const u = unrealized(p, now);
    const kind: LineKind = u > 0 ? 'ok' : u < 0 ? 'err' : 'out';
    return tbl(kind, `  ${('#' + p.id).padEnd(4)} ${p.side === 'long' ? '▲' : '▼'} ${d.ticker.padEnd(7)} x${String(p.lev).padEnd(2)} ${fmtPrice(d, p.entry).padStart(9)} → ${fmtPrice(d, now).padStart(9)}  ${money(u, true).padStart(11)} ${pctText((u / p.margin) * 100).padStart(8)}  liq ${fmtPrice(d, liqPrice(p))}`);
  });
  return [tbl('head', '  ID   LADO ACTIVO  LEV    ENTRADA        AHORA          P&L       %    LIQUIDACIÓN'), ...rows, line('dim', `  P&L abierto: ${money(openPnl(env.acct, env.market), true)} · ${list.length}/${MAX_POSITIONS} posiciones`)];
}

function closeCmd(env: Env, args: string[]): Result {
  const target = (args[0] ?? '').toLowerCase();
  if (!target) return { lines: [err('uso: cerrar <id|activo|todo>'), line('dim', 'ejemplo: cerrar 2 · cerrar btc · cerrar todo')] };
  const all = env.acct.positions;
  let chosen: typeof all;
  if (target === 'todo' || target === 'all') chosen = [...all];
  else if (/^#?\d+$/.test(target)) chosen = all.filter((p) => p.id === Number(target.replace('#', '')));
  else {
    const d = resolveAsset(target);
    chosen = d ? all.filter((p) => p.asset === d.id) : [];
  }
  if (chosen.length === 0) return { lines: [err(`no hay posiciones que coincidan con "${args[0]}"`)] };

  const lines: Line[] = [];
  let total = 0;
  for (const p of chosen) {
    const t = closePosition(env.acct, env.market, p.id, 'manual');
    if (!t) continue;
    total += t.pnl;
    lines.push(line(t.pnl > 0 ? 'ok' : t.pnl < 0 ? 'err' : 'out', describeTrade(t)));
  }
  if (lines.length > 1) lines.push(line('dim', `  resultado total: ${money(total, true)}`));
  lines.push(...achievementLines(env.acct, env.market));
  return { lines, sfx: total > 0 ? 'win' : 'lose', changed: true };
}

// ---------- Cuenta ----------

function account(env: Env): Line[] {
  const e = equity(env.acct, env.market);
  const rk = rankOf(e);
  return [
    out(`  Patrimonio   ${money(e)}`),
    out(`  Efectivo     ${money(env.acct.cash)}`),
    out(`  P&L abierto  ${money(openPnl(env.acct, env.market), true)}`),
    out(`  Rango        ${rk.name}${rk.next ? `  (siguiente: ${rk.next.name} en ${money(rk.next.min)})` : ''}`),
    out(`  Operaciones  ${env.acct.stats.trades} (${env.acct.stats.wins} ganadas) · liquidaciones ${env.acct.stats.liquidations}`),
    line('dim', `  Velocidad    ${env.getSpeed() === 0 ? 'en pausa' : `x${env.getSpeed()}`}`)
  ];
}

function history(env: Env): Line[] {
  const list = env.acct.history.slice(0, 10);
  if (list.length === 0) return [out('  Todavía no has cerrado operaciones.')];
  return list.map((t) => line(t.pnl > 0 ? 'ok' : t.pnl < 0 ? 'err' : 'out', `  ${describeTrade(t)}`));
}

function achievements(env: Env): Line[] {
  return [
    line('head', `  LOGROS ${env.acct.achievements.length}/${TRADER_ACHIEVEMENTS.length}`),
    ...TRADER_ACHIEVEMENTS.map((a) => {
      const done = env.acct.achievements.includes(a.id);
      return line(done ? 'ok' : 'dim', `  ${done ? '[x]' : '[ ]'} ${a.name.padEnd(22)} ${a.desc}`);
    })
  ];
}

function speedCmd(env: Env, args: string[]): Result {
  const n = Number(args[0]);
  if (![0, 1, 3, 10].includes(n) || args[0] === undefined) return { lines: [err('uso: velocidad <0|1|3|10>   (0 = pausa)')] };
  env.setSpeed(n);
  return { lines: [line('ok', n === 0 ? 'Mercado en pausa.' : `Velocidad x${n}.`)], changed: true };
}

function resetCmd(env: Env, args: string[]): Result {
  if ((args[0] ?? '').toLowerCase() !== 'si') {
    return { lines: [line('warn', 'Esto cierra tus posiciones y reinicia la cuenta con $10.000 virtuales (conservas los logros).'), line('warn', "Para confirmar escribe: nueva si")] };
  }
  resetAccount(env.acct);
  return { lines: [line('ok', 'Cuenta nueva: $10.000 virtuales. ¡Suerte!')], changed: true };
}
