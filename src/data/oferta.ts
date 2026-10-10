// Datos de la oferta de servicios (landing en "/"). Todo lo que cuesta dinero o recibe contactos está aquí,
// para cambiarlo en un solo lugar.

export const OFERTA = {
  nombre: 'David López',
  ciudad: 'Medellín, Colombia',
  email: 'dsltdev@icloud.com',
  github: 'https://github.com/dsltdev',
  /** Enlace de pago de Wompi de la auditoría. */
  pagoAuditoria: 'https://checkout.wompi.co/l/VPOS_c5Twxg',
  auditoria: { precio: 150000, entrega: '24 horas hábiles' },
  monitoreo: { precio: 180000 },
  /** URL del Worker del asistente de IA (carpeta asistente/). Vacía = el asistente no se muestra. */
  asistenteUrl: ''
} as const;

/** 150000 -> "$150.000 COP" */
export const cop = (n: number) => `$${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} COP`;

/** Enlace mailto con asunto (y cuerpo opcional) ya codificados. */
export const mailto = (asunto: string, cuerpo?: string) =>
  `mailto:${OFERTA.email}?subject=${encodeURIComponent(asunto)}${cuerpo ? `&body=${encodeURIComponent(cuerpo)}` : ''}`;
