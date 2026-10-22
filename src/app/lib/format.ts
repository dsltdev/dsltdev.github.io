const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const diaLargo = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
const diaCorto = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
const mesAnio = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });

export const cop = (n: number) => moneda.format(n);
export const num = (n: number) => numero.format(n);

/** "" -> null, para guardar campos de texto opcionales como null en la base. */
export const opcional = (s: string) => (s.trim() === '' ? null : s.trim());

// ───────────── Fechas ─────────────
// Las fechas se guardan como "AAAA-MM-DD" (sin hora), así que se arman con las partes locales:
// pasar por toISOString() las corre de día cerca de la medianoche.
const dos = (n: number) => String(n).padStart(2, '0');
export const aISO = (d: Date) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
export const deISO = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
};
export const hoy = () => aISO(new Date());

export const verDia = (iso: string) => diaLargo.format(deISO(iso));
export const verFecha = (iso: string) => diaCorto.format(deISO(iso));

/** Primer día del mes `desplazamiento` meses desde hoy (0 = este mes, -1 = el anterior). */
export function mes(desplazamiento: number) {
  const hoyLocal = new Date();
  const inicio = new Date(hoyLocal.getFullYear(), hoyLocal.getMonth() + desplazamiento, 1);
  const siguiente = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1);
  const titulo = mesAnio.format(inicio);
  return { desde: aISO(inicio), hasta: aISO(siguiente), titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1) };
}

/** Días que faltan para una fecha (negativo = ya pasó). */
export const diasHasta = (iso: string) => Math.round((deISO(iso).getTime() - deISO(hoy()).getTime()) / 86_400_000);

export const TIPOS_CUENTA: Record<string, string> = { efectivo: 'Efectivo', banco: 'Cuenta bancaria', billetera: 'Billetera (Nequi, Daviplata…)', tarjeta: 'Tarjeta de crédito' };
export const FRECUENCIAS: Record<string, string> = { semanal: 'Cada semana', mensual: 'Cada mes', anual: 'Cada año' };
