// Interfaz de la terminal de trading: entrada, salida, monitor en vivo y bucle del mercado.
import { buzz, isSoundOn, play, setSound, unlock } from '../game/audio';
import { equity, openPnl, processTick, rankOf } from './account';
import { ASSET_TICKERS, COMMAND_NAMES, achievementLines, describeNews, describeTrade, runCommand, type Env, type Line, type Result } from './commands';
import { fmtPrice, money, pctText, sparkline } from './format';
import { Rain } from './matrix';
import { ASSETS, changePct, stepMarket } from './market';
import { loadSession, saveSession } from './store';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const PREFS_KEY = 'pagos-terminal:prefs';
const MAX_LINES = 500;

const session = loadSession();
const { market, acct } = session;
const env: Env = {
  market,
  acct,
  getSpeed: () => session.speed,
  setSpeed: (n) => {
    session.speed = n;
  }
};
const save = () => saveSession(session);

// ---------- Salida ----------

const out = $('out');
const CLASS: Record<Line['kind'], string> = { in: 'tm-in', out: 'tm-out-l', ok: 'tm-ok', err: 'tm-err', warn: 'tm-warn', dim: 'tm-dim', head: 'tm-head' };

function print(lines: Line[]) {
  if (lines.length === 0) return;
  // Solo se baja al final si la persona ya estaba abajo: no le movemos la pantalla si está leyendo.
  const atBottom = out.scrollHeight - out.scrollTop - out.clientHeight < 40;
  for (const l of lines) {
    const d = document.createElement('div');
    d.className = `tm-line ${CLASS[l.kind]}${l.nowrap ? ' tm-nowrap' : ''}`;
    d.textContent = l.text;
    out.appendChild(d);
  }
  while (out.childElementCount > MAX_LINES) out.firstElementChild?.remove();
  if (atBottom) out.scrollTop = out.scrollHeight;
}

// ---------- Efectos: lluvia y sonido ----------

const rain = new Rain($<HTMLCanvasElement>('rain'));
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const rainBtn = $<HTMLButtonElement>('rain-toggle');

function readRainPref(): boolean {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw !== null) return JSON.parse(raw).rain === true;
  } catch {
    /* sin preferencia guardada */
  }
  return !reduced; // por defecto activa, salvo que el dispositivo pida reducir movimiento
}

function setRain(on: boolean) {
  rain.setEnabled(on);
  rainBtn.setAttribute('aria-pressed', String(on));
  rainBtn.setAttribute('aria-label', `Lluvia de código: ${on ? 'activada' : 'desactivada'}`);
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ rain: on }));
  } catch {
    /* sin almacenamiento no se recuerda */
  }
}
rainBtn.addEventListener('click', () => setRain(!rain.enabled));

const soundBtn = $<HTMLButtonElement>('sound');
function paintSound() {
  const on = isSoundOn();
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.setAttribute('aria-label', `Sonido: ${on ? 'activado' : 'desactivado'}`);
}
soundBtn.addEventListener('click', () => {
  unlock();
  setSound(!isSoundOn());
  paintSound();
  play('buy');
});

// ---------- Ejecución de comandos ----------

const form = $<HTMLFormElement>('form');
const input = $<HTMLInputElement>('cmd');
const history: string[] = [];
let histPos = 0;

function apply(r: Result) {
  print(r.lines);
  switch (r.action) {
    case 'clear':
      out.replaceChildren();
      break;
    case 'exit':
      save();
      window.setTimeout(() => (location.href = '/trading'), 350);
      break;
    case 'rain-on':
      setRain(true);
      break;
    case 'rain-off':
      setRain(false);
      break;
    case 'sound-on':
      setSound(true);
      paintSound();
      break;
    case 'sound-off':
      setSound(false);
      paintSound();
      break;
  }
  if (r.sfx) {
    play(r.sfx);
    buzz(r.sfx === 'buy' ? 12 : 18);
  }
  if (r.changed) save();
  updateStatus();
}

function exec(raw: string) {
  const text = raw.trim();
  if (!text) return;
  unlock();
  print([{ kind: 'in', text: `trader@mesa:~$ ${text}` }]);
  if (history[history.length - 1] !== text) history.push(text);
  histPos = history.length;
  apply(runCommand(env, text));
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  exec(input.value);
  input.value = '';
});

/** Autocompleta con Tab: el comando (primera palabra) o el activo (segunda palabra). */
function complete() {
  const parts = input.value.split(/\s+/);
  const last = parts[parts.length - 1].toLowerCase();
  if (parts.length === 1) {
    const hits = COMMAND_NAMES.filter((c) => c.startsWith(last));
    if (hits.length === 1) input.value = `${hits[0]} `;
    else if (hits.length > 1) print([{ kind: 'dim', text: hits.join('  ') }]);
  } else if (parts.length === 2) {
    const hits = ASSET_TICKERS.filter((t) => t.toLowerCase().startsWith(last));
    if (hits.length === 1) input.value = `${parts[0]} ${hits[0]} `;
    else if (hits.length > 1) print([{ kind: 'dim', text: hits.join('  ') }]);
  }
}

