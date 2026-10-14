/**
 * Catálogo y reglas de precio de la pizzería. Precios en COP enteros:
 * el peso no se fracciona, así que todo el cálculo vive en enteros y se
 * redondea una sola vez al final de cada línea.
 */

export interface Pizza {
  id: string;
  name: string;
  tagline: string;
  ingredients: string[];
  /** Precio del tamaño personal; los demás tamaños multiplican sobre este. */
  basePrice: number;
  badge?: string;
  veggie?: boolean;
  spicy?: boolean;
  /** Colores de los toppings para el SVG del menú. */
  palette: string[];
}

export interface Size {
  id: string;
  name: string;
  detail: string;
  multiplier: number;
  slices: number;
}

export interface Crust {
  id: string;
  name: string;
  detail: string;
  extra: number;
}

export interface Topping {
  id: string;
  name: string;
  price: number;
  veggie: boolean;
  color: string;
}

export interface Zone {
  id: string;
  name: string;
  fee: number;
  etaMin: number;
  etaMax: number;
}

export interface Coupon {
  code: string;
  label: string;
  /** Descuento proporcional sobre el subtotal de pizzas. */
  percentOff?: number;
  /** Descuento fijo en COP sobre el subtotal de pizzas. */
  amountOff?: number;
  /** Exime el domicilio. */
  freeDelivery?: boolean;
  minSubtotal: number;
}

export const pizzas: Pizza[] = [
  {
    id: 'margherita',
    name: 'Margherita',
    tagline: 'San Marzano, mozzarella fior di latte y albahaca fresca.',
    ingredients: ['Salsa San Marzano', 'Mozzarella', 'Albahaca', 'Aceite de oliva'],
    basePrice: 24900,
    badge: 'clásica',
    veggie: true,
    palette: ['#c3402f', '#f0e4c0', '#6f9a5a'],
  },
  {
    id: 'pepperoni',
    name: 'Pepperoni doble',
    tagline: 'Doble capa de pepperoni que se enrosca y guarda el aceite.',
    ingredients: ['Salsa de tomate', 'Mozzarella', 'Pepperoni x2', 'Orégano'],
    basePrice: 31900,
    badge: 'la más pedida',
    palette: ['#b1332a', '#e8c87a', '#8e2a22'],
  },
  {
    id: 'cuatro-quesos',
    name: 'Cuatro quesos',
    tagline: 'Mozzarella, gorgonzola, parmesano y provolone sobre base blanca.',
    ingredients: ['Base de crema', 'Mozzarella', 'Gorgonzola', 'Parmesano', 'Provolone'],
    basePrice: 33900,
    veggie: true,
    palette: ['#f2e6bd', '#dcd2a4', '#c9b887'],
  },
  {
    id: 'criolla',
    name: 'Criolla',
    tagline: 'Chorizo santarrosano, maíz tierno y cebolla asada.',
    ingredients: ['Salsa de tomate', 'Mozzarella', 'Chorizo', 'Maíz tierno', 'Cebolla asada'],
    basePrice: 34900,
    badge: 'de la casa',
    palette: ['#a8452c', '#e9c65f', '#d8b9a0', '#7d5a3c'],
  },
  {
    id: 'diavola',
    name: 'Diavola',
    tagline: 'Salami picante, jalapeño y miel de ají para cerrar.',
    ingredients: ['Salsa de tomate', 'Mozzarella', 'Salami picante', 'Jalapeño', 'Miel de ají'],
    basePrice: 35900,
    spicy: true,
    palette: ['#9e2b22', '#e0a23e', '#5f8b3f'],
  },
  {
    id: 'hortelana',
    name: 'Hortelana',
    tagline: 'Berenjena, calabacín y pimiento asados al horno de leña.',
    ingredients: ['Salsa de tomate', 'Mozzarella', 'Berenjena', 'Calabacín', 'Pimiento', 'Rúgula'],
    basePrice: 30900,
    veggie: true,
    palette: ['#6f9a5a', '#8e6fa3', '#d9873f', '#c3402f'],
  },
];

export const sizes: Size[] = [
  { id: 'personal', name: 'Personal', detail: '25 cm', multiplier: 1, slices: 4 },
  { id: 'mediana', name: 'Mediana', detail: '33 cm', multiplier: 1.45, slices: 6 },
  { id: 'familiar', name: 'Familiar', detail: '40 cm', multiplier: 1.95, slices: 8 },
];

export const crusts: Crust[] = [
  { id: 'tradicional', name: 'Tradicional', detail: 'Masa madre 48 h', extra: 0 },
  { id: 'delgada', name: 'Delgada', detail: 'Crocante, sin borde', extra: 0 },
  { id: 'rellena', name: 'Borde relleno', detail: 'Mozzarella en el borde', extra: 6000 },
  { id: 'integral', name: 'Integral', detail: 'Harina de trigo entero', extra: 2500 },
];

export const toppings: Topping[] = [
  { id: 'queso-extra', name: 'Queso extra', price: 4500, veggie: true, color: '#f0e4c0' },
  { id: 'champinon', name: 'Champiñones', price: 3500, veggie: true, color: '#b49b78' },
  { id: 'tocineta', name: 'Tocineta', price: 5000, veggie: false, color: '#c4663f' },
  { id: 'jalapeno', name: 'Jalapeños', price: 2500, veggie: true, color: '#5f8b3f' },
  { id: 'pina', name: 'Piña', price: 3000, veggie: true, color: '#e9c65f' },
  { id: 'aceituna', name: 'Aceitunas negras', price: 3000, veggie: true, color: '#4a3a52' },
  { id: 'pollo', name: 'Pollo desmechado', price: 5500, veggie: false, color: '#d8b98a' },
  { id: 'rugula', name: 'Rúgula fresca', price: 2500, veggie: true, color: '#6f9a5a' },
];

export const zones: Zone[] = [
  { id: 'laureles', name: 'Laureles', fee: 5000, etaMin: 25, etaMax: 35 },
  { id: 'poblado', name: 'El Poblado', fee: 7500, etaMin: 35, etaMax: 50 },
  { id: 'envigado', name: 'Envigado', fee: 9000, etaMin: 40, etaMax: 60 },
  { id: 'centro', name: 'Centro', fee: 6000, etaMin: 30, etaMax: 45 },
];

export const coupons: Coupon[] = [
  { code: 'HORNO10', label: '10% en pizzas', percentOff: 0.1, minSubtotal: 40000 },
  { code: 'DOMIGRATIS', label: 'Domicilio gratis', freeDelivery: true, minSubtotal: 60000 },
  { code: 'LEÑA8', label: '$8.000 menos', amountOff: 8000, minSubtotal: 80000 },
];

export const payments = [
  { id: 'tarjeta', name: 'Tarjeta', detail: 'Débito o crédito al confirmar' },
  { id: 'nequi', name: 'Nequi', detail: 'Llega un push al celular' },
  { id: 'efectivo', name: 'Efectivo', detail: 'Se paga al domiciliario' },
];

/** Impuesto al consumo de bares y restaurantes en Colombia. */
export const INC_RATE = 0.08;

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export const formatCOP = (value: number) => cop.format(Math.round(value));

/** La carta no cobra pesos sueltos: todo precio cae a la centena más cercana. */
export const roundToHundred = (value: number) => Math.round(value / 100) * 100;

/** Minutos que suma la cocina antes de que salga el domiciliario. */
export const KITCHEN_MINUTES = 18;

export const PICKUP_ADDRESS = 'Cra. 70 # 44-12, Laureles';
