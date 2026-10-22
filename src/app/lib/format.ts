const moneda = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const numero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const fechaHora = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const fecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' });

export const cop = (n: number) => moneda.format(n);
export const num = (n: number) => numero.format(n);
export const verFechaHora = (iso: string) => fechaHora.format(new Date(iso));
export const verFecha = (iso: string) => fecha.format(new Date(iso));

/** "" -> null, para guardar campos de texto opcionales como null en la base. */
export const opcional = (s: string) => (s.trim() === '' ? null : s.trim());

export const ROLES: Record<string, string> = { dueno: 'Dueño', admin: 'Administrador', vendedor: 'Vendedor' };
