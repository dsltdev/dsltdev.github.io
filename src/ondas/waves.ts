// Motor del simulador de ondas: matemática pura, sin tocar la pantalla ni el audio.
//
// Convenciones (las mismas que usa WebAudio, para que lo que ves coincida con lo que oyes):
//   - seno: empieza en 0 y sube.          - cuadrada: +1 la primera mitad del ciclo, -1 la segunda.
//   - triangular: empieza en 0 y sube.    - sierra: sube de -1 a 1 y cae de golpe (pasa por 0 al empezar).
//   - la fase "atrasa" la onda: fase 180° con la misma frecuencia deja la onda invertida.

export type Forma = 'seno' | 'cuadrada' | 'triangular' | 'sierra';

export const FORMAS: { id: Forma; nombre: string; web: 'sine' | 'square' | 'triangle' | 'sawtooth' }[] = [
  { id: 'seno', nombre: 'Seno', web: 'sine' },
  { id: 'cuadrada', nombre: 'Cuadrada', web: 'square' },
  { id: 'triangular', nombre: 'Triangular', web: 'triangle' },
  { id: 'sierra', nombre: 'Sierra', web: 'sawtooth' }
];

/** Velocidad del sonido en el aire a 20 °C (m/s). */
export const VELOCIDAD_SONIDO = 343;
export const F_MIN = 20;
export const F_MAX = 4000;
export const VENTANA_MIN_MS = 1;
export const VENTANA_MAX_MS = 1000;
/** Frecuencia máxima que se dibuja en el espectro (límite del oído humano). */
export const F_ESPECTRO = 20000;

export interface Osc {
  activo: boolean;
  forma: Forma;
  /** Hz */
  freq: number;
  /** 0 a 1 */
  amp: number;
  /** Grados, 0 a 360 */
  fase: number;
}

export interface Estado {
  a: Osc;
  b: Osc;
  /** Ancho de tiempo que se ve en el osciloscopio. */
  ventanaMs: number;
  /** Volumen general, 0 a 1. */
  volumen: number;
}

export const estadoInicial = (): Estado => ({
  a: { activo: true, forma: 'seno', freq: 440, amp: 0.8, fase: 0 },
  b: { activo: false, forma: 'seno', freq: 660, amp: 0.5, fase: 0 },
  ventanaMs: 10,
  volumen: 0.25
});

// ---------- Formas de onda ----------

const frac = (x: number) => x - Math.floor(x);

/** Valor (-1 a 1) de una forma de onda tras `ciclos` ciclos (puede ser fraccionario o negativo). */
export function valor(forma: Forma, ciclos: number): number {
  const p = frac(ciclos);
  switch (forma) {
    case 'seno':
      return Math.sin(2 * Math.PI * p);
    case 'cuadrada':
      return p < 0.5 ? 1 : -1;
    case 'triangular':
      return p < 0.25 ? 4 * p : p < 0.75 ? 2 - 4 * p : 4 * p - 4;
    case 'sierra':
      return p < 0.5 ? 2 * p : 2 * p - 2;
  }
}

/** Valor de una onda en el instante t (segundos). Una onda apagada vale 0. */
export function onda(o: Osc, t: number): number {
  return o.activo ? o.amp * valor(o.forma, o.freq * t - o.fase / 360) : 0;
}

/** Suma de las dos ondas (superposición). */
export const suma = (e: Estado, t: number) => onda(e.a, t) + onda(e.b, t);

/** Cota del valor máximo de la suma: la suma de las amplitudes activas. */
export const picoMaximo = (e: Estado) => (e.a.activo ? e.a.amp : 0) + (e.b.activo ? e.b.amp : 0);

// ---------- Armónicos (serie de Fourier) ----------

export interface Armonico {
  n: number;
  /** Frecuencia del armónico (Hz) */
  f: number;
  /** Amplitud del armónico para una onda de amplitud 1 */
  a: number;
}

/** Amplitud del armónico n de cada forma de onda con amplitud 1 (series de Fourier conocidas). */
export function coeficiente(forma: Forma, n: number): number {
  switch (forma) {
    case 'seno':
      return n === 1 ? 1 : 0;
    case 'cuadrada':
      return n % 2 === 1 ? 4 / (Math.PI * n) : 0;
    case 'triangular':
      return n % 2 === 1 ? 8 / (Math.PI * Math.PI * n * n) : 0;
    case 'sierra':
      return 2 / (Math.PI * n);
  }
}

