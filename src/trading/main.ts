// Cableado de la Mesa de trading: bucle del mercado, órdenes, posiciones, historial y logros.
import { hasRewardedAds, initAds, showRewardedAd, track } from '../game/ads';
import { buzz, isSoundOn, play, setSound, unlock } from '../game/audio';
import { fmt } from '../game/logic';
import {
  FEE,
  LIQ_LOSS,
  MIN_MARGIN,
  MAX_POSITIONS,
  RECHARGE,
  START_CASH,
  TRADER_ACHIEVEMENTS,
  canRecharge,
  checkTraderAchievements,
  closePosition,
  deserializeAccount,
  equity,
  liqPrice,
  newAccount,
  openPnl,
  openPosition,
  processTick,
  rankOf,
  recharge,
  resetAccount,
  unrealized,
  type CloseReason,
  type Side,
  type Trade
} from './account';
import { Chart, fmtPrice } from './chart';
import { ASSETS, changePct, deserializeMarket, newMarket, stepMarket, type AssetDef } from './market';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const SAVE_KEY = 'pagos-trader:v1';
const SPEEDS = [0, 1, 3, 10];

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

const defOf = (id: string) => ASSETS.find((a) => a.id === id)!;

// ---------- Formato ----------

const nf = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function money(n: number, signed = false): string {
  const abs = Math.abs(n);
  if (abs < 0.005) return '$0,00';
  const body = abs >= 1e6 ? fmt(abs) : nf.format(abs);
  return `${n < 0 ? '-' : signed ? '+' : ''}$${body}`;
}
const pctText = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1).replace('.', ',')}%`;
const cls = (n: number) => (n > 0.004 ? 'is-up' : n < -0.004 ? 'is-down' : '');

// ---------- Estado y guardado ----------

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      const m = deserializeMarket(d.market);
      const a = deserializeAccount(d.acct);
      if (m && a) {
        return {
          m,
          a,
          selected: ASSETS.some((x) => x.id === d.selected) ? (d.selected as string) : 'btc',
          speed: SPEEDS.includes(d.speed) ? (d.speed as number) : 1
        };
      }
    }
  } catch {
    /* sin guardado válido: empieza de cero */
  }
  return { m: newMarket(), a: newAccount(), selected: 'btc', speed: 1 };
}

const loaded = load();
const market = loaded.m;
const acct = loaded.a;
let selected = loaded.selected;
let speed = loaded.speed;
let side: Side = 'long';
let pct = 25;
let lev = 1;

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ market, acct, selected, speed }));
  } catch {
    /* sin almacenamiento no se guarda */
  }
}

// ---------- Avisos en cola ----------

const toastEl = $('toast');
const toastQueue: string[] = [];
let toastBusy = false;
function nextToast() {
  const msg = toastQueue.shift();
  if (!msg) {
    toastBusy = false;
    toastEl.classList.remove('is-on');
    return;
  }
  toastBusy = true;
  toastEl.textContent = msg;
  toastEl.classList.add('is-on');
  window.setTimeout(nextToast, 2600);
}
function toast(msg: string) {
  toastQueue.push(msg);
  if (toastQueue.length > 3) toastQueue.shift();
  if (!toastBusy) nextToast();
}

// ---------- Gráfico y selección de activo ----------

const chart = new Chart($<HTMLCanvasElement>('chart'));
const assetBtns = [...document.querySelectorAll<HTMLButtonElement>('[data-asset]')];

function selectAsset(id: string) {
  selected = id;
  for (const b of assetBtns) b.setAttribute('aria-selected', String(b.dataset.asset === id));
  const def = defOf(id);
  $('order-asset').textContent = def.ticker;
  $('chart').setAttribute('aria-label', `Gráfico de velas de ${def.name} (precio simulado)`);
  updateUi();
  save();
}
assetBtns.forEach((b) => b.addEventListener('click', () => selectAsset(b.dataset.asset!)));

// ---------- Velocidad ----------

const speedBtns = [...document.querySelectorAll<HTMLButtonElement>('[data-speed]')];
function paintSpeed() {
  for (const b of speedBtns) b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === speed));
}
speedBtns.forEach((b) =>
  b.addEventListener('click', () => {
    speed = Number(b.dataset.speed);
    paintSpeed();
    save();
  })
);

// ---------- Orden ----------

const pressGroup = (selector: string, onPick: (el: HTMLButtonElement) => void) => {
  const btns = [...document.querySelectorAll<HTMLButtonElement>(selector)];
  btns.forEach((b) =>
    b.addEventListener('click', () => {
      btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      onPick(b);
      errorEl.textContent = '';
      updateUi();
    })
  );
};
pressGroup('[data-side]', (b) => (side = b.dataset.side as Side));
pressGroup('[data-pct]', (b) => (pct = Number(b.dataset.pct)));
pressGroup('[data-lev]', (b) => (lev = Number(b.dataset.lev)));

const slInput = $<HTMLInputElement>('sl');
const tpInput = $<HTMLInputElement>('tp');
const clearError = () => {
  errorEl.textContent = '';
  updateUi();
};
slInput.addEventListener('input', clearError);
tpInput.addEventListener('input', clearError);

const parseOpt = (el: HTMLInputElement): number | null => {
  const v = el.value.trim().replace(',', '.');
  return v === '' ? null : Number(v);
};

/** Margen según el porcentaje elegido; al usar el 100 % se deja lugar para la comisión. */
function plannedMargin(): number {
  const raw = pct === 100 ? acct.cash / (1 + lev * FEE) : (acct.cash * pct) / 100;
  return Math.floor(raw * 100) / 100;
}

const previewEl = $('preview');
const errorEl = $('order-error');
const openBtn = $<HTMLButtonElement>('open');

function updatePreview() {
  const def = defOf(selected);
  const price = market.assets[selected].price;
  const margin = plannedMargin();
  const dir = side === 'long' ? 1 : -1;
  const exposure = margin * lev;
  const liq = price * (1 - (dir * LIQ_LOSS) / lev);
  const full = acct.positions.length >= MAX_POSITIONS;
  const tooSmall = margin < MIN_MARGIN;
  openBtn.disabled = full || tooSmall;

  previewEl.replaceChildren();
  if (full) {
    previewEl.textContent = `Ya tienes ${MAX_POSITIONS} posiciones abiertas. Cierra alguna para abrir otra.`;
    return;
  }
  if (tooSmall) {
    previewEl.textContent = `Con este efectivo el margen queda por debajo de ${money(MIN_MARGIN)}.`;
    return;
  }
  const line = (label: string, value: string) => {
    const b = h('b', '', value);
    previewEl.append(`${label} `, b, h('br'));
  };
  line('Margen', money(margin));
  line(`Exposición (x${lev})`, money(exposure));
  line('Comisión', money(exposure * FEE));
  line('Se liquida a', fmtPrice(def, liq));
}

openBtn.addEventListener('click', () => {
  unlock();
  const margin = plannedMargin();
  const res = openPosition(acct, market, { asset: selected, side, margin, lev, slPct: parseOpt(slInput), tpPct: parseOpt(tpInput) });
  if (!res.ok) {
    errorEl.textContent = res.error;
    return;
  }
  errorEl.textContent = '';
  const p = res.position;
  play('buy');
  buzz(12);
  toast(`${side === 'long' ? '▲ Compra' : '▼ Venta en corto'} ${defOf(p.asset).ticker} x${p.lev} a ${fmtPrice(defOf(p.asset), p.entry)}`);
  track('trade_open', { side, lev });
  save();
  updateUi();
});

// ---------- Cierres ----------

const REASONS: Record<CloseReason, string> = { manual: 'Cerrada', sl: 'Stop-loss', tp: 'Take-profit', liq: 'LIQUIDADA' };

function onClosed(trades: Trade[]) {
  for (const t of trades) {
    const d = defOf(t.asset);
    toast(`${REASONS[t.reason]} · ${d.ticker} ${t.side === 'long' ? 'largo' : 'corto'} x${t.lev}: ${money(t.pnl, true)}`);
    play(t.pnl > 0 ? 'win' : 'lose');
    buzz(t.reason === 'liq' ? 45 : 15);
    track('trade_close', { reason: t.reason, win: t.pnl > 0 ? 1 : 0 });
  }
  checkAch();
  save();
  updateUi();
}

function checkAch() {
  const fresh = checkTraderAchievements(acct, equity(acct, market));
  if (fresh.length === 0) return;
  toast(`🏆 Logro: ${fresh.map((a) => a.name).join(', ')}`);
  play('achievement');
}

// ---------- Posiciones ----------

const positionsEl = $('positions');
const posRows = new Map<number, { pnl: HTMLElement; meta: HTMLElement }>();
let posSig = '';

function updatePositions() {
  const sig = acct.positions.map((p) => p.id).join(',');
  $('positions-empty').hidden = acct.positions.length > 0;
  const pill = $('pos-count');
  pill.hidden = acct.positions.length === 0;
  pill.textContent = String(acct.positions.length);

  if (sig !== posSig) {
    posSig = sig;
    posRows.clear();
    positionsEl.replaceChildren();
    for (const p of acct.positions) {
      const d = defOf(p.asset);
      const row = h('div', 'pt-pos');
      const head = h('span', 'pt-pos-head', d.ticker);
      head.append(h('span', `pt-tag${p.side === 'short' ? ' pt-tag--short' : ''}`, `${p.side === 'long' ? 'LARGO' : 'CORTO'} x${p.lev}`));
      const pnl = h('span', 'pt-pos-pnl');
      const meta = h('span', 'pt-pos-meta');
      const close = h('button', 'btn btn-secondary', 'Cerrar posición');
      close.type = 'button';
      close.addEventListener('click', () => {
        unlock();
        const t = closePosition(acct, market, p.id, 'manual');
        if (t) onClosed([t]);
      });
      row.append(head, pnl, meta, close);
      positionsEl.appendChild(row);
      posRows.set(p.id, { pnl, meta });
    }
  }

  for (const p of acct.positions) {
    const r = posRows.get(p.id);
    if (!r) continue;
    const d = defOf(p.asset);
    const price = market.assets[p.asset].price;
    const u = unrealized(p, price);
    r.pnl.textContent = `${money(u, true)} (${pctText((u / p.margin) * 100)})`;
    r.pnl.className = `pt-pos-pnl ${cls(u)}`;
    const extra = [p.sl !== null ? `SL ${fmtPrice(d, p.sl)}` : '', p.tp !== null ? `TP ${fmtPrice(d, p.tp)}` : ''].filter(Boolean).join(' · ');
    r.meta.textContent = `Entrada ${fmtPrice(d, p.entry)} → ahora ${fmtPrice(d, price)} · margen ${money(p.margin)} · liquida a ${fmtPrice(d, liqPrice(p))}${extra ? ` · ${extra}` : ''}`;
  }
}

// ---------- Historial, estadísticas y logros ----------

const historyEl = $('history');
let histSig = '';
function updateHistory() {
  const sig = `${acct.stats.trades}:${acct.history[0]?.tick ?? 0}`;
  $('history-empty').hidden = acct.history.length > 0;
  if (sig === histSig) return;
  histSig = sig;
  historyEl.replaceChildren();
  for (const t of acct.history.slice(0, 15)) {
    const d = defOf(t.asset);
    const row = h('div', 'pt-trade');
    row.append(h('span', '', `${d.ticker} · ${t.side === 'long' ? 'largo' : 'corto'} x${t.lev} · ${REASONS[t.reason]}`), h('span', cls(t.pnl), `${money(t.pnl, true)} (${pctText(t.pct)})`));
    historyEl.appendChild(row);
  }
}

const achEl = $('achievements');
const achRows = new Map<string, HTMLElement>();
for (const a of TRADER_ACHIEVEMENTS) {
  const li = h('li');
  li.append(h('strong', '', a.name), h('span', '', a.desc));
  achEl.appendChild(li);
  achRows.set(a.id, li);
}

function updateStats() {
  const s = acct.stats;
  $('st-trades').textContent = String(s.trades);
  $('st-win').textContent = s.trades ? `${Math.round((s.wins / s.trades) * 100)}% (${s.wins}/${s.trades})` : '—';
  $('st-best').textContent = s.trades ? money(s.best, true) : '—';
  $('st-worst').textContent = s.trades ? money(s.worst, true) : '—';
  $('st-peak').textContent = money(s.peak);
  $('st-liq').textContent = String(s.liquidations);
  for (const a of TRADER_ACHIEVEMENTS) achRows.get(a.id)!.classList.toggle('is-done', acct.achievements.includes(a.id));
  $('ach-count').textContent = `${acct.achievements.length}/${TRADER_ACHIEVEMENTS.length}`;
}

// ---------- Cuenta nueva y recarga ----------

function newAccountFlow() {
  if (!confirm(`Esto reinicia tu cuenta con ${money(START_CASH)} y cierra tus posiciones. ¿Seguro?`)) return;
  resetAccount(acct);
  track('trading_new_account');
  histSig = '';
  save();
  updateUi();
  toast(`Cuenta nueva: ${money(START_CASH)} virtuales. ¡Suerte!`);
}
$('new-account').addEventListener('click', newAccountFlow);
$('new-account-broke').addEventListener('click', newAccountFlow);

const adDialog = $<HTMLDialogElement>('ad-dialog');
const rechargeBtn = $<HTMLButtonElement>('recharge');
rechargeBtn.addEventListener('click', async () => {
  rechargeBtn.disabled = true;
  track('rewarded_ad_start', { where: 'trading' });
  const result = await showRewardedAd(adDialog);
  rechargeBtn.disabled = false;
  if (result === 'viewed') {
    if (recharge(acct, market)) {
      toast(`+${money(RECHARGE)} de capital virtual`);
      play('achievement');
      track('trading_recharge');
      save();
      updateUi();
    }
  } else if (result === 'unavailable') {
    toast('No hay anuncios disponibles ahora. Prueba de nuevo en un minuto.');
  }
});

// ---------- Pestañas ----------

const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role=tab][data-tab]')];
function selectTab(tab: HTMLButtonElement) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    $(`panel-${t.dataset.tab}`).hidden = !on;
  }
  updateUi();
}
tabs.forEach((t, i) => {
  t.tabIndex = i === 0 ? 0 : -1;
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    const next = tabs[(i + d + tabs.length) % tabs.length];
    next.focus();
    selectTab(next);
  });
});
const activeTab = () => tabs.find((t) => t.getAttribute('aria-selected') === 'true')?.dataset.tab;

// ---------- Noticias ----------

const newsEl = $('news');
let lastNews = market.news;
let freshUntil = 0;
function showNews() {
  const n = market.news;
  if (!n) return;
  newsEl.textContent = `📰 ${defOf(n.asset).ticker}: ${n.text}`;
  if (n !== lastNews) {
    lastNews = n;
    freshUntil = performance.now() + 9000;
    play('spawn');
  }
}

// ---------- Interfaz ----------

const equityEl = $('equity');
const pnlEl = $('open-pnl');
const cashEl = $('cash');
const rankEl = $('rank');
const rankNextEl = $('rank-next');

function updateUi() {
  const e = equity(acct, market);
  equityEl.textContent = money(e);
  equityEl.className = `pt-big ${cls(e - START_CASH)}`;
  const pnl = openPnl(acct, market);
  pnlEl.textContent = money(pnl, true);
  pnlEl.className = `pt-mid ${cls(pnl)}`;
  cashEl.textContent = money(acct.cash);
  const rk = rankOf(e);
  rankEl.textContent = rk.name;
  rankNextEl.textContent = rk.next ? `Siguiente: ${rk.next.name} (${money(rk.next.min)})` : 'Rango máximo';

  for (const def of ASSETS) {
    const st = market.assets[def.id];
    const ch = changePct(st);
    const priceEl = document.querySelector<HTMLElement>(`[data-price="${def.id}"]`);
    const chgEl = document.querySelector<HTMLElement>(`[data-chg="${def.id}"]`);
    if (priceEl) priceEl.textContent = fmtPrice(def, st.price);
    if (chgEl) {
      chgEl.textContent = pctText(ch);
      chgEl.className = `pt-asset-c ${cls(ch)}`;
    }
  }

  showNews();
  newsEl.classList.toggle('is-fresh', performance.now() < freshUntil);

  const broke = canRecharge(acct, market);
  $('broke-card').hidden = !broke;
  rechargeBtn.hidden = !hasRewardedAds();

  updatePreview();
  updatePositions();
  const tab = activeTab();
  if (tab === 'history') updateHistory();
  if (tab === 'stats') updateStats();
}

// ---------- Bucle ----------

let last = performance.now();
let acc = 0;
let uiAcc = 0;
let saveAcc = 0;

function step() {
  stepMarket(market);
  const closed = processTick(acct, market);
  if (closed.length) onClosed(closed);
}

function frame(now: number) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (speed > 0) {
    acc += dt * speed;
    let n = 0;
    while (acc >= 1 && n < 40) {
      acc -= 1;
      n++;
      step();
    }
    if (acc > 1) acc = 1;
  }
  const def: AssetDef = defOf(selected);
  chart.draw(def, market.assets[selected], acct.positions);
  uiAcc += dt;
  saveAcc += dt;
  if (uiAcc >= 0.2) {
    uiAcc = 0;
    updateUi();
  }
  if (saveAcc >= 5) {
    saveAcc = 0;
    save();
  }
  requestAnimationFrame(frame);
}

// ---------- Sonido ----------

const soundBtn = $<HTMLButtonElement>('sound');
function paintSound() {
  const on = isSoundOn();
  soundBtn.textContent = on ? '🔊' : '🔇';
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.setAttribute('aria-label', `Sonido y vibración: ${on ? 'activados' : 'desactivados'}`);
}
soundBtn.addEventListener('click', () => {
  setSound(!isSoundOn());
  paintSound();
  play('buy');
});
document.addEventListener('pointerdown', unlock, { once: true });

// ---------- Arranque ----------

paintSound();
paintSpeed();
initAds();
selectAsset(selected);
checkAch();
requestAnimationFrame((t) => {
  last = t;
  frame(t);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
  else last = performance.now();
});
window.addEventListener('pagehide', save);
