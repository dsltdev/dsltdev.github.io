// Dibujo del osciloscopio y del espectro en canvas 2D. Todo se calcula con las funciones puras de waves.ts,
// así que lo que ves no depende del audio: funciona igual con el sonido apagado.
import { F_ESPECTRO, armonicos, onda, picoMaximo, suma, type Estado } from './waves';

export const COLOR_A = '#e0a23e';
export const COLOR_B = '#6fb3c7';
export const COLOR_SUMA = '#efe6d6';
const FONDO = '#14100b';
const REJILLA = '#2e2418';
const EJE = '#4a3a24';
const TEXTO = '#998c76';
const FUENTE = '11px "IBM Plex Mono", ui-monospace, monospace';

const fmt = (x: number, d = 1) => x.toLocaleString('es-CO', { maximumFractionDigits: d });

interface Lienzo {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
}

/** Ajusta la resolución del canvas a la pantalla (nítido en celulares) y devuelve su tamaño en píxeles CSS. */
function preparar(canvas: HTMLCanvasElement): Lienzo | null {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  if (r.width < 40 || r.height < 40) return null; // oculto o sin medida todavía
  const pw = Math.round(r.width * dpr);
  const ph = Math.round(r.height * dpr);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}

function texto(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, alinear: CanvasTextAlign, base: CanvasTextBaseline = 'alphabetic') {
  ctx.fillStyle = TEXTO;
  ctx.font = FUENTE;
  ctx.textAlign = alinear;
  ctx.textBaseline = base;
  ctx.fillText(s, x, y);
}

/** Descripción corta del estado, para lectores de pantalla. */
export function describir(e: Estado): string {
  const una = (n: string, o: Estado['a']) => (o.activo ? `${n}: ${o.forma} de ${fmt(o.freq, 1)} Hz y amplitud ${fmt(o.amp, 2)}` : `${n}: apagada`);
  return `Osciloscopio. ${una('Onda A', e.a)}. ${una('Onda B', e.b)}. Ventana de ${fmt(e.ventanaMs, 1)} milisegundos.`;
}

