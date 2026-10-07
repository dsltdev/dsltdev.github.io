// Cableado del juego: estado, bucle, panel de compras y monetización.
import { hasRewardedAds, initAds, mountBanner, showRewardedAd, track } from './ads';
import { buzz, isSoundOn, play, setSound, unlock } from './audio';
import { GENERATORS, GOLDEN, LICENSE_BONUS, MONETIZATION, SAVE_KEY, UPGRADES, type GeneratorDef } from './config';
import {
  ACHIEVEMENTS,
  addBoost,
  applyOffline,
  buyGenerator,
  buyUpgrade,
  bulkCost,
  checkAchievements,
  click,
  collectGolden,
  clickPower,
  cps,
  deserialize,
  fmt,
  fmtTime,
  maxAffordable,
  newState,
  nextGoldenDelay,
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
  window.setTimeout(nextToast, 2400);
}

/** Avisos en cola: si llegan dos juntos (p. ej. Pago VIP + logro) se ven uno tras otro. */
function toast(msg: string) {
  toastQueue.push(msg);
  if (toastQueue.length > 3) toastQueue.shift();
  if (!toastBusy) nextToast();
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
  play('click');
  buzz(6);
}

/** Recoge un Pago VIP: lluvia de monedas o frenesí. */
function onGolden() {
  const msg = collectGolden(state);
  const short = msg.startsWith('¡Frenes') ? `¡FRENESÍ x${GOLDEN.frenzyMultiplier}!` : msg;
  scene.announce(short);
  toast(msg);
  play('golden');
  buzz(25);
  track('golden_collect');
  checkAch();
}

// Tocar en cualquier parte del lienzo cuenta (más cómodo con el pulgar); el Pago VIP tiene prioridad.
canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  unlock();
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  if (scene.tryCollectGolden(x, y)) onGolden();
  else doClick(x, y);
});
canvas.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  if (e.repeat) return;
  unlock();
  const c = scene.coinCenter();
  doClick(c.x, c.y);
});
// Cualquier toque en la página activa el audio (los navegadores lo exigen).
document.addEventListener('pointerdown', unlock, { once: true });

// ---------- Logros ----------

const achEl = $('achievements');
const achRows = new Map<string, HTMLElement>();
for (const a of ACHIEVEMENTS) {
  const li = h('li');
  li.append(h('strong', '', a.name), h('span', '', a.desc));
  achEl.appendChild(li);
  achRows.set(a.id, li);
}

function renderAchievements() {
  for (const a of ACHIEVEMENTS) achRows.get(a.id)!.classList.toggle('is-done', state.achievements.includes(a.id));
  $('ach-count').textContent = `${state.achievements.length}/${ACHIEVEMENTS.length}`;
}

function checkAch() {
  const fresh = checkAchievements(state);
  if (fresh.length === 0) return;
  toast(`🏆 Logro: ${fresh.map((a) => a.name).join(', ')}`);
  play('achievement');
  track('achievement', { id: fresh[0].id });
  renderAchievements();
}

function popRow(el: HTMLElement) {
  el.classList.remove('is-pop');
  void el.offsetWidth; // reinicia la animación si compras varias veces seguidas
  el.classList.add('is-pop');
}

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
    if (n > 0 && buyGenerator(state, g.id, n)) {
      play('buy');
      buzz(12);
      scene.onBuy(g.id);
      popRow(btn);
      updatePanels();
    }
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
  row.each.textContent = `${fmt(unitCps(state, g.id))}/s cada uno`;
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
        if (buyUpgrade(state, u.id)) {
          play('upgrade');
          buzz(12);
          updatePanels();
        }
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
  play('prestige');
  scene.announce(`+${gain} licencias`);
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
const clickEl = $('click-power');
const boostEl = $('boost');
const boostLeftEl = $('boost-left');
const frenzyEl = $('frenzy');
const frenzyLeftEl = $('frenzy-left');

