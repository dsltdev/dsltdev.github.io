// Casino de fichas virtuales: billetera, control de edad, pausas, regalo diario y pestañas de juegos.
import { hasRewardedAds, showRewardedAd, track } from '../game/ads';
import { isSoundOn, play, setSound, unlock } from '../game/audio';
import { MONETIZATION } from '../game/config';
import { mountBlackjack } from './ui-blackjack';
import { mountRoulette } from './ui-roulette';
import { mountSlots } from './ui-slots';
import { exactStats } from './slots';
import { money, type GameModule, type Shell } from './shell';
import * as W from './wallet';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const root = document.querySelector<HTMLElement>('.cs')!;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const SESSION_REMINDER_MS = 30 * 60_000;

// ---------- Guardado ----------

function load(): W.Wallet {
  try {
    return W.deserialize(localStorage.getItem(W.SAVE_KEY));
  } catch {
    return W.newWallet();
  }
}
const wallet = load();

function save() {
  try {
    localStorage.setItem(W.SAVE_KEY, W.serialize(wallet));
  } catch {
    /* sin almacenamiento se juega sin guardar */
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
  window.setTimeout(nextToast, 2800);
}
function toast(msg: string) {
  toastQueue.push(msg);
  if (toastQueue.length > 3) toastQueue.shift();
  if (!toastBusy) nextToast();
}

// ---------- Estado de la interfaz ----------

let busy = false;
let activeTab = 'slots';
const games: Record<string, GameModule | undefined> = {};

const shell: Shell = {
  wallet,
  commit() {
    save();
    updateHud();
    updateBroke();
  },
  toast,
  setBusy(b) {
    busy = b;
    document.querySelectorAll<HTMLButtonElement>('.cs-tabs button').forEach((t) => t.setAttribute('aria-disabled', String(b && t.dataset.tab !== activeTab)));
    updateBroke();
  },
  reduced,
  track
};

// ---------- HUD ----------

const chipsEl = $('chips');
const levelEl = $('level');
const levelBar = $('level-bar');
const levelNext = $('level-next');
const dailyBtn = $<HTMLButtonElement>('daily');

function updateHud() {
  chipsEl.textContent = money(wallet.chips);
  const lv = W.levelOf(wallet);
  const nx = W.nextLevel(wallet);
  levelEl.textContent = lv.name;
  const pct = nx ? ((wallet.wagered - lv.min) / (nx.min - lv.min)) * 100 : 100;
  levelBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  levelNext.textContent = nx ? `${money(nx.min - wallet.wagered)} para ${nx.name}` : 'Nivel máximo';
  const can = W.canClaimDaily(wallet);
  dailyBtn.disabled = !can;
  dailyBtn.textContent = can ? '🎁 Regalo del día' : '🎁 Vuelve mañana';
  root.dataset.theme = wallet.theme;
  if (activeTab === 'info') updateInfo();
}

function claimDaily() {
  const gift = W.claimDaily(wallet);
  if (gift === 0) return;
  play('achievement');
  toast(`🎁 +${money(gift)} fichas${wallet.dailyStreak > 0 ? ` (racha de ${wallet.dailyStreak + 1} días)` : ''}`);
  shell.commit();
}
dailyBtn.addEventListener('click', () => {
  unlock();
  claimDaily();
});

// ---------- Quiebra ----------

const brokeCard = $('broke');
const brokeAd = $<HTMLButtonElement>('broke-ad');
const brokeDaily = $<HTMLButtonElement>('broke-daily');

function updateBroke() {
  const min = games[activeTab]?.minBet ?? 10;
  const broke = !busy && W.isBroke(wallet, min);
  brokeCard.hidden = !broke;
  if (!broke) return;
  brokeAd.hidden = !hasRewardedAds(MONETIZATION.casinoAds);
  brokeDaily.hidden = !W.canClaimDaily(wallet);
}

const adDialog = $<HTMLDialogElement>('ad-dialog');
brokeAd.addEventListener('click', async () => {
  brokeAd.disabled = true;
  track('rewarded_ad_start', { where: 'casino' });
  const result = await showRewardedAd(adDialog, MONETIZATION.casinoAds);
  brokeAd.disabled = false;
  if (result === 'viewed') {
    W.refill(wallet);
    toast(`+${money(W.REFILL_CHIPS)} fichas`);
    play('achievement');
    shell.commit();
  } else if (result === 'unavailable') toast('No hay anuncios disponibles ahora. Prueba de nuevo en un minuto.');
});
brokeDaily.addEventListener('click', claimDaily);
$('broke-reset').addEventListener('click', () => {
  W.resetChips(wallet);
  toast(`Fichas reiniciadas a ${money(W.START_CHIPS)}.`);
  shell.commit();
});

// ---------- Pestañas ----------

const tabs = [...document.querySelectorAll<HTMLButtonElement>('.cs-tabs button')];
function selectTab(tab: HTMLButtonElement) {
  if (busy && tab.dataset.tab !== activeTab) {
    toast('Termina la jugada antes de cambiar de juego.');
    return;
  }
  activeTab = tab.dataset.tab!;
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    $(`panel-${t.dataset.tab}`).hidden = !on;
  }
  games[activeTab]?.onShow();
  if (activeTab === 'info') updateInfo();
  updateBroke();
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

// ---------- Mi cuenta ----------

const themeSel = $<HTMLSelectElement>('theme');
function updateInfo() {
  $('st-spins').textContent = money(wallet.spins);
  $('st-hands').textContent = money(wallet.hands);
  $('st-rounds').textContent = money(wallet.rounds);
  $('st-wagered').textContent = money(wallet.wagered);
  $('st-big').textContent = money(wallet.biggestWin);
  const idx = W.levelIndex(wallet);
  document.querySelectorAll<HTMLElement>('.cs-levels li').forEach((li, i) => li.classList.toggle('is-on', i <= idx));
  const themes = W.unlockedThemes(wallet);
  if (themeSel.options.length !== themes.length) {
    themeSel.replaceChildren(...themes.map((t) => new Option(t[0].toUpperCase() + t.slice(1), t)));
  }
  themeSel.value = wallet.theme;
}
themeSel.addEventListener('change', () => {
  if (W.unlockedThemes(wallet).includes(themeSel.value)) wallet.theme = themeSel.value;
  shell.commit();
});
$('rtp-slots').textContent = `${(exactStats().rtp * 100).toFixed(2).replace('.', ',')} %`;

// ---------- Edad y pausas ----------

const ageDialog = $<HTMLDialogElement>('age-dialog');
const breakDialog = $<HTMLDialogElement>('break-dialog');
const breakLeftEl = $('break-left');
const lock = (d: HTMLDialogElement) => d.addEventListener('cancel', (e) => e.preventDefault()); // Esc no los cierra
lock(ageDialog);
lock(breakDialog);

$('age-yes').addEventListener('click', () => {
  wallet.adultAt = Date.now();
  save();
  ageDialog.close();
  track('casino_open');
});

function fmtLeft(ms: number) {
  const s = Math.ceil(ms / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return hh > 0 ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`;
}

let breakTimer = 0;
function checkBreak() {
  const left = W.breakLeft(wallet);
  if (left > 0) {
    if (!breakDialog.open) {
      if (ageDialog.open) ageDialog.close();
      breakDialog.showModal();
    }
    breakLeftEl.textContent = fmtLeft(left);
    if (!breakTimer) breakTimer = window.setInterval(checkBreak, 1000);
    return true;
  }
  if (breakDialog.open) breakDialog.close();
  clearInterval(breakTimer);
  breakTimer = 0;
  return false;
}

document.querySelectorAll<HTMLButtonElement>('[data-break]').forEach((b) =>
  b.addEventListener('click', () => {
    if (busy) {
      toast('Termina la jugada antes de tomar una pausa.');
      return;
    }
    W.startBreak(wallet, Number(b.dataset.break));
    save();
    track('casino_break', { minutes: Number(b.dataset.break) });
    checkBreak();
  })
);

// ---------- Sonido ----------

const soundBtn = $<HTMLButtonElement>('sound');
function paintSound() {
  const on = isSoundOn();
  soundBtn.textContent = on ? '🔊' : '🔇';
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.setAttribute('aria-label', `Sonido y vibración: ${on ? 'activados' : 'desactivados'}`);
}
soundBtn.addEventListener('click', () => {
  unlock();
  setSound(!isSoundOn());
  paintSound();
  play('chip');
});
document.addEventListener('pointerdown', unlock, { once: true });

// ---------- Sesión ----------

const sessionEl = $('session');
const started = Date.now();
let reminders = 0;
setInterval(() => {
  const ms = Date.now() - started;
  const mm = Math.floor(ms / 60000);
  sessionEl.textContent = `${Math.floor(mm / 60) > 0 ? `${Math.floor(mm / 60)} h ` : ''}${mm % 60} min`;
  const due = Math.floor(ms / SESSION_REMINDER_MS);
  if (due > reminders) {
    reminders = due;
    toast(`Llevas ${due * 30} minutos jugando. Es buen momento para una pausa.`);
  }
}, 15_000);
sessionEl.textContent = '0 min';

// ---------- Arranque ----------

games.slots = mountSlots($('panel-slots'), shell);
games.blackjack = mountBlackjack($('panel-blackjack'), shell);
games.roulette = mountRoulette($('panel-roulette'), shell);
paintSound();
updateHud();
updateBroke();

if (!checkBreak() && wallet.adultAt === null) ageDialog.showModal();
else track('casino_open');

document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
  else checkBreak();
});
window.addEventListener('pagehide', save);
setInterval(save, 15_000);