/** Armónicos audibles de una onda: hasta `max` Hz y como mucho `limite` armónicos. */
export function armonicos(forma: Forma, f0: number, max = F_ESPECTRO, limite = 48): Armonico[] {
  const lista: Armonico[] = [];
  for (let n = 1; n <= limite; n++) {
    const f = n * f0;
    if (f > max) break;
    const a = coeficiente(forma, n);
    if (a > 0) lista.push({ n, f, a });
  }
  return lista;
}

// ---------- Música y física ----------

const NOTAS = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];

/** Nota más cercana (La4 = 440 Hz) y cuántos cents (centésimas de semitono) se aleja de ella. */
export function nota(f: number): { nombre: string; cents: number } {
  const midi = 69 + 12 * Math.log2(f / 440);
  const r = Math.round(midi);
  return {
    nombre: `${NOTAS[((r % 12) + 12) % 12]}${Math.floor(r / 12) - 1}`,
    cents: Math.round((midi - r) * 100)
  };
}

/** Periodo en milisegundos. */
export const periodoMs = (f: number) => 1000 / f;

/** Longitud de onda en el aire, en metros. */
export const longitudOnda = (f: number) => VELOCIDAD_SONIDO / f;

const INTERVALOS: [number, number, string][] = [
  [16, 15, 'segunda menor'],
  [9, 8, 'segunda mayor'],
  [6, 5, 'tercera menor'],
  [5, 4, 'tercera mayor'],
  [4, 3, 'cuarta justa'],
  [3, 2, 'quinta justa'],
  [8, 5, 'sexta menor'],
  [5, 3, 'sexta mayor'],
  [2, 1, 'octava'],
  [3, 1, 'octava y quinta'],
  [4, 1, 'dos octavas']
];

/** Intervalo musical "justo" entre dos frecuencias (razón de números enteros pequeños), o null. */
export function intervalo(fa: number, fb: number): { nombre: string; razon: string } | null {
  if (fa <= 0 || fb <= 0) return null;
  // Unísono solo si de verdad son iguales: 440 y 441 Hz no lo son (suenan con pulsaciones).
  if (Math.abs(fa - fb) < 0.05) return { nombre: 'unísono', razon: '1:1' };
  const r = Math.max(fa, fb) / Math.min(fa, fb);
  for (const [num, den, nombre] of INTERVALOS) {
    if (Math.abs(r - num / den) / (num / den) < 0.003) return { nombre, razon: `${num}:${den}` };
  }
  return null;
}

/** Pulsaciones por segundo cuando dos frecuencias activas son muy parecidas; si no, null. */
export function pulsaciones(e: Estado): number | null {
  if (!e.a.activo || !e.b.activo) return null;
  const d = Math.abs(e.a.freq - e.b.freq);
  return d >= 0.2 && d <= 20 ? d : null;
}

/** Interferencia entre dos ondas de la misma frecuencia: depende de la fase relativa. */
export function interferencia(e: Estado): 'constructiva' | 'destructiva' | null {
  if (!e.a.activo || !e.b.activo || Math.abs(e.a.freq - e.b.freq) > 0.01) return null;
  const d = (((e.b.fase - e.a.fase) % 360) + 360) % 360;
  if (Math.abs(d - 180) <= 5) return 'destructiva';
  if (d <= 5 || d >= 355) return 'constructiva';
  return null;
}

/** Ventana de tiempo cómoda: 4 ciclos de la onda más grave, o 2 pulsaciones si las hay. */
export function ventanaAutomatica(e: Estado): number | null {
  const activas = [e.a, e.b].filter((o) => o.activo);
  if (activas.length === 0) return null;
  const p = pulsaciones(e);
  const ms = p !== null ? (2 / p) * 1000 : (4 / Math.min(...activas.map((o) => o.freq))) * 1000;
  return Math.min(VENTANA_MAX_MS, Math.max(VENTANA_MIN_MS, ms));
}

// ---------- Escalas de los controles ----------

/** Posición del control (0 a 1000) a frecuencia, en escala logarítmica: cada octava ocupa el mismo ancho. */
export const freqDeControl = (v: number) => F_MIN * Math.pow(F_MAX / F_MIN, v / 1000);
export const controlDeFreq = (f: number) => (1000 * Math.log(f / F_MIN)) / Math.log(F_MAX / F_MIN);
/** Ventana de tiempo, también en escala logarítmica. */
export const ventanaDeControl = (v: number) => VENTANA_MIN_MS * Math.pow(VENTANA_MAX_MS / VENTANA_MIN_MS, v / 1000);
export const controlDeVentana = (ms: number) => (1000 * Math.log(ms / VENTANA_MIN_MS)) / Math.log(VENTANA_MAX_MS / VENTANA_MIN_MS);

