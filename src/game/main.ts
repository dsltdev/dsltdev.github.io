// Cableado del juego: estado, bucle, panel de compras y monetización.
import { hasRewardedAds, initAds, mountBanner, showRewardedAd, track } from './ads';
import { GENERATORS, LICENSE_BONUS, MONETIZATION, SAVE_KEY, UPGRADES, type GeneratorDef } from './config';
import {
  addBoost,
  applyOffline,
  buyGenerator,
  buyUpgrade,
  bulkCost,
  click,
  clickPower,
  cps,
  deserialize,
  fmt,
  fmtTime,
  maxAffordable,
  newState,
  ownedOf,
  pendingLicenses,
  prestige,
  redeem,
  serialize,
  tick,
  unitCps,
  visibleUpgrades
} from './logic';
import { Scene } from './render';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

// ---------- Estado y guardado ----------

let state = deserialize(safeGet());

function safeGet(): string | null {
  try {
    return localStorage.getItem(SAVE_KEY);
  } catch {
    return null; // modo privado o almacenamiento bloqueado: se juega sin guardar
  }
}

function save() {
  try {
    state.savedAt = Date.now();
    localStorage.setItem(SAVE_KEY, serialize(state));
  } catch {
    /* sin almacenamiento no se guarda */
  }
}

// ---------- Avisos ----------

const toastEl = $('toast');
let toastTimer = 0;
function toast(msg: string) {
  toastEl.textContent = msg;
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('is-on'), 3500);
}

function welcomeBack() {
  const off = applyOffline(state);
  if (off.gained > 0) toast(`Mientras no estabas (${fmtTime(off.seconds)}): +${fmt(off.gained)}`);
}

// ---------- Escena ----------

const canvas = $<HTMLCanvasElement>('scene');
const scene = new Scene(canvas, () => state);

function doClick(px: number, py: number) {
  const gain = click(state);
  scene.onClick(px, py, `+${fmt(gain)}`);
}

canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  if (scene.hitCoin(x, y)) {
    e.preventDefault();
    doClick(x, y);
  }
});
canvas.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  if (e.repeat) return;
  const c = scene.coinCenter();
  doClick(c.x, c.y);
});

// ---------- Negocios ----------

let amount: number | 'max' = 1;
const gensEl = $('gens');
const genRows = new Map<string, { btn: HTMLButtonElement; count: HTMLElement; each: HTMLElement; cost: HTMLElement }>();

for (const g of GENERATORS) {
  const btn = h('button', 'pi-item');
  btn.type = 'button';
  const name = h('span', 'pi-item-name', g.name);
  const desc = h('span', 'pi-item-desc', g.desc);
  const box = h('span', 'pi-item-count');
  const count = h('b');
  const each = h('small');
  box.append(count, each);
  const cost = h('span', 'pi-item-cost');
  btn.append(name, box, desc, cost);
  btn.addEventListener('click', () => {
    const n = amount === 'max' ? maxAffordable(g, ownedOf(state, g.id), state.coins) : amount;
    if (n > 0 && buyGenerator(state, g.id, n)) updatePanels();
  });
  gensEl.appendChild(btn);
  genRows.set(g.id, { btn, count, each, cost });
}