input.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    complete();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (history.length) {
      histPos = Math.max(0, histPos - 1);
      input.value = history[histPos] ?? '';
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    histPos = Math.min(history.length, histPos + 1);
    input.value = history[histPos] ?? '';
  } else if (e.key === 'Escape') {
    input.value = '';
  } else if (e.key.toLowerCase() === 'l' && e.ctrlKey) {
    e.preventDefault();
    out.replaceChildren();
  }
});

document.querySelectorAll<HTMLButtonElement>('.tm-chips button').forEach((b) =>
  b.addEventListener('click', () => {
    if (b.dataset.cmd) exec(b.dataset.cmd);
    else if (b.dataset.fill) {
      input.value = b.dataset.fill;
      input.focus();
    }
  })
);

// ---------- Estado y monitor en vivo ----------

const statusEl = $('status');
const monitorEl = $('monitor');
const rows = ASSETS.map(() => {
  const r = document.createElement('span');
  r.className = 'tm-mrow';
  monitorEl.appendChild(r);
  return r;
});

function updateStatus() {
  const e = equity(acct, market);
  const pnl = openPnl(acct, market);
  const rk = rankOf(e);
  statusEl.replaceChildren();
  const add = (label: string, value: string) => {
    statusEl.append(`${label} `);
    const b = document.createElement('b');
    b.textContent = value;
    statusEl.append(b, '   ');
  };
  add('PATRIMONIO', money(e));
  add('P&L', money(pnl, true));
  add('EFECTIVO', money(acct.cash));
  add('MERCADO', session.speed === 0 ? 'pausa' : `x${session.speed}`);
  add('RANGO', rk.name);
}

function updateMonitor() {
  ASSETS.forEach((d, i) => {
    const st = market.assets[d.id];
    const ch = changePct(st);
    const closes = [...st.candles.map((c) => c.c), st.price];
    rows[i].textContent = `${d.ticker.padEnd(8)} ${fmtPrice(d, st.price).padStart(9)} ${pctText(ch).padStart(7)}  ${sparkline(closes, 26)}`;
    rows[i].className = `tm-mrow ${ch > 0.05 ? 'is-up' : ch < -0.05 ? 'is-down' : ''}`;
  });
}

// ---------- Bucle del mercado ----------

let lastNews = market.news;
let last = performance.now();
let acc = 0;
let uiAcc = 0;
let saveAcc = 0;

function step() {
  stepMarket(market);
  const closed = processTick(acct, market);
  if (closed.length) {
    const lines: Line[] = closed.map((t) => ({ kind: t.pnl > 0 ? 'ok' : t.pnl < 0 ? 'err' : 'out', text: `[AUTO] ${describeTrade(t)}` }));
    print([...lines, ...achievementLines(acct, market)]);
    play(closed.some((t) => t.pnl > 0) ? 'win' : 'lose');
    buzz(closed.some((t) => t.reason === 'liq') ? 45 : 18);
    save();
    updateStatus();
  }
  if (market.news && market.news !== lastNews) {
    lastNews = market.news;
    print([{ kind: 'warn', text: describeNews(market.news) }]);
  }
}

function frame(now: number) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (session.speed > 0) {
    acc += dt * session.speed;
    let n = 0;
    while (acc >= 1 && n < 40) {
      acc -= 1;
      n++;
      step();
    }
    if (acc > 1) acc = 1;
  }
  uiAcc += dt;
  saveAcc += dt;
  if (uiAcc >= 0.25) {
    uiAcc = 0;
    updateMonitor();
    updateStatus();
  }
  if (saveAcc >= 5) {
    saveAcc = 0;
    save();
  }
  requestAnimationFrame(frame);
}

// ---------- Arranque ----------

paintSound();
setRain(readRainPref());
print([
  { kind: 'head', text: '╔════════════════════════════════════════╗', nowrap: true },
  { kind: 'head', text: '║  MESA DE TRADING · TERMINAL v1.0       ║', nowrap: true },
  { kind: 'head', text: '║  simulación · dinero virtual           ║', nowrap: true },
  { kind: 'head', text: '╚════════════════════════════════════════╝', nowrap: true },
  { kind: 'dim', text: "Escribe 'ayuda' para ver los comandos. Tab autocompleta · ↑/↓ historial · Ctrl+L limpia." },
  { kind: 'dim', text: 'Ejemplo: comprar btc 25% x5 sl=2 tp=4' }
]);
updateMonitor();
updateStatus();
save(); // deja guardado el mercado actual para que la Mesa gráfica abra el mismo
requestAnimationFrame((t) => {
  last = t;
  frame(t);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
  else last = performance.now();
});
window.addEventListener('pagehide', save);
