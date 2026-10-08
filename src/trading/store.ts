// Guardado de la Mesa de trading, compartido por la pantalla gráfica y la terminal.
import { ASSETS, deserializeMarket, newMarket, type Market } from './market';
import { deserializeAccount, newAccount, type Account } from './account';

export const SAVE_KEY = 'pagos-trader:v1';
export const SPEEDS = [0, 1, 3, 10];

export interface Session {
  market: Market;
  acct: Account;
  selected: string;
  speed: number;
}

export function loadSession(): Session {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      const market = deserializeMarket(d.market);
      const acct = deserializeAccount(d.acct);
      if (market && acct) {
        return {
          market,
          acct,
          selected: ASSETS.some((x) => x.id === d.selected) ? (d.selected as string) : 'btc',
          speed: SPEEDS.includes(d.speed) ? (d.speed as number) : 1
        };
      }
    }
  } catch {
    /* sin guardado válido: empieza de cero */
  }
  return { market: newMarket(), acct: newAccount(), selected: 'btc', speed: 1 };
}

export function saveSession(s: Session): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ market: s.market, acct: s.acct, selected: s.selected, speed: s.speed }));
  } catch {
    /* sin almacenamiento no se guarda */
  }
}