document.querySelectorAll<HTMLButtonElement>('[data-amount]').forEach((b) => {
  b.addEventListener('click', () => {
    amount = b.dataset.amount === 'max' ? 'max' : Number(b.dataset.amount);
    document.querySelectorAll<HTMLButtonElement>('[data-amount]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    updatePanels();
  });
});

function updateGen(g: GeneratorDef) {
  const row = genRows.get(g.id)!;
  const owned = ownedOf(state, g.id);
  const n = amount === 'max' ? maxAffordable(g, owned, state.coins) : amount;
  const shown = Math.max(1, n);
  const cost = bulkCost(g, owned, shown);
  const ok = n > 0 && state.coins >= cost;
  row.count.textContent = String(owned);
  row.each.textContent = `${fmt(unitCps(state, g.id))}/s c/u`;
  row.cost.textContent = `${shown > 1 ? `x${shown} · ` : ''}${fmt(cost)}`;
  row.btn.classList.toggle('is-affordable', ok);
  row.btn.disabled = !ok;
}

// ---------- Mejoras ----------

const upgradesEl = $('upgrades');
const upgradeCount = $('upgrade-count');
let upgradeSig = '';

function updateUpgrades() {
  const vis = visibleUpgrades(state).slice(0, 12);
  const sig = vis.map((u) => u.id).join(',');
  if (sig !== upgradeSig) {
    upgradeSig = sig;
    upgradesEl.replaceChildren();
    if (vis.length === 0) {
      upgradesEl.appendChild(h('p', 'pi-muted', 'Sin mejoras por ahora. Sigue comprando negocios y aparecerán.'));
    }
    for (const u of vis) {
      const btn = h('button', 'pi-item');
      btn.type = 'button';
      btn.dataset.id = u.id;
      btn.append(h('span', 'pi-item-name', u.name), h('span', 'pi-item-count'), h('span', 'pi-item-desc', u.desc), h('span', 'pi-item-cost', fmt(u.cost)));
      btn.addEventListener('click', () => {
        if (buyUpgrade(state, u.id)) updatePanels();
      });
      upgradesEl.appendChild(btn);
    }
  }
  let affordable = 0;
  upgradesEl.querySelectorAll<HTMLButtonElement>('button[data-id]').forEach((btn) => {
    const u = UPGRADES.find((x) => x.id === btn.dataset.id)!;
    const ok = state.coins >= u.cost;
    if (ok) affordable++;
    btn.classList.toggle('is-affordable', ok);
    btn.disabled = !ok;
  });
  upgradeCount.hidden = affordable === 0;
  upgradeCount.textContent = String(affordable);
}

// ---------- Reinvertir ----------

const prestigeBtn = $<HTMLButtonElement>('prestige');
prestigeBtn.addEventListener('click', () => {
  const gain = pendingLicenses(state);
  if (gain < 1) return;
  if (!confirm(`Vas a reiniciar tu imperio para ganar ${gain} licencia(s) (+${Math.round(gain * LICENSE_BONUS * 100)}% de producción). ¿Continuar?`)) return;
  prestige(state);
  upgradeSig = '';
  save();
  updatePanels();
  toast(`+${gain} licencias. ¡Vamos otra vez, más fuerte!`);
  track('prestige', { gained: gain });
});

function updatePrestige() {
  const pending = pendingLicenses(state);
  $('licenses').textContent = String(state.licenses);
  $('pending').textContent = String(pending);
  $('license-bonus').textContent = `+${Math.round(state.licenses * LICENSE_BONUS * 100)}%`;
  prestigeBtn.disabled = pending < 1;
  $('prestige-hint').textContent = pending < 1 ? `Aún no hay licencias disponibles. Sigue creciendo (llevas ${fmt(state.runEarned)} en esta partida).` : '';
}

// ---------- Tienda / monetización ----------

const adDialog = $<HTMLDialogElement>('ad-dialog');
const watchAd = $<HTMLButtonElement>('watch-ad');

// Sin red publicitaria configurada no mostramos un botón que no puede cumplir lo que promete.
if (!hasRewardedAds()) $('boost-card').hidden = true;

watchAd.addEventListener('click', async () => {
  watchAd.disabled = true;
  track('rewarded_ad_start');
  const result = await showRewardedAd(adDialog);
  watchAd.disabled = false;
  if (result === 'viewed') {
    addBoost(state);
    toast(`⚡ Boost x${MONETIZATION.rewardedBoost.multiplier} activo: ${fmtTime(state.boostLeft)}`);
    track('rewarded_ad_complete');
  } else if (result === 'unavailable') {
    toast('No hay anuncios disponibles ahora. Prueba de nuevo en un minuto.');
    track('rewarded_ad_unavailable');
  }
});

const productsEl = $('products');
function renderProducts() {
  productsEl.replaceChildren();
  for (const p of MONETIZATION.products) {
    const card = h('div', 'pi-card');
    card.append(h('h2', '', p.name), h('p', '', p.desc), h('p', 'pi-price', p.price));
    if (p.id === 'pro' && state.pro) {
      const b = h('button', 'btn btn-secondary', '✓ Activo');
      b.disabled = true;
      card.appendChild(b);
    } else if (p.url) {
      const a = h('a', 'btn btn-primary', 'Comprar');
      a.href = p.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.addEventListener('click', () => track('checkout_open', { product: p.id }));
      card.append(a, h('p', 'pi-muted', 'Tras el pago recibirás un código para canjear aquí abajo.'));
    } else {
      const b = h('button', 'btn btn-secondary', 'Próximamente');
      b.disabled = true;
      card.appendChild(b);
    }
    productsEl.appendChild(card);
  }
}

$<HTMLFormElement>('redeem-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = $<HTMLInputElement>('redeem-code');
  const msg = await redeem(state, input.value);
  if (msg) {
    input.value = '';
    save();
    renderProducts();
    toast(msg);
    track('redeem_ok');
  } else {
    toast('Código inválido o ya usado.');
  }
});

