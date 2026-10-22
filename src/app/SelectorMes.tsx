import { mes } from './lib/format';

/** Navegación entre meses: 0 es el mes actual, -1 el anterior… No deja ir al futuro. */
export function SelectorMes({ valor, onCambio }: { valor: number; onCambio: (n: number) => void }) {
  const { titulo } = mes(valor);
  return (
    <div className="selector-mes">
      <button type="button" className="btn-icono" onClick={() => onCambio(valor - 1)} aria-label="Mes anterior">
        ‹
      </button>
      <strong aria-live="polite">{titulo}</strong>
      <button type="button" className="btn-icono" onClick={() => onCambio(valor + 1)} disabled={valor >= 0} aria-label="Mes siguiente">
        ›
      </button>
    </div>
  );
}
