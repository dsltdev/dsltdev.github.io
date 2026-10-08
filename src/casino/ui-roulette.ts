// Interfaz de la ruleta: rueda animada en canvas y tapete de apuestas en DOM (accesible).
import { buzz, play } from '../game/audio';
import { h, money, type GameModule, type Shell } from './shell';
import * as RO from './roulette';
import { bet as takeBet, credit } from './wallet';

const TAU = Math.PI * 2;
const COLORS = { red: '#b8402f', black: '#1c1712', green: '#2f7a4a' };
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const mod = (a: number, n: number) => ((a % n) + n) % n;
const POCKET = TAU / 37;
const COLOR_NAME = { red: 'rojo', black: 'negro', green: 'verde' };

export function mountRoulette(root: HTMLElement, shell: Shell): GameModule {
  const wrap = h('div', 'cs-rou');

  // ---------- Rueda ----------
  const canvas = h('canvas', 'cs-wheel');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Rueda de ruleta europea');
  const ctx = canvas.getContext('2d')!;
  let size = 0;
  let dpr = 1;
  let raf = 0;
  let wheel = 0; // ángulo de la rueda
  let ball: { angle: number; r: number } | null = null;
  let anim: { start: number; dur: number; w0: number; wTurn: number; b0: number; bTo: number; target: number } | null = null;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    size = Math.max(1, r.width);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    request();
  };
  new ResizeObserver(resize).observe(canvas);
  const request = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  function drawWheel() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const c = size / 2;
    const R = c * 0.96;
    const Rin = R * 0.62;
    // borde
    ctx.fillStyle = '#3a2a16';
    ctx.beginPath();
    ctx.arc(c, c, R + 4, 0, TAU);
    ctx.fill();
    RO.WHEEL_ORDER.forEach((n, i) => {
      const a0 = wheel + i * POCKET - Math.PI / 2;
      ctx.fillStyle = COLORS[RO.colorOf(n)];
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, R, a0, a0 + POCKET);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(224,162,62,0.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // número
      ctx.save();
      ctx.translate(c, c);
      ctx.rotate(a0 + POCKET / 2);
      ctx.fillStyle = '#f4ead4';
      ctx.font = `600 ${Math.max(9, R * 0.075)}px "IBM Plex Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.translate(R * 0.86, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillText(String(n), 0, 0);
      ctx.restore();
    });
    // centro
    ctx.fillStyle = '#14100b';
    ctx.beginPath();
    ctx.arc(c, c, Rin, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#e0a23e';
    ctx.lineWidth = 3;
    ctx.stroke();
    const g = ctx.createRadialGradient(c - 6, c - 6, 2, c, c, Rin * 0.5);
    g.addColorStop(0, '#fbe6b8');
    g.addColorStop(1, '#a97324');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c, c, Rin * 0.35, 0, TAU);
    ctx.fill();
    // bola
    if (ball) {
      const bx = c + Math.cos(ball.angle - Math.PI / 2) * ball.r * R;
      const by = c + Math.sin(ball.angle - Math.PI / 2) * ball.r * R;
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(bx, by, Math.max(4, R * 0.04), 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function frame(now: number) {
    raf = 0;
    if (anim) {
      const t = Math.min(1, (now - anim.start) / anim.dur);
      const e = easeOut(t);
      wheel = anim.w0 + anim.wTurn * e;
      // La bola da vueltas por el borde y al final cae al bolsillo.
      const drop = Math.min(1, Math.max(0, (t - 0.62) / 0.38));
      const smooth = drop * drop * (3 - 2 * drop);
      ball = { angle: anim.b0 + (anim.bTo - anim.b0) * e, r: 0.9 - (0.9 - 0.8) * smooth };
      if (t >= 1) {
        anim = null;
        done();
      }
    }
    drawWheel();
    if (anim) request();
  }

  // ---------- Tapete ----------
  const placed: Record<string, number> = {};
  /** Cada ficha puesta, para poder deshacer exactamente lo último que hiciste. */
  const stack: { id: string; amt: number }[] = [];
  let chip = RO.CHIPS[1];
  let spinning = false;
  let lastPlaced: Record<string, number> | null = null;
  const cells = new Map<string, HTMLButtonElement>();

  const msg = h('p', 'cs-msg', 'Elige una ficha y toca el tapete para apostar.');
  msg.setAttribute('aria-live', 'polite');
  const totalEl = h('p', 'cs-total', '');
  const resultsEl = h('div', 'cs-results');
  resultsEl.setAttribute('aria-label', 'Últimos resultados');

  const board = h('div', 'cs-board');
  const nums = h('div', 'cs-nums');
  const mkCell = (id: string, label: string, cls: string, aria: string): HTMLButtonElement => {
    const b = h('button', `cs-cell ${cls}`);
    b.type = 'button';
    b.dataset.id = id;
    b.setAttribute('aria-label', aria);
    b.append(h('span', 'cs-cell-l', label), h('span', 'cs-stake'));
    (b.querySelector('.cs-stake') as HTMLElement).hidden = true;
    b.addEventListener('click', () => place(id));
    cells.set(id, b);
    return b;
  };
  const zero = mkCell('n0', '0', 'cs-green cs-zero', 'Número 0, verde. Paga 35 a 1.');
  board.appendChild(zero);
  for (let n = 1; n <= 36; n++) {
    const color = RO.colorOf(n);
    const b = mkCell(`n${n}`, String(n), `cs-${color}`, `Número ${n}, ${COLOR_NAME[color]}. Paga 35 a 1.`);
    b.style.setProperty('--r', String(3 - ((n - 1) % 3)));
    b.style.setProperty('--c', String(Math.ceil(n / 3)));
    nums.appendChild(b);
  }
  board.appendChild(nums);

  const outside = h('div', 'cs-outside');
  const ODDS = (id: string) => (RO.BET_DEFS[id].pays === 1 ? '1 a 1' : '2 a 1');
  RO.OUTSIDE_IDS.forEach((id) => {
    const def = RO.BET_DEFS[id];
    const color = id === 'red' ? 'cs-red' : id === 'black' ? 'cs-black' : '';
    outside.appendChild(mkCell(id, def.label, `cs-out ${color}`, `${def.label}. Paga ${ODDS(id)}.`));
  });

  const chipRow = h('div', 'cs-chips');
  chipRow.setAttribute('role', 'group');
  chipRow.setAttribute('aria-label', 'Valor de la ficha');
  const chipBtns = RO.CHIPS.map((v) => {
    const b = h('button', '', money(v));
    b.type = 'button';
    b.setAttribute('aria-pressed', String(v === chip));
    b.addEventListener('click', () => {
      chip = v;
      chipBtns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      play('chip');
    });
    chipRow.appendChild(b);
    return b;
  });

  const spinBtn = h('button', 'btn btn-primary cs-main-btn', 'Girar');
  spinBtn.type = 'button';
  const tools = h('div', 'cs-actions');
  const mkTool = (label: string, fn: () => void) => {
    const b = h('button', 'btn btn-secondary', label);
    b.type = 'button';
    b.addEventListener('click', fn);
    tools.appendChild(b);
    return b;
  };
  const undoBtn = mkTool('Deshacer', undo);
  const clearBtn = mkTool('Borrar todo', clearBets);
  const repeatBtn = mkTool('Repetir apuesta', repeat);

  wrap.append(canvas, resultsEl, msg, h('p', 'cs-label', 'Valor de la ficha (fichas)'), chipRow, board, outside, totalEl, spinBtn, tools, rules());
  root.appendChild(wrap);

  // ---------- Apuestas ----------
  const total = () => Object.values(placed).reduce((a, b) => a + b, 0);

  function paint() {
    cells.forEach((b, id) => {
      const s = placed[id] ?? 0;
      const badge = b.querySelector('.cs-stake') as HTMLElement;
      badge.hidden = s === 0;
      badge.textContent = s ? money(s) : '';
      b.classList.toggle('has-stake', s > 0);
    });
    const t = total();
    totalEl.textContent = t ? `Apuesta total: ${money(t)} fichas` : 'Sin apuestas';
    undoBtn.disabled = spinning || stack.length === 0;
    clearBtn.disabled = spinning || stack.length === 0;
    repeatBtn.disabled = spinning || !lastPlaced || stack.length > 0;
    spinBtn.disabled = spinning || t === 0;
  }

  function place(id: string) {
    if (spinning) return;
    const t = total();
    if (t + chip > RO.MAX_BET_TOTAL) {
      msg.textContent = `El máximo por giro es ${money(RO.MAX_BET_TOTAL)} fichas.`;
      return;
    }
    if (t + chip > shell.wallet.chips) {
      msg.textContent = 'No tienes fichas suficientes para añadir esa ficha.';
      return;
    }
    clearResult();
    placed[id] = (placed[id] ?? 0) + chip;
    stack.push({ id, amt: chip });
    play('chip');
    paint();
  }

  function undo() {
    const last = stack.pop();
    if (!last) return;
    placed[last.id] -= last.amt;
    if (placed[last.id] <= 0) delete placed[last.id];
    paint();
  }

  function clearBets() {
    for (const k of Object.keys(placed)) delete placed[k];
    stack.length = 0;
    paint();
  }

  function repeat() {
    if (!lastPlaced || spinning) return;
    const t = Object.values(lastPlaced).reduce((a, b) => a + b, 0);
    if (t > shell.wallet.chips) {
      msg.textContent = 'No tienes fichas suficientes para repetir esa apuesta.';
      return;
    }
    clearResult();
    for (const [id, v] of Object.entries(lastPlaced)) {
      placed[id] = v;
      stack.push({ id, amt: v });
    }
    paint();
  }

  function clearResult() {
    cells.forEach((b) => b.classList.remove('is-win'));
  }

  // ---------- Giro ----------
  let result = 0;
  let staked: Record<string, number> = {};

  spinBtn.addEventListener('click', () => {
    if (spinning) return;
    const t = total();
    if (t === 0) return;
    if (!takeBet(shell.wallet, t)) {
      msg.textContent = 'No tienes fichas suficientes para esa apuesta.';
      return;
    }
    shell.wallet.rounds++;
    staked = { ...placed };
    lastPlaced = { ...placed };
    clearBets();
    spinning = true;
    shell.setBusy(true);
    shell.commit();
    result = RO.spinWheel();
    msg.textContent = 'La bola está girando…';
    play('tick');
    buzz(8);
    shell.track('casino_roulette');
    paint();

    const target = mod(RO.WHEEL_ORDER.indexOf(result) + 0.5, 37) * POCKET; // centro del bolsillo en la rueda
    if (shell.reduced) {
      wheel = 0;
      ball = { angle: target, r: 0.8 };
      done();
      drawWheel();
      return;
    }
    const wTurn = TAU * 1.2;
    const w1 = wheel + wTurn;
    const finalAngle = w1 + target; // dónde debe terminar la bola (absoluto)
    const b0 = ball ? ball.angle : 0;
    const turns = 4 * TAU;
    const bTo = b0 - turns - mod(b0 - finalAngle, TAU);
    anim = { start: performance.now(), dur: 4200, w0: wheel, wTurn, b0, bTo, target };
    request();
  });

  function done() {
    const res = RO.resolve(staked, result);
    spinning = false;
    if (res.returned > 0) credit(shell.wallet, res.returned, res.staked);
    const net = res.returned - res.staked;
    const color = RO.colorOf(result);

    const pill = h('span', `cs-pill cs-${color}`, String(result));
    pill.setAttribute('aria-label', `${result} ${COLOR_NAME[color]}`);
    resultsEl.prepend(pill);
    while (resultsEl.childElementCount > 12) resultsEl.lastElementChild?.remove();

    res.wins.forEach((w) => cells.get(w.id)?.classList.add('is-win'));
    msg.textContent =
      net > 0 ? `Salió el ${result} (${COLOR_NAME[color]}). Ganas ${money(net)} fichas.` :
      net === 0 ? `Salió el ${result} (${COLOR_NAME[color]}). Recuperas lo apostado.` :
      `Salió el ${result} (${COLOR_NAME[color]}). Pierdes ${money(-net)} fichas.`;
    canvas.setAttribute('aria-label', `Rueda de ruleta. Salió el ${result}, ${COLOR_NAME[color]}.`);
    if (net > 0) {
      play(net >= res.staked * 5 ? 'golden' : 'win');
      buzz(25);
    } else if (net < 0) play('lose');
    shell.setBusy(false);
    shell.commit();
    paint();
  }

  // ---------- Reglas ----------
  function rules(): HTMLElement {
    const box = h('details', 'cs-details');
    box.appendChild(h('summary', '', 'Reglas y probabilidades'));
    const ul = h('ul', 'cs-rules');
    [
      'Ruleta europea: 37 números (0 a 36), un solo cero.',
      'Número directo paga 35 a 1. Docenas y columnas pagan 2 a 1. Rojo/negro, par/impar y 1-18/19-36 pagan 1 a 1.',
      'El cero pierde todas las apuestas externas.',
      'Retorno al jugador: 97,30 % en todas las apuestas (36/37), porque la ventaja de la casa es el cero.',
      `Máximo por giro: ${money(RO.MAX_BET_TOTAL)} fichas.`
    ].forEach((t) => ul.appendChild(h('li', '', t)));
    box.appendChild(ul);
    return box;
  }

  paint();
  return {
    minBet: RO.CHIPS[0],
    onShow() {
      resize();
      paint();
    }
  };
}