$('reset').addEventListener('click', () => {
  if (!confirm('Esto borra toda tu partida, incluidas las licencias. ¿Seguro?')) return;
  const keep = { pro: state.pro, redeemed: state.redeemed };
  state = Object.assign(newState(), keep);
  upgradeSig = '';
  save();
  updatePanels();
});

// Donación y banner
const donate = $<HTMLAnchorElement>('donate');
if (MONETIZATION.donateUrl) {
  donate.href = MONETIZATION.donateUrl;
  donate.hidden = false;
  donate.addEventListener('click', () => track('donate_click'));
}
let bannerMounted = false;
function maybeMountBanner() {
  if (bannerMounted || state.pro) return;
  const el = $('banner');
  if (mountBanner(el)) {
    el.hidden = false;
    bannerMounted = true;
  }
}

// ---------- Pestañas ----------

const tabs = [...document.querySelectorAll<HTMLButtonElement>('[role=tab]')];
function selectTab(tab: HTMLButtonElement) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    $(`panel-${t.dataset.tab}`).hidden = !on;
  }
  updatePanels();
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

// ---------- HUD y bucle ----------

const coinsEl = $('coins');
const cpsEl = $('cps');
const boostEl = $('boost');
const boostLeftEl = $('boost-left');

function updateHud() {
  coinsEl.textContent = fmt(state.coins);
  cpsEl.textContent = `${fmt(cps(state))}/s · click ${fmt(clickPower(state))}`;
  boostEl.hidden = state.boostLeft <= 0;
  if (state.boostLeft > 0) boostLeftEl.textContent = fmtTime(state.boostLeft);
}

function updatePanels() {
  const active = tabs.find((t) => t.getAttribute('aria-selected') === 'true')?.dataset.tab;
  if (active === 'gens') for (const g of GENERATORS) updateGen(g);
  if (active === 'prestige') updatePrestige();
  if (active === 'shop') {
    $('stat-lifetime').textContent = fmt(state.lifetimeEarned);
    $('stat-clicks').textContent = String(state.clicks);
    $('stat-resets').textContent = String(state.resets);
  }
  updateUpgrades(); // siempre: alimenta el contador de la pestaña
}

let last = performance.now();
let hudAcc = 0;
let panelAcc = 0;
function frame(now: number) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  tick(state, dt);
  scene.update(dt);
  scene.draw();
  hudAcc += dt;
  panelAcc += dt;
  if (hudAcc >= 0.1) {
    hudAcc = 0;
    updateHud();
  }
  if (panelAcc >= 0.25) {
    panelAcc = 0;
    updatePanels();
  }
  requestAnimationFrame(frame);
}

// ---------- Arranque ----------

initAds();
welcomeBack();
renderProducts();
maybeMountBanner();
updateHud();
updatePanels();
requestAnimationFrame((t) => {
  last = t;
  frame(t);
});

setInterval(save, 10_000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) save();
  else welcomeBack();
});
window.addEventListener('pagehide', save);
