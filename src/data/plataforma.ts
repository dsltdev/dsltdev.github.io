// Textos y precios de la landing de la plataforma. Los planes deben coincidir con la tabla `planes`
// de la base de datos (db/migrations/0001_plataforma.sql): ahí se aplican los límites de verdad.
import { OFERTA, cop as copConSufijo } from './oferta';

/** 49000 -> "$49.000" (la moneda se muestra aparte, junto al "/mes"). */
const cop = (n: number) => copConSufijo(n).replace(' COP', '');

export const PLATAFORMA = {
  nombre: 'dsltdev',
  titulo: 'Ventas, inventario y clientes de tu negocio en un solo lugar',
  descripcion:
    'Plataforma en español para pequeños negocios: registra ventas, controla tu inventario, organiza tus clientes y mira cómo va tu negocio desde el celular o el computador. 14 días de prueba, sin tarjeta.',
  url: 'https://dsltdev.com',
  email: OFERTA.email,
  pruebaDias: 14,
  /** El panel vive en /app/; ahí mismo está el registro. */
  app: '/app/'
} as const;

export const FUNCIONES = [
  {
    icono: '＄',
    titulo: 'Ventas en segundos',
    texto: 'Busca el producto, ajusta cantidad o precio, elige cliente y método de pago. El stock se descuenta solo y puedes anular una venta si te equivocas.'
  },
  {
    icono: '▤',
    titulo: 'Inventario al día',
    texto: 'Cada entrada, salida y venta queda registrada. Ves cuánto te queda de cada cosa y te avisamos qué toca reponer.'
  },
  {
    icono: '▣',
    titulo: 'Productos y servicios',
    texto: 'Vende cosas que se cuentan y servicios que no. Precio, costo, código y alerta de stock mínimo para cada uno.'
  },
  {
    icono: '☺',
    titulo: 'Tus clientes ordenados',
    texto: 'Guarda nombre, documento, teléfono y correo, y asócialos a cada venta en lugar de buscarlos en un cuaderno.'
  },
  {
    icono: '◧',
    titulo: 'Métodos de pago',
    texto: 'Anota cómo pagó cada cliente: efectivo, transferencia, tarjeta o Nequi. Tú decides cuáles usas.'
  },
  {
    icono: '⚙',
    titulo: 'Permisos por rol',
    texto: 'Dueño, administrador y vendedor. El vendedor vende; solo quien tú decidas cambia precios, stock o anula ventas.'
  }
] as const;

export const PASOS = [
  { titulo: 'Crea tu cuenta', texto: 'Correo y contraseña. Sin tarjeta, sin instalar nada.' },
  { titulo: 'Carga tu catálogo', texto: 'Agrega tus productos o servicios y el stock con el que empiezas.' },
  { titulo: 'Vende y mira tu negocio', texto: 'Cada venta actualiza el inventario y tu resumen del día y del mes.' }
] as const;

export const PLANES = [
  {
    codigo: 'basico',
    nombre: 'Básico',
    precio: cop(49000),
    para: 'Para empezar a ordenar tu negocio.',
    incluye: ['Hasta 2 usuarios', 'Hasta 200 productos', 'Ventas, inventario y clientes']
  },
  {
    codigo: 'negocio',
    nombre: 'Negocio',
    precio: cop(99000),
    para: 'Para un negocio con equipo y catálogo grande.',
    incluye: ['Hasta 5 usuarios', 'Hasta 2.000 productos', 'Ventas, inventario y clientes'],
    destacado: true
  },
  {
    codigo: 'pro',
    nombre: 'Pro',
    precio: cop(199000),
    para: 'Para cuando no quieres pensar en límites.',
    incluye: ['Usuarios ilimitados', 'Productos ilimitados', 'Ventas, inventario y clientes']
  }
] as const;

export const PREGUNTAS = [
  {
    p: '¿Necesito tarjeta para probarlo?',
    r: `No. Creas tu cuenta y tienes ${PLATAFORMA.pruebaDias} días para usarlo con todo tu negocio antes de elegir un plan.`
  },
  {
    p: '¿Quién puede ver mis datos?',
    r: 'Solo las personas de tu negocio. Cada negocio tiene sus datos aislados: otro negocio de la plataforma no ve tus ventas, clientes ni inventario.'
  },
  {
    p: '¿Tengo que instalar algo?',
    r: 'No. Funciona en el navegador, en el computador o en el celular.'
  },
  {
    p: '¿Para qué tipo de negocio sirve?',
    r: 'Tiendas, talleres, cafeterías, emprendimientos y cualquier negocio que venda productos o servicios y necesite saber qué vendió, a quién y cuánto le queda.'
  },
  {
    p: '¿Los precios son en pesos colombianos?',
    r: 'Sí, en COP y por mes.'
  }
] as const;