export function dibujarOsciloscopio(canvas: HTMLCanvasElement, e: Estado, tIni: number): void {
  const L = preparar(canvas);
  if (!L) return;
  const { ctx, w, h } = L;
  const padL = 40;
  const padR = 10;
  const padT = 10;
  const padB = 24;
  const gw = w - padL - padR;
  const gh = h - padT - padB;
  const ventana = e.ventanaMs / 1000;
  // Escala vertical: sube de medio en medio para que una sola onda ocupe bien la pantalla.
  const yMax = Math.max(1, Math.ceil(picoMaximo(e) * 2) / 2);
  const X = (t: number) => padL + ((t - tIni) / ventana) * gw;
  const Y = (v: number) => padT + gh / 2 - (v / yMax) * (gh / 2);

  ctx.fillStyle = FONDO;
  ctx.fillRect(0, 0, w, h);

  // Rejilla horizontal (amplitud)
  const paso = yMax <= 1 ? 0.5 : 1;
  ctx.lineWidth = 1;
  for (let v = -yMax; v <= yMax + 1e-9; v += paso) {
    const y = Math.round(Y(v)) + 0.5;
    ctx.strokeStyle = Math.abs(v) < 1e-9 ? EJE : REJILLA;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
    texto(ctx, fmt(v, 1), padL - 6, y, 'right', 'middle');
  }
  // Rejilla vertical (tiempo): 10 divisiones. Se rotula cada 1, 2, 5 o 10 divisiones según el ancho, para que no se pisen.
  const cadaEtiqueta = [1, 2, 5, 10].find((n) => (gw / 10) * n >= 80) ?? 10;
  for (let i = 0; i <= 10; i++) {
    const x = Math.round(padL + (i / 10) * gw) + 0.5;
    ctx.strokeStyle = REJILLA;
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + gh);
    ctx.stroke();
    if (i % cadaEtiqueta === 0) texto(ctx, `${fmt((tIni + (i / 10) * ventana) * 1000, ventana < 0.01 ? 2 : 1)} ms`, x, h - 8, i === 0 ? 'left' : i === 10 ? 'right' : 'center');
  }

  const activas = [
    { o: e.a, color: COLOR_A, nombre: 'A' },
    { o: e.b, color: COLOR_B, nombre: 'B' }
  ].filter((x) => x.o.activo);
  if (activas.length === 0) {
    texto(ctx, 'Activa al menos una onda para verla', padL + gw / 2, padT + gh / 2 - 12, 'center');
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(padL, padT, gw, gh);
  ctx.clip();
  ctx.lineJoin = 'round';

  const fMax = Math.max(...activas.map((x) => x.o.freq));
  const pxPorCiclo = gw / (fMax * ventana);
  const comprimida = pxPorCiclo < 3; // demasiados ciclos por píxel: se dibuja la envolvente
  const resultante = (est: Estado, t: number) => (activas.length === 2 ? suma(est, t) : onda(activas[0].o, t));
  const colorFinal = activas.length === 2 ? COLOR_SUMA : activas[0].color;

  if (comprimida) {
    // Por cada columna de píxeles: el mínimo y el máximo de la señal en ese tramo de tiempo.
    ctx.strokeStyle = colorFinal;
    ctx.lineWidth = 1;
    const columnas = Math.floor(gw);
    const sub = 24;
    ctx.beginPath();
    for (let c = 0; c < columnas; c++) {
      let mn = Infinity;
      let mx = -Infinity;
      for (let k = 0; k < sub; k++) {
        const t = tIni + ((c + k / sub) / columnas) * ventana;
        const v = resultante(e, t);
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      const x = padL + c + 0.5;
      ctx.moveTo(x, Y(mx));
      ctx.lineTo(x, Y(mn));
    }
    ctx.stroke();
  } else {
    const muestras = Math.max(200, Math.floor(gw * 2));
    const trazo = (f: (t: number) => number, color: string, ancho: number, punteado: boolean, alfa: number) => {
      ctx.strokeStyle = color;
      ctx.globalAlpha = alfa;
      ctx.lineWidth = ancho;
      ctx.setLineDash(punteado ? [5, 4] : []);
      ctx.beginPath();
      for (let i = 0; i <= muestras; i++) {
        const t = tIni + (i / muestras) * ventana;
        const x = X(t);
        const y = Y(f(t));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    };
    if (activas.length === 2) {
      trazo((t) => onda(e.a, t), COLOR_A, 1.5, false, 0.75);
      trazo((t) => onda(e.b, t), COLOR_B, 1.5, true, 0.85);
      trazo((t) => suma(e, t), COLOR_SUMA, 2.5, false, 1);
    } else {
      trazo((t) => onda(activas[0].o, t), activas[0].color, 2.5, false, 1);
    }
  }
  ctx.restore();

  // Leyenda
  const leyenda = activas.length === 2 ? [['A', COLOR_A], ['B', COLOR_B], ['A + B', COLOR_SUMA]] : [[activas[0].nombre, activas[0].color]];
  let lx = padL + 8;
  for (const [nombre, color] of leyenda) {
    ctx.fillStyle = color;
    ctx.fillRect(lx, padT + 8, 10, 10);
    texto(ctx, nombre, lx + 15, padT + 17, 'left');
    lx += 22 + nombre.length * 7 + 14;
  }
  if (comprimida) texto(ctx, w < 480 ? 'envolvente' : 'vista comprimida: se muestra la envolvente', w - padR - 6, padT + gh - 6, 'right');
}

export function dibujarEspectro(canvas: HTMLCanvasElement, e: Estado): void {
  const L = preparar(canvas);
  if (!L) return;
  const { ctx, w, h } = L;
  const padL = 40;
  const padR = 10;
  const padT = 10;
  const padB = 24;
  const gw = w - padL - padR;
  const gh = h - padT - padB;
  const fMin = 20;
  const yMax = 1.4; // el primer armónico de una cuadrada llega a 4/π ≈ 1,27
  const X = (f: number) => padL + (Math.log10(f / fMin) / Math.log10(F_ESPECTRO / fMin)) * gw;
  const Y = (a: number) => padT + gh - (a / yMax) * gh;

  ctx.fillStyle = FONDO;
  ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 1;
  for (const a of [0, 0.5, 1]) {
    const y = Math.round(Y(a)) + 0.5;
    ctx.strokeStyle = a === 0 ? EJE : REJILLA;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(w - padR, y);
    ctx.stroke();
    texto(ctx, fmt(a, 1), padL - 6, y, 'right', 'middle');
  }
  const marcas: [number, string][] = [[20, '20 Hz'], [50, ''], [100, '100'], [200, ''], [500, ''], [1000, '1 k'], [2000, ''], [5000, ''], [10000, '10 k'], [20000, gw < 500 ? '' : '20 k']];
  for (const [f, etiqueta] of marcas) {
    const x = Math.round(X(f)) + 0.5;
    ctx.strokeStyle = REJILLA;
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + gh);
    ctx.stroke();
    if (etiqueta) texto(ctx, etiqueta, x, h - 8, f === 20 ? 'left' : f === 20000 ? 'right' : 'center');
  }

  const series = [
    { o: e.a, color: COLOR_A, desfase: -2.5 },
    { o: e.b, color: COLOR_B, desfase: 2.5 }
  ];
  let alguna = false;
  for (const s of series) {
    if (!s.o.activo) continue;
    alguna = true;
    ctx.fillStyle = s.color;
    for (const arm of armonicos(s.o.forma, s.o.freq)) {
      const alto = (arm.a * s.o.amp * gh) / yMax;
      if (alto < 0.5) continue;
      ctx.globalAlpha = arm.n === 1 ? 1 : 0.7;
      ctx.fillRect(X(arm.f) + s.desfase - 2, padT + gh - alto, 4, alto);
    }
  }
  ctx.globalAlpha = 1;
  if (!alguna) texto(ctx, 'Sin ondas activas', padL + gw / 2, padT + gh / 2, 'center');
  texto(ctx, 'amplitud de cada armónico', w - padR - 6, padT + 12, 'right');
}
