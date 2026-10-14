// Contenido de la landing (portada). Vive aparte para que la página y el asistente de IA lean exactamente
// los mismos hechos: lo que dice el sitio es lo único que el asistente puede afirmar.

import { OFERTA, cop } from './oferta';

const precioAuditoria = cop(OFERTA.auditoria.precio);
const precioMonitoreo = cop(OFERTA.monitoreo.precio);

export const revisiones = [
  { tema: 'Webhooks', texto: 'Que nadie pueda forjar un webhook y que tu sistema lo trate como un pago real.' },
  { tema: 'Montos', texto: 'Que no le cobres a un cliente 100 veces de más, ni de menos.' },
  { tema: 'Reintentos', texto: 'Que un reintento de red no te duplique, ni te borre, una transacción.' },
  { tema: 'Concurrencia', texto: 'Que dos órdenes al mismo tiempo no rompan tu libro de cuentas.' }
];

export const pasos = [
  { titulo: 'Pagás la auditoría', texto: 'Con el enlace de Wompi. Si tenés dudas antes, escribime primero: no tiene costo.' },
  { titulo: 'Me das acceso de lectura', texto: 'A tu repositorio o a un staging y, si aplica, a logs o al payload de un webhook de prueba. No necesito tus llaves privadas ni acceso de escritura.' },
  { titulo: 'Recibís el reporte', texto: `En ${OFERTA.auditoria.entrega}: cada hallazgo con su severidad, qué pasa y cómo corregirlo.` }
];

export const proyectos = [
  {
    nombre: 'Cybersentinel',
    texto: 'Ecosistema fintech en Cloudflare Workers: wallet cripto/COP, exchange y trading con IA. Integraciones reales con Bancolombia, Wompi y Truora, con autenticación JWT compartida entre 7 servicios.',
    tags: ['Cloudflare Workers', 'TypeScript', 'D1'],
    enlace: { texto: 'Ver en producción', url: 'https://wallet.dsltdev.com' }
  },
  {
    nombre: 'DSLT Señales',
    texto: 'SaaS de señales de trading para LATAM: backtesting histórico, sizing con criterio de Kelly, ejecución automática opcional y cobros con Wompi.',
    tags: ['Python', 'FastAPI'],
    enlace: { texto: 'Ver en producción', url: 'https://saas.dsltdev.com' }
  },
  {
    nombre: 'Barbería SaaS',
    texto: 'Marketplace de agendamiento para barberías: descubrimiento por ciudad, reservas en tiempo real y sincronización en vivo con Supabase Realtime.',
    tags: ['Next.js', 'React 19', 'Supabase'],
    enlace: { texto: 'Ver el código', url: 'https://github.com/dsltdev/barberia-saas' }
  }
];

export const preguntas = [
  {
    p: '¿Necesitás mis llaves privadas o acceso de escritura?',
    r: 'No. Con acceso de lectura al código de la integración (o a un staging) y, si aplica, logs o el payload de un webhook de prueba, alcanza.'
  },
  { p: '¿Cuánto tarda?', r: `Entrego el reporte en ${OFERTA.auditoria.entrega}, una vez que tengo el acceso.` },
  {
    p: '¿Cómo se paga?',
    r: `Con el enlace de Wompi del botón "Pagar la auditoría" (${precioAuditoria}). Después me escribís a ${OFERTA.email} con el acceso a tu repositorio o staging.`
  },
  { p: '¿Puedo preguntar antes de pagar?', r: `Sí, sin costo. Escribime a ${OFERTA.email} y lo vemos.` },
  {
    p: '¿Qué pasa después de la auditoría?',
    r: `Si querés, seguimos con el monitoreo mensual (${precioMonitoreo} al mes): reviso tu integración de nuevo cada vez que hacés un deploy que la toca. Se coordina por correo; todavía no es un cobro automático.`
  },
  {
    p: '¿Solo trabajás con Wompi?',
    r: 'La auditoría sirve para cualquier integración de pagos. Mi experiencia directa en producción es con Wompi, Bancolombia y Truora.'
  }
];

export const hallazgo = {
  titulo: 'Webhook de Wompi Payouts: nunca validaba una notificación real',
  texto:
    'El endpoint verificaba la firma con el secreto del checkout normal, pero Payouts firma con una llave distinta y manda el timestamp fuera del objeto de firma. Cada confirmación real de un pago saliente se rechazaba con 401 y la transferencia nunca se actualizaba sola.',
  correccion: 'Verificación separada para el sobre de Payouts, con su propio secreto y el timestamp leído del nivel correcto.',
  articulo: '/blog/webhook-payouts-wompi-firma-invalida'
};
