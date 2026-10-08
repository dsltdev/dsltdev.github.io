// Interfaz de la tragamonedas: rodillos en canvas, apuesta, mensajes y tabla de premios.
import { buzz, play } from '../game/audio';
import { drawSymbol } from './draw';
import { h, money, type GameModule, type Shell } from './shell';
import * as S from './slots';
import { bet as takeBet, credit } from './wallet';

const AMBER = '#e0a23e';
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const mod = (a: number, n: number) => ((a % n) + n) % n;

interface Reel {
  pos: number;
  anim: { from: number; to: number; start: number; dur: number; stopped: boolean } | null;
}

export function mountSlots(root: HTMLElement, shell: Shell): GameModule {
  const N = S.STRIP.length;
  const stats = S.exactStats();

  // ---------- Estructura ----------
  const wrap = h('div', 'cs-slots');
  const canvas = h('canvas', 'cs-slot-canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Tragamonedas de 3 rodillos');
  const msg = h('p', 'cs-msg', 'Elige tu apuesta y pulsa Girar.');
  msg.setAttribute('aria-live', 'polite');

  const betRow = h('div', 'cs-chips');
  betRow.setAttribute('role', 'group');
  betRow.setAttribute('aria-label', 'Apuesta por giro');
  let bet = S.BETS[1];
  const betBtns = S.BETS.map((b) => {
    const btn = h('button', '', money(b));
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(b === bet));
    btn.addEventListener('click', () => {
      if (spinning) return;
      bet = b;
      betBtns.forEach((o) => o.setAttribute('aria-pressed', String(o === btn)));
      play('chip');
    });
    betRow.appendChild(btn);
    return btn;
  });

  const spinBtn = h('button', 'btn btn-primary cs-main-btn', 'Girar');
  spinBtn.type = 'button';

  wrap.append(canvas, msg, h('p', 'cs-label', 'Apuesta por giro (fichas)'), betRow, spinBtn, paytable());
  root.appendChild(wrap);

  // ---------- Estado ----------
  const reels: Reel[] = [0, 1, 2].map(() => ({ pos: Math.floor(Math.random() * N), anim: null }));
  let spinning = false;
  let highlight: { lines: number[]; until: number } | null = null;
  let raf = 0;
  let w = 0;
  let hgt = 0;
  let dpr = 1;
  const ctx = canvas.getContext('2d')!;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    w = Math.max(1, r.width);
    hgt = Math.max(1, r.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hgt * dpr);
    requestFrame();
  }
  new ResizeObserver(resize).observe(canvas);

  const requestFrame = () => {
    if (!raf) raf = requestAnimationFrame(frame);
  };

  // ---------- Dibujo ----------
  function layout() {
    const pad = Math.max(8, w * 0.04);
    const gap = Math.max(6, w * 0.025);
    const cell = (w - pad * 2 - gap * 2) / 3;
    const top = (hgt - cell * 3) / 2;
    return { pad, gap, cell, top };
  }

  function draw(now: number) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hgt);
    const bg = ctx.createLinearGradient(0, 0, 0, hgt);
    bg.addColorStop(0, '#24190e');
    bg.addColorStop(1, '#120d07');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, hgt);

    const { pad, gap, cell, top } = layout();
    if (cell < 8) return; // aún sin medida: se dibuja cuando el lienzo tenga tamaño
    reels.forEach((reel, i) => {
      const x = pad + i * (cell + gap);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, top, cell, cell * 3);
      ctx.clip();
      ctx.fillStyle = '#f4ead4';
      ctx.fillRect(x, top, cell, cell * 3);
      const base = Math.floor(reel.pos);
      const frac = reel.pos - base;
      for (let r = -1; r <= 3; r++) {
        const sym = S.STRIP[mod(base + r, N)];
        const cy = top + (r - frac) * cell + cell / 2;
        drawSymbol(ctx, sym, x + cell / 2, cy, cell * 0.44);
      }
      // sombreado arriba y abajo: da sensación de cilindro
      const shade = ctx.createLinearGradient(0, top, 0, top + cell * 3);
      shade.addColorStop(0, 'rgba(0,0,0,0.35)');
      shade.addColorStop(0.22, 'rgba(0,0,0,0)');
      shade.addColorStop(0.78, 'rgba(0,0,0,0)');
      shade.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = shade;
      ctx.fillRect(x, top, cell, cell * 3);
      ctx.restore();
      ctx.strokeStyle = '#4a3a24';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, top, cell, cell * 3);
    });

    // marcas de línea a los lados (1 a 5)
    ctx.fillStyle = '#a97324';
    ctx.font = '600 11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    [0, 1, 2].forEach((row) => ctx.fillText(String(row + 1), pad / 2, top + (row + 0.5) * cell));

    if (highlight && now < highlight.until) {
      const pulse = 0.6 + 0.4 * Math.sin(now / 120);
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      for (const line of highlight.lines) {
        ctx.strokeStyle = `rgba(243,199,120,${pulse})`;
        ctx.shadowColor = AMBER;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        S.LINES[line].forEach((row, reel) => {
          const px = pad + reel * (cell + gap) + cell / 2;
          const py = top + (row + 0.5) * cell;
          if (reel === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }

  function frame(now: number) {
    raf = 0;
    let animating = false;
    reels.forEach((reel, i) => {
      const a = reel.anim;
      if (!a) return;
      const t = Math.min(1, (now - a.start) / a.dur);
      reel.pos = a.from + (a.to - a.from) * easeOut(t);
      if (t < 1) animating = true;
      else if (!a.stopped) {
        a.stopped = true;
        reel.pos = Math.round(a.to);
        play('tick');
        if (i === reels.length - 1) finish();
      }
    });
    draw(now);
    if (animating || (highlight && now < highlight.until)) requestFrame();
  }

  // ---------- Jugada ----------
  let result: S.SpinResult | null = null;
  let currentBet = 0;

  function spin() {
    if (spinning) return;
    if (!takeBet(shell.wallet, bet)) {
      msg.textContent = 'No tienes fichas suficientes para esa apuesta. Baja la apuesta o recarga.';
      return;
    }
    shell.wallet.spins++;
    shell.commit();
    shell.setBusy(true);
    spinning = true;
    spinBtn.disabled = true;
    highlight = null;
    currentBet = bet;
    result = S.spin();
    msg.textContent = 'Girando…';
    play('tick');
    buzz(8);
    shell.track('casino_spin');

    const now = performance.now();
    reels.forEach((reel, i) => {
      const stop = result!.stops[i];
      const from = reel.pos;
      const delta = mod(Math.round(from) - stop, N);
      const turns = shell.reduced ? 0 : 2 + i;
      reel.anim = { from, to: Math.round(from) - (delta + turns * N), start: now, dur: shell.reduced ? 220 : 950 + i * 420, stopped: false };
    });
    requestFrame();
  }

  function finish() {
    if (!result) return;
    const r = result;
    const won = S.payout(currentBet, r);
    spinning = false;
    spinBtn.disabled = false;
    if (won > 0) credit(shell.wallet, won, currentBet);
    if (r.wins.length) highlight = { lines: r.wins.map((x) => x.line), until: performance.now() + 2200 };

    if (won === 0) msg.textContent = 'Sin premio esta vez.';
    else if (won < currentBet) msg.textContent = `Premio de ${money(won)} fichas, menos que tu apuesta de ${money(currentBet)}.`;
    else if (won === currentBet) msg.textContent = 'Recuperas tu apuesta.';
    else msg.textContent = `${won >= currentBet * 10 ? '¡Gran premio! ' : '¡Ganaste! '}+${money(won - currentBet)} fichas (${money(won)} en total).`;

    // Solo se celebra lo que de verdad supera la apuesta: un premio menor es una pérdida, no una victoria.
    if (won > currentBet) {
      play(won >= currentBet * 10 ? 'golden' : 'win');
      buzz(won >= currentBet * 10 ? 40 : 20);
    }
    const descr = r.wins.map((x) => `${S.NAMES[x.sym]} en la línea ${x.line + 1}`).join(', ');
    canvas.setAttribute('aria-label', `Tragamonedas. Resultado: ${descr || 'sin líneas ganadoras'}.`);
    shell.setBusy(false);
    shell.commit();
    requestFrame();
  }

  spinBtn.addEventListener('click', spin);

  // ---------- Tabla de premios y datos ----------
  function paytable(): HTMLElement {
    const box = h('details', 'cs-details');
    box.appendChild(h('summary', '', 'Tabla de premios y probabilidades'));
    const note = h('p', 'cs-small', `Tu apuesta se reparte en ${S.LINES.length} líneas (3 horizontales y 2 diagonales). Cada línea con 3 símbolos iguales paga según esta tabla; los premios se suman.`);
    box.appendChild(note);
    const list = h('div', 'cs-pay');
    [...S.SYMBOLS].reverse().forEach((sym) => {
      const row = h('div', 'cs-pay-row');
      const icon = h('canvas', 'cs-pay-icon');
      icon.width = 64;
      icon.height = 64;
      const c = icon.getContext('2d')!;
      c.fillStyle = '#f4ead4';
      c.fillRect(0, 0, 64, 64);
      drawSymbol(c, sym, 32, 32, 28);
      const total = S.PAY[sym] / S.LINES.length;
      row.append(icon, h('span', '', `3 × ${S.NAMES[sym]}`), h('strong', '', `${total.toLocaleString('es-CO')}× tu apuesta`));
      list.appendChild(row);
    });
    const two = h('div', 'cs-pay-row');
    two.append(h('span', 'cs-pay-icon'), h('span', '', '2 × Moneda seguidas desde la izquierda'), h('strong', '', `${(S.TWO_COINS / S.LINES.length).toLocaleString('es-CO')}× tu apuesta`));
    list.appendChild(two);
    box.appendChild(list);
    const pct = (n: number) => `${(n * 100).toFixed(1).replace('.', ',')} %`;
    box.appendChild(h('p', 'cs-small', `Retorno al jugador: ${(stats.rtp * 100).toFixed(2).replace('.', ',')} % a largo plazo, calculado sobre las ${stats.combos.toLocaleString('es-CO')} combinaciones posibles. Alguna línea paga en el ${pct(stats.hitRate)} de los giros, pero solo el ${pct(stats.winsAboveBet)} supera lo que apostaste: en el resto pierdes fichas.`));
    return box;
  }

  return {
    minBet: S.BETS[0],
    onShow() {
      resize();
    }
  };
}