function updateHud() {
  coinsEl.textContent = fmt(state.coins);
  cpsEl.textContent = `${fmt(cps(state))}/s`;
  clickEl.textContent = `+${fmt(clickPower(state))}`;
  boostEl.hidden = state.boostLeft <= 0;
  if (state.boostLeft > 0) boostLeftEl.textContent = fmtTime(state.boostLeft);
  frenzyEl.hidden = state.frenzyLeft <= 0;
  if (state.frenzyLeft > 0) frenzyLeftEl.textContent = fmtTime(state.frenzyLeft);
}

// En celular el saldo queda fijo arriba: la moneda se ancla justo debajo, sea cual sea su altura.
const hudEl = document.querySelector<HTMLElement>('.pi-hud')!;
new ResizeObserver(() => document.documentElement.style.setProperty('--hud-h', `${hudEl.offsetHeight}px`)).observe(hudEl);

// ---------- Pista guiada ----------

const hintEl = $('hint');
const ownedTotal = () => Object.values(state.owned).reduce((a, b) => a + b, 0);

/** Un solo mensaje corto, el más útil para este momento (cabe en una línea en el celular). */
function hintText(): string {
  const first = GENERATORS[0];
  if (state.frenzyLeft > 0) return '¡Frenesí! Toca lo más rápido que puedas.';
  if (scene.hasGolden()) return '¡Toca el Pago VIP dorado antes de que se vaya!';
  if (ownedTotal() === 0) {
    if (state.clicks < 6) return 'Toca la moneda para procesar pagos.';
    return state.coins >= first.baseCost ? '¡Compra tu primer Webhook en Negocios!' : `Te faltan ${fmt(first.baseCost - state.coins)} para tu primer Webhook.`;
  }
  if (state.upgrades.length === 0 && visibleUpgrades(state).some((u) => state.coins >= u.cost)) return 'Tienes una mejora disponible en Mejoras.';
  if (pendingLicenses(state) >= 1) return 'Puedes reinvertir y ganar licencias.';
  return 'Tus negocios trabajan solos, incluso si te vas.';
}

function updateHint() {
  const t = hintText();
  if (hintEl.textContent !== t) hintEl.textContent = t;
  // Resalta el primer negocio cuando ya se puede comprar.
  const row = genRows.get(GENERATORS[0].id)!.btn;
  row.classList.toggle('is-hint', ownedTotal() === 0 && state.coins >= GENERATORS[0].baseCost);
}

function updatePanels() {
  const active = tabs.find((t) => t.getAttribute('aria-selected') === 'true')?.dataset.tab;
  if (active === 'gens') for (const g of GENERATORS) updateGen(g);
  if (active === 'prestige') updatePrestige();
  if (active === 'shop') {
    $('stat-lifetime').textContent = fmt(state.lifetimeEarned);
    $('stat-clicks').textContent = String(state.clicks);
    $('stat-resets').textContent = String(state.resets);
    $('stat-golden').textContent = String(state.golden);
    renderAchievements();
  }
  updateUpgrades(); // siempre: alimenta el contador de la pestaña
  checkAch();
  updateHint();
}

// Con ?golden en la URL el primer Pago VIP aparece a los 3 s (para verlo sin esperar).
const forceGolden = new URLSearchParams(location.search).has('golden');
let goldenIn = forceGolden ? 3 : nextGoldenDelay();
let last = performance.now();
let hudAcc = 0;
let panelAcc = 0;
function frame(now: number) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  tick(state, dt);
  // Cuenta solo tiempo de juego activo y no interrumpe los primeros toques.
  if (!scene.hasGolden() && (state.clicks >= 10 || forceGolden)) {
    goldenIn -= dt;
    if (goldenIn <= 0) {
      scene.spawnGolden();
      play('spawn');
      goldenIn = nextGoldenDelay();
    }
  }
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
  play('buy'); // confirmación audible al activar
});
paintSound();

initAds();
welcomeBack();
renderAchievements();
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
