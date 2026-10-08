// Blackjack. Fichas virtuales: no tienen valor real.
//
// Reglas (se muestran tal cual al jugador):
//  - 6 mazos, se baraja al quedar menos del 25 % del zapato.
//  - Blackjack paga 3:2. El crupier se planta en todos los 17 (también 17 blando).
//  - El crupier mira su carta oculta si muestra As o figura/10 (no hay seguro ni rendición).
//  - Doblar con cualquier primera mano de dos cartas (también tras dividir).
//  - Dividir una sola vez parejas del mismo valor; los ases divididos reciben una carta y no se pueden pedir más.
//  - 21 tras dividir no es blackjack: paga 1:1.
import { randInt, shuffle, type Rand } from './rng';

export interface Card {
  /** 1 = As, 11 = J, 12 = Q, 13 = K */
  rank: number;
  suit: number;
}

export const DECKS = 6;
export const RESHUFFLE_BELOW = Math.floor(DECKS * 52 * 0.25);
export const BETS = [10, 50, 100, 500, 1000];

export const cardValue = (c: Card) => (c.rank === 1 ? 11 : Math.min(10, c.rank));

export function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c.rank === 1) aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export const isNatural = (cards: Card[]) => cards.length === 2 && handValue(cards).total === 21;

export interface Hand {
  cards: Card[];
  bet: number;
  doubled: boolean;
  done: boolean;
  fromSplit: boolean;
  splitAces: boolean;
}

export type Outcome = 'blackjack' | 'win' | 'push' | 'lose' | 'bust';

export interface Round {
  shoe: Card[];
  dealer: Card[];
  hands: Hand[];
  active: number;
  /** El crupier ya jugó y la ronda se liquidó. */
  over: boolean;
  /** true mientras la carta oculta del crupier no se muestra. */
  holeHidden: boolean;
  outcomes: Outcome[];
  /** Fichas que vuelven al jugador al final (apuesta + ganancia). */
  returned: number;
  /** Fichas puestas en juego en total (apuesta inicial + dobles + divisiones). */
  staked: number;
}

export function newShoe(rand: Rand = randInt): Card[] {
  const shoe: Card[] = [];
  for (let d = 0; d < DECKS; d++) for (let suit = 0; suit < 4; suit++) for (let rank = 1; rank <= 13; rank++) shoe.push({ rank, suit });
  return shuffle(shoe, rand);
}

const draw = (r: Round): Card => r.shoe.pop() as Card;

export function startRound(shoe: Card[], bet: number): Round {
  const r: Round = { shoe, dealer: [], hands: [], active: 0, over: false, holeHidden: true, outcomes: [], returned: 0, staked: bet };
  const hand: Hand = { cards: [], bet, doubled: false, done: false, fromSplit: false, splitAces: false };
  r.hands.push(hand);
  hand.cards.push(draw(r));
  r.dealer.push(draw(r));
  hand.cards.push(draw(r));
  r.dealer.push(draw(r));

  const up = cardValue(r.dealer[0]);
  const dealerNatural = isNatural(r.dealer);
  const playerNatural = isNatural(hand.cards);
  // El crupier mira su carta oculta solo si puede tener blackjack.
  if ((up === 10 || up === 11) && dealerNatural) {
    finish(r, [playerNatural ? 'push' : 'lose']);
  } else if (playerNatural) {
    finish(r, ['blackjack']);
  }
  return r;
}

function finish(r: Round, outcomes: Outcome[]) {
  r.over = true;
  r.holeHidden = false;
  r.outcomes = outcomes;
  r.returned = 0;
  r.hands.forEach((h, i) => {
    const o = outcomes[i];
    const stake = h.bet * (h.doubled ? 2 : 1);
    if (o === 'blackjack') r.returned += stake * 2.5;
    else if (o === 'win') r.returned += stake * 2;
    else if (o === 'push') r.returned += stake;
  });
}

export interface Legal {
  hit: boolean;
  stand: boolean;
  double: boolean;
  split: boolean;
}

export function legal(r: Round): Legal {
  if (r.over) return { hit: false, stand: false, double: false, split: false };
  const h = r.hands[r.active];
  const two = h.cards.length === 2;
  const canAct = !h.done && !h.splitAces;
  return {
    hit: canAct && handValue(h.cards).total < 21,
    stand: !h.done,
    double: canAct && two,
    split: canAct && two && r.hands.length === 1 && cardValue(h.cards[0]) === cardValue(h.cards[1])
  };
}

