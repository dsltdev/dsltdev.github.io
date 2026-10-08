// Lo que el casino le ofrece a cada juego: billetera, guardado, avisos y estado "ocupado".
import type { Wallet } from './wallet';

export interface Shell {
  wallet: Wallet;
  /** Guarda la billetera y refresca el saldo y los avisos de quiebra. Llamar tras cada cambio de fichas. */
  commit(): void;
  toast(msg: string): void;
  /** Mientras hay una jugada en curso no se puede cambiar de juego. */
  setBusy(busy: boolean): void;
  /** El dispositivo pide reducir movimiento: sin giros largos ni animaciones. */
  reduced: boolean;
  track(event: string, props?: Record<string, string | number>): void;
}

export interface GameModule {
  /** Apuesta mínima del juego (para detectar que ya no alcanzan las fichas). */
  minBet: number;
  /** Se llama cada vez que el juego pasa a verse. */
  onShow(): void;
}

export const money = (n: number) => n.toLocaleString('es-CO');

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}
