// Interfaz del blackjack: cartas en DOM (accesibles), controles que dependen de lo que es legal.
import { buzz, play } from '../game/audio';
import * as BJ from './blackjack';
import { h, money, type GameModule, type Shell } from './shell';
import { bet as takeBet, credit } from './wallet';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_NAMES = ['picas', 'corazones', 'diamantes', 'tréboles'];
const RANK_NAMES = ['', 'As', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function cardEl(c: BJ.Card | null, fresh: boolean, delay: number): HTMLElement {
  const el = h('div', 'cs-pc');
  if (fresh) {
    el.classList.add('cs-deal');
    el.style.animationDelay = `${delay}ms`;
  }
  if (!c) {
    el.classList.add('cs-pc--back');
    el.setAttribute('aria-label', 'Carta oculta del crupier');
    return el;
  }
  if (c.suit === 1 || c.suit === 2) el.classList.add('cs-pc-red');
  el.setAttribute('aria-label', `${RANK_NAMES[c.rank]} de ${SUIT_NAMES[c.suit]}`);
  el.append(h('span', 'cs-pc-r', RANKS[c.rank]), h('span', 'cs-pc-s', SUITS[c.suit]));
  return el;
}

const totalText = (cards: BJ.Card[]) => {
  const v = BJ.handValue(cards);
  if (v.total > 21) return `${v.total} (te pasaste)`;
  return v.soft && v.total < 21 ? `${v.total - 10} / ${v.total}` : String(v.total);
};

export function mountBlackjack(root: HTMLElement, shell: Shell): GameModule {
  let shoe = BJ.newShoe();
  let round: BJ.Round | null = null;
  let bet = BJ.BETS[1];
  // Cuántas cartas ya se mostraron, para animar solo las nuevas.
  let seen = { dealer: 0, hands: [] as number[] };

  // ---------- Estructura ----------
  const wrap = h('div', 'cs-bj');
  const dealerBox = h('div', 'cs-bj-box');
  const dealerHead = h('div', 'cs-bj-head');
  const dealerRow = h('div', 'cs-cards');
  dealerBox.append(dealerHead, dealerRow);
  const handsBox = h('div', 'cs-bj-hands');
  const msg = h('p', 'cs-msg', 'Elige tu apuesta y reparte.');
  msg.setAttribute('aria-live', 'polite');

  const actions = h('div', 'cs-actions');
  const mk = (label: string, fn: () => void, cls = 'btn btn-secondary') => {
    const b = h('button', cls, label);
    b.type = 'button';
    b.addEventListener('click', fn);
    actions.appendChild(b);
    return b;
  };
  const hitBtn = mk('Pedir', () => act('hit'));
  const standBtn = mk('Plantarse', () => act('stand'));
  const doubleBtn = mk('Doblar', () => act('double'));
  const splitBtn = mk('Dividir', () => act('split'));

  const betRow = h('div', 'cs-chips');
  betRow.setAttribute('role', 'group');
  betRow.setAttribute('aria-label', 'Apuesta por mano');
  const betBtns = BJ.BETS.map((b) => {
    const btn = h('button', '', money(b));
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(b === bet));
    btn.addEventListener('click', () => {
      if (round && !round.over) return;
      bet = b;
      betBtns.forEach((o) => o.setAttribute('aria-pressed', String(o === btn)));
      play('chip');
    });
    betRow.appendChild(btn);
    return btn;
  });
  const dealBtn = h('button', 'btn btn-primary cs-main-btn', 'Repartir');
  dealBtn.type = 'button';
  dealBtn.addEventListener('click', deal);
  const betArea = h('div', 'cs-bet-area');
  betArea.append(h('p', 'cs-label', 'Apuesta por mano (fichas)'), betRow, dealBtn);

  wrap.append(dealerBox, handsBox, msg, actions, betArea, rules());
  root.appendChild(wrap);

  // ---------- Dibujo ----------
  function render() {
    const r = round;
    dealerRow.replaceChildren();
    handsBox.replaceChildren();
    if (!r) {
      dealerHead.textContent = 'Crupier';
      actions.hidden = true;
      return;
    }
    const up = BJ.cardValue(r.dealer[0]);
    dealerHead.textContent = `Crupier · ${r.holeHidden ? (up === 11 ? 'A' : String(up)) : totalText(r.dealer)}`;
    r.dealer.forEach((c, i) => {
      const hidden = r.holeHidden && i === 1;
      // Una carta es nueva si no se había mostrado, o si es la oculta que se acaba de revelar.
      const fresh = i >= seen.dealer || (i === 1 && !r.holeHidden && !revealed);
      dealerRow.appendChild(cardEl(hidden ? null : c, fresh, i * 180));
    });

    r.hands.forEach((hand, idx) => {
      const box = h('div', `cs-bj-box${idx === r.active && !r.over ? ' is-active' : ''}`);
      const outcome = r.outcomes[idx];
      const head = h('div', 'cs-bj-head');
      head.textContent = `${r.hands.length > 1 ? `Mano ${idx + 1}` : 'Tu mano'} · ${totalText(hand.cards)} · apuesta ${money(hand.bet * (hand.doubled ? 2 : 1))}`;
      if (outcome) head.appendChild(h('span', `cs-badge cs-badge--${outcome}`, { blackjack: 'Blackjack', win: 'Gana', push: 'Empate', lose: 'Pierde', bust: 'Pasada' }[outcome]));
      const row = h('div', 'cs-cards');
      const prev = seen.hands[idx] ?? 0;
      hand.cards.forEach((c, i) => row.appendChild(cardEl(c, i >= prev, (i - prev) * 180 + (r.hands.length > 1 ? 120 : 0))));
      box.append(head, row);
      handsBox.appendChild(box);
    });
    seen = { dealer: r.dealer.length, hands: r.hands.map((x) => x.cards.length) };
    revealed = !r.holeHidden;

    const lg = BJ.legal(r);
    actions.hidden = r.over;
    hitBtn.disabled = !lg.hit;
    standBtn.disabled = !lg.stand;
    doubleBtn.disabled = !lg.double || shell.wallet.chips < BJ.doubleCost(r);
    splitBtn.disabled = !lg.split || shell.wallet.chips < BJ.splitCost(r);
    splitBtn.hidden = !lg.split;
    doubleBtn.hidden = !lg.double;
    betArea.hidden = !r.over;
    dealBtn.textContent = 'Nueva mano';
  }
  let revealed = false;

  // ---------- Jugada ----------
  function deal() {
    if (round && !round.over) return;
    if (!takeBet(shell.wallet, bet)) {
      msg.textContent = 'No tienes fichas suficientes para esa apuesta. Baja la apuesta o recarga.';
      return;
    }
    if (shoe.length < BJ.RESHUFFLE_BELOW) {
      shoe = BJ.newShoe();
      shell.toast('Se barajó el zapato de 6 mazos.');
    }
    shell.wallet.hands++;
    shell.setBusy(true);
    shell.commit();
    seen = { dealer: 0, hands: [] };
    revealed = false;
    round = BJ.startRound(shoe, bet);
    play('tick');
    shell.track('casino_hand');
    msg.textContent = 'Tu turno.';
    render();
    if (round.over) settle();
  }

  function act(move: 'hit' | 'stand' | 'double' | 'split') {
    const r = round;
    if (!r || r.over) return;
    // Primero se comprueba que la jugada sea legal: así nunca se cobra una jugada que no se hace.
    if (!BJ.legal(r)[move]) return;
    if (move === 'double' || move === 'split') {
      const cost = move === 'double' ? BJ.doubleCost(r) : BJ.splitCost(r);
      if (!takeBet(shell.wallet, cost)) {
        msg.textContent = `No tienes fichas para ${move === 'double' ? 'doblar' : 'dividir'}.`;
        return;
      }
      shell.commit();
    }
    BJ[move](r);
    play(move === 'stand' ? 'tick' : 'chip');
    buzz(6);
    render();
    if (r.over) settle();
  }

  function settle() {
    const r = round!;
    if (r.returned > 0) credit(shell.wallet, r.returned, r.staked);
    shell.wallet.rounds++;
    const net = r.returned - r.staked;
    const first = r.outcomes[0];
    if (r.hands.length === 1) {
      msg.textContent =
        first === 'blackjack' ? `¡Blackjack! Paga 3:2: +${money(net)} fichas.` :
        first === 'win' ? `Ganas: +${money(net)} fichas.` :
        first === 'push' ? 'Empate: recuperas tu apuesta.' :
        first === 'bust' ? `Te pasaste de 21: ${money(net)} fichas.` :
        BJ.isNatural(r.dealer) ? `El crupier tiene blackjack: ${money(net)} fichas.` : `Pierdes ${money(-net)} fichas.`;
    } else {
      msg.textContent = net > 0 ? `Resultado de las 2 manos: +${money(net)} fichas.` : net < 0 ? `Resultado de las 2 manos: ${money(net)} fichas.` : 'Resultado de las 2 manos: empate.';
    }
    if (net > 0) {
      play(first === 'blackjack' ? 'golden' : 'win');
      buzz(first === 'blackjack' ? 40 : 20);
    } else if (net < 0) play('lose');
    shell.setBusy(false);
    shell.commit();
    render();
  }

  // ---------- Reglas ----------
  function rules(): HTMLElement {
    const box = h('details', 'cs-details');
    box.appendChild(h('summary', '', 'Reglas y probabilidades'));
    const ul = h('ul', 'cs-rules');
    [
      '6 mazos; se baraja al quedar menos del 25 % del zapato.',
      'Blackjack (As + 10 o figura) paga 3:2.',
      'El crupier se planta en todos los 17, también en 17 blando.',
      'El crupier mira su carta oculta si muestra As o 10: no hay seguro ni rendición.',
      'Doblar con cualquier primera mano de dos cartas, también tras dividir.',
      'Dividir una sola vez parejas del mismo valor. Los ases divididos reciben una carta cada uno; 21 tras dividir paga 1:1.',
      'Retorno al jugador: alrededor del 99,5 % usando la estrategia básica (verificado con una simulación de 6 millones de manos). Si juegas "a intuición" será menor.'
    ].forEach((t) => ul.appendChild(h('li', '', t)));
    box.appendChild(ul);
    return box;
  }

  render();
  return {
    minBet: BJ.BETS[0],
    onShow() {
      render();
    }
  };
}