function advance(r: Round) {
  // Pasa a la siguiente mano que pueda actuar; si no queda ninguna, juega el crupier.
  for (let i = r.active; i < r.hands.length; i++) {
    const h = r.hands[i];
    if (!h.done && !h.splitAces && handValue(h.cards).total < 21) {
      r.active = i;
      return;
    }
    h.done = true;
  }
  dealerPlays(r);
}

function dealerPlays(r: Round) {
  r.holeHidden = false;
  const anyAlive = r.hands.some((h) => handValue(h.cards).total <= 21);
  if (anyAlive) while (handValue(r.dealer).total < 17) r.dealer.push(draw(r));
  const dealerTotal = handValue(r.dealer).total;
  const outcomes: Outcome[] = r.hands.map((h) => {
    const t = handValue(h.cards).total;
    if (t > 21) return 'bust';
    if (dealerTotal > 21 || t > dealerTotal) return 'win';
    return t === dealerTotal ? 'push' : 'lose';
  });
  finish(r, outcomes);
}

export function hit(r: Round): boolean {
  if (!legal(r).hit) return false;
  r.hands[r.active].cards.push(draw(r));
  advance(r);
  return true;
}

export function stand(r: Round): boolean {
  if (!legal(r).stand) return false;
  r.hands[r.active].done = true;
  advance(r);
  return true;
}

/** Fichas extra que exige doblar la mano activa (para descontarlas de la billetera). */
export const doubleCost = (r: Round) => r.hands[r.active].bet;

export function double(r: Round): boolean {
  if (!legal(r).double) return false;
  const h = r.hands[r.active];
  r.staked += h.bet;
  h.doubled = true;
  h.cards.push(draw(r));
  h.done = true;
  advance(r);
  return true;
}

export const splitCost = (r: Round) => r.hands[0].bet;

export function split(r: Round): boolean {
  if (!legal(r).split) return false;
  const h = r.hands[0];
  const aces = h.cards[0].rank === 1;
  r.staked += h.bet;
  const second: Hand = { cards: [h.cards[1]], bet: h.bet, doubled: false, done: false, fromSplit: true, splitAces: aces };
  h.cards = [h.cards[0]];
  h.fromSplit = true;
  h.splitAces = aces;
  h.cards.push(draw(r));
  second.cards.push(draw(r));
  r.hands.push(second);
  r.active = 0;
  advance(r);
  return true;
}

// ---------- Estrategia básica (solo para verificar el retorno con simulaciones) ----------

export type Move = 'hit' | 'stand' | 'double' | 'split';

/** Estrategia básica óptima para estas reglas (6 mazos, S17, doblar tras dividir). */
export function basicStrategy(r: Round): Move {
  const h = r.hands[r.active];
  const up = cardValue(r.dealer[0]);
  const lg = legal(r);
  const { total, soft } = handValue(h.cards);
  const dbl = (m: Move): Move => (m === 'double' && !lg.double ? 'hit' : m);
  const dblStand = (m: Move): Move => (m === 'double' && !lg.double ? 'stand' : m);

  if (lg.split) {
    const v = cardValue(h.cards[0]);
    const doSplit =
      v === 11 || v === 8 ||
      ((v === 2 || v === 3 || v === 7) && up >= 2 && up <= 7) ||
      (v === 6 && up >= 2 && up <= 6) ||
      (v === 4 && (up === 5 || up === 6)) ||
      (v === 9 && ((up >= 2 && up <= 6) || up === 8 || up === 9));
    if (doSplit) return 'split';
  }
  if (soft && total <= 21) {
    if (total >= 19) return 'stand';
    if (total === 18) return up >= 3 && up <= 6 ? dblStand('double') : up === 2 || up === 7 || up === 8 ? 'stand' : 'hit';
    if (total === 17) return up >= 3 && up <= 6 ? dbl('double') : 'hit';
    if (total === 16 || total === 15) return up >= 4 && up <= 6 ? dbl('double') : 'hit';
    return up >= 5 && up <= 6 ? dbl('double') : 'hit'; // A,2 y A,3
  }
  if (total >= 17) return 'stand';
  if (total >= 13) return up >= 2 && up <= 6 ? 'stand' : 'hit';
  if (total === 12) return up >= 4 && up <= 6 ? 'stand' : 'hit';
  if (total === 11) return up === 11 ? 'hit' : dbl('double');
  if (total === 10) return up >= 2 && up <= 9 ? dbl('double') : 'hit';
  if (total === 9) return up >= 3 && up <= 6 ? dbl('double') : 'hit';
  return 'hit';
}

export function play(r: Round, move: Move): boolean {
  if (move === 'hit') return hit(r);
  if (move === 'stand') return stand(r);
  if (move === 'double') return double(r);
  return split(r);
}