export const limitar = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

/** Redondeo cómodo para los controles: décimas por debajo de 1 kHz, enteros por encima. */
export const redondearFreq = (f: number) => (f < 1000 ? Math.round(f * 10) / 10 : Math.round(f));

// ---------- Ejemplos ----------

export interface Ejemplo {
  id: string;
  nombre: string;
  descripcion: string;
  a: Osc;
  b: Osc;
  ventanaMs: number;
}

export const EJEMPLOS: Ejemplo[] = [
  {
    id: 'la',
    nombre: 'La 440 Hz',
    descripcion: 'La nota con la que se afinan las orquestas: 440 ciclos por segundo.',
    a: { activo: true, forma: 'seno', freq: 440, amp: 0.8, fase: 0 },
    b: { activo: false, forma: 'seno', freq: 660, amp: 0.5, fase: 0 },
    ventanaMs: 10
  },
  {
    id: 'pulsaciones',
    nombre: 'Pulsaciones',
    descripcion: 'Dos frecuencias casi iguales (440 y 444 Hz): el volumen sube y baja 4 veces por segundo.',
    a: { activo: true, forma: 'seno', freq: 440, amp: 0.6, fase: 0 },
    b: { activo: true, forma: 'seno', freq: 444, amp: 0.6, fase: 0 },
    ventanaMs: 500
  },
  {
    id: 'octava',
    nombre: 'Octava',
    descripcion: 'Una onda con el doble de frecuencia suena una octava más aguda (relación 2:1).',
    a: { activo: true, forma: 'seno', freq: 220, amp: 0.6, fase: 0 },
    b: { activo: true, forma: 'seno', freq: 440, amp: 0.6, fase: 0 },
    ventanaMs: 20
  },
  {
    id: 'quinta',
    nombre: 'Quinta justa',
    descripcion: 'Relación 3:2: consonante, porque las dos ondas coinciden cada pocos ciclos.',
    a: { activo: true, forma: 'seno', freq: 220, amp: 0.6, fase: 0 },
    b: { activo: true, forma: 'seno', freq: 330, amp: 0.6, fase: 0 },
    ventanaMs: 30
  },
  {
    id: 'cancelacion',
    nombre: 'Cancelación',
    descripcion: 'Dos ondas iguales con 180° de diferencia se anulan: es lo que hacen los audífonos con cancelación de ruido.',
    a: { activo: true, forma: 'seno', freq: 440, amp: 0.8, fase: 0 },
    b: { activo: true, forma: 'seno', freq: 440, amp: 0.8, fase: 180 },
    ventanaMs: 10
  },
  {
    id: 'cuadrada',
    nombre: 'Cuadrada y sus armónicos',
    descripcion: 'Una onda cuadrada es un seno más sus armónicos impares: mira el espectro.',
    a: { activo: true, forma: 'cuadrada', freq: 220, amp: 0.6, fase: 0 },
    b: { activo: false, forma: 'seno', freq: 660, amp: 0.5, fase: 0 },
    ventanaMs: 20
  }
];

// ---------- Guardado ----------

export const SAVE_KEY = 'pagos-ondas:v1';

const num = (x: unknown, def: number) => (typeof x === 'number' && Number.isFinite(x) ? x : def);

function limpiarOsc(d: unknown, def: Osc): Osc {
  const o = (d && typeof d === 'object' ? d : {}) as Record<string, unknown>;
  return {
    activo: typeof o.activo === 'boolean' ? o.activo : def.activo,
    forma: FORMAS.some((f) => f.id === o.forma) ? (o.forma as Forma) : def.forma,
    freq: limitar(num(o.freq, def.freq), F_MIN, F_MAX),
    amp: limitar(num(o.amp, def.amp), 0, 1),
    fase: limitar(num(o.fase, def.fase), 0, 360)
  };
}

export function serializar(e: Estado): string {
  return JSON.stringify(e);
}

/** Lee un guardado desconocido: lo que no sirva se reemplaza por los valores iniciales. */
export function deserializar(raw: string | null): Estado {
  const base = estadoInicial();
  if (!raw) return base;
  try {
    const d = JSON.parse(raw) as Record<string, unknown>;
    return {
      a: limpiarOsc(d.a, base.a),
      b: limpiarOsc(d.b, base.b),
      ventanaMs: limitar(num(d.ventanaMs, base.ventanaMs), VENTANA_MIN_MS, VENTANA_MAX_MS),
      volumen: limitar(num(d.volumen, base.volumen), 0, 1)
    };
  } catch {
    return base;
  }
}
