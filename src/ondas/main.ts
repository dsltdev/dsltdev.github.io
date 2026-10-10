// Interfaz del simulador de ondas (/ondas).
//
// Flujo: los controles cambian el objeto `est` (el estado) -> `cambio()` actualiza las lecturas, el sonido y el
// dibujo. El osciloscopio y el espectro se calculan con la matemática de waves.ts, no con el audio, así que se
// ven igual con el sonido apagado. Todo el DOM se construye con createElement (nunca con innerHTML).
import { Sintetizador, audioDisponible } from './audio';
import { COLOR_A, COLOR_B, describir, dibujarEspectro, dibujarOsciloscopio } from './draw';
import {
  EJEMPLOS,
  FORMAS,
  F_MAX,
  F_MIN,
  SAVE_KEY,
  controlDeFreq,
  controlDeVentana,
  deserializar,
  estadoInicial,
  freqDeControl,
  interferencia,
  intervalo,
  limitar,
  longitudOnda,
  nota,
  periodoMs,
  picoMaximo,
  pulsaciones,
  redondearFreq,
  serializar,
  ventanaAutomatica,
  ventanaDeControl,
  type Estado,
  type Osc
} from './waves';

// ---------- Utilidades ----------

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const fmt = (x: number, d = 1) => x.toLocaleString('es-CO', { maximumFractionDigits: d });

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', texto = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texto) e.textContent = texto;
  return e;
}

function rango(id: string, min: number, max: number, paso = 1): HTMLInputElement {
  const i = el('input');
  i.type = 'range';
  i.id = id;
  i.min = String(min);
  i.max = String(max);
  i.step = String(paso);
  return i;
}

// ---------- Estado y guardado ----------

function cargar(): Estado {
  try {
    return deserializar(localStorage.getItem(SAVE_KEY));
  } catch {
    return estadoInicial();
  }
}

let est = cargar();
const sint = new Sintetizador();
const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let temporizadorGuardado = 0;
function guardarLuego() {
  clearTimeout(temporizadorGuardado);
  temporizadorGuardado = window.setTimeout(() => {
    try {
      localStorage.setItem(SAVE_KEY, serializar(est));
    } catch {
      /* sin almacenamiento el simulador funciona igual, solo que no recuerda tus ajustes */
    }
  }, 300);
}

// ---------- Referencias a la página ----------

const lienzoOnda = $<HTMLCanvasElement>('wv-scope');
const lienzoEspectro = $<HTMLCanvasElement>('wv-spec');
const ventanaCtl = $<HTMLInputElement>('wv-win');
const ventanaOut = $('wv-win-out');
const botonAuto = $<HTMLButtonElement>('wv-auto');
const animarChk = $<HTMLInputElement>('wv-anim');
const contenedorOndas = $('wv-osc');
const contenedorEjemplos = $('wv-presets');
const ejemploDesc = $('wv-preset-desc');
const infoEl = $('wv-info');
const botonSonido = $<HTMLButtonElement>('wv-sound');
const volumenCtl = $<HTMLInputElement>('wv-vol');
const volumenOut = $('wv-vol-out');
const estadoSonido = $('wv-sound-state');
const botonReiniciar = $<HTMLButtonElement>('wv-reset');

// ---------- Dibujo ----------

let animando = false;
let tAnim = 0;
let inicioAnim = 0;
let marco = 0;
let pendiente = false;

function redibujar() {
  dibujarOsciloscopio(lienzoOnda, est, animando ? tAnim : 0);
  dibujarEspectro(lienzoEspectro, est);
}

function pedirDibujo() {
  if (pendiente || animando) return;
  pendiente = true;
  requestAnimationFrame(() => {
    pendiente = false;
    redibujar();
  });
}

function bucleAnimacion(ahora: number) {
  if (!animando) return;
  // La onda se desplaza un cuarto de ventana por segundo: se ve moverse sin marearse.
  tAnim = ((ahora - inicioAnim) / 1000) * (est.ventanaMs / 1000) * 0.25;
  redibujar();
  marco = requestAnimationFrame(bucleAnimacion);
}

function fijarAnimacion(on: boolean) {
  animando = on;
  cancelAnimationFrame(marco);
  if (on) {
    inicioAnim = performance.now();
    marco = requestAnimationFrame(bucleAnimacion);
  } else {
    tAnim = 0;
    redibujar();
  }
}

animarChk.checked = false;
animarChk.addEventListener('change', () => fijarAnimacion(animarChk.checked));

new ResizeObserver(pedirDibujo).observe(lienzoOnda);
new ResizeObserver(pedirDibujo).observe(lienzoEspectro);

// ---------- Paneles de cada onda ----------

interface Panel {
  /** Pone todos los controles según el estado (tras un ejemplo, al reiniciar o al cargar). */
  sync(): void;
  /** Actualiza solo lo que se lee (sin tocar los controles que la persona está moviendo). */
  lectura(): void;
}

function crearPanel(clave: 'a' | 'b'): Panel {
  const nombre = clave === 'a' ? 'Onda A' : 'Onda B';
  const color = clave === 'a' ? COLOR_A : COLOR_B;
  const o = (): Osc => est[clave];

  const caja = el('section', 'wv-panel');
  caja.style.setProperty('--c', color);

  // Encabezado: interruptor + nombre
  const cab = el('div', 'wv-panel-head');
  const activo = el('input');
  activo.type = 'checkbox';
  activo.id = `wv-${clave}-on`;
  const titulo = el('label', 'wv-panel-title');
  titulo.htmlFor = activo.id;
  titulo.append(el('span', 'wv-swatch'), document.createTextNode(nombre));
  cab.append(activo, titulo);

  // Forma de onda
  const formas = el('div', 'wv-formas');
  formas.setAttribute('role', 'group');
  formas.setAttribute('aria-label', `Forma de la ${nombre}`);
  const botonesForma = FORMAS.map((f) => {
    const b = el('button', 'wv-forma', f.nombre);
    b.type = 'button';
    b.addEventListener('click', () => {
      o().forma = f.id;
      botonesForma.forEach((x, i) => x.setAttribute('aria-pressed', String(FORMAS[i].id === f.id)));
      cambio();
    });
    formas.appendChild(b);
    return b;
  });

  // Frecuencia: control logarítmico + cuadro numérico
  const fFila = el('div', 'wv-campo');
  const fEtiqueta = el('label', '', 'Frecuencia');
  const fCtl = rango(`wv-${clave}-f`, 0, 1000);
  fEtiqueta.htmlFor = fCtl.id;
  const fNum = el('input', 'wv-num');
  fNum.type = 'text';
  fNum.inputMode = 'decimal';
  fNum.id = `wv-${clave}-fn`;
  fNum.setAttribute('aria-label', `${nombre}: frecuencia en hercios`);
  const fUnidad = el('span', 'wv-unidad', 'Hz');
  const fControles = el('div', 'wv-doble');
  fControles.append(fCtl, fNum, fUnidad);
  fFila.append(fEtiqueta, fControles);

  fCtl.addEventListener('input', () => {
    o().freq = redondearFreq(freqDeControl(Number(fCtl.value)));
    fNum.value = fmt(o().freq, 1);
    cambio();
  });
  fNum.addEventListener('input', () => {
    const v = parseFloat(fNum.value.replace(',', '.'));
    if (!Number.isFinite(v) || v < F_MIN || v > F_MAX) return;
    o().freq = v;
    fCtl.value = String(Math.round(controlDeFreq(v)));
    cambio();
  });
  fNum.addEventListener('change', () => {
    const v = parseFloat(fNum.value.replace(',', '.'));
    o().freq = Number.isFinite(v) ? limitar(v, F_MIN, F_MAX) : o().freq;
    fNum.value = fmt(o().freq, 2);
    fCtl.value = String(Math.round(controlDeFreq(o().freq)));
    cambio();
  });

  // Amplitud
  const aFila = el('div', 'wv-campo');
  const aEtiqueta = el('label', '', 'Amplitud');
  const aCtl = rango(`wv-${clave}-a`, 0, 100);
  aEtiqueta.htmlFor = aCtl.id;
  const aOut = el('output', 'wv-out');
  aOut.htmlFor = aCtl.id;
  const aControles = el('div', 'wv-doble');
  aControles.append(aCtl, aOut);
  aFila.append(aEtiqueta, aControles);
  aCtl.addEventListener('input', () => {
    o().amp = Number(aCtl.value) / 100;
    cambio();
  });

  // Fase (solo la onda B: la A es la referencia)
  let fCtlFase: HTMLInputElement | null = null;
  let faseOut: HTMLOutputElement | null = null;
  let faseFila: HTMLElement | null = null;
  if (clave === 'b') {
    faseFila = el('div', 'wv-campo');
    const pEtiqueta = el('label', '', 'Fase respecto a A');
    fCtlFase = rango('wv-b-p', 0, 360);
    pEtiqueta.htmlFor = fCtlFase.id;
    faseOut = el('output', 'wv-out');
    faseOut.htmlFor = fCtlFase.id;
    const pControles = el('div', 'wv-doble');
    pControles.append(fCtlFase, faseOut);
    faseFila.append(pEtiqueta, pControles);
    const ctl = fCtlFase;
    ctl.addEventListener('input', () => {
      o().fase = Number(ctl.value);
      cambio();
    });
  }

  const lecturaEl = el('p', 'wv-read');
  lecturaEl.id = `wv-${clave}-read`;

  activo.addEventListener('change', () => {
    o().activo = activo.checked;
    cambio();
  });

  caja.append(cab, formas, fFila, aFila);
  if (faseFila) caja.append(faseFila);
  caja.append(lecturaEl);
  contenedorOndas.appendChild(caja);

  const lectura = () => {
    const w = o();
    aOut.textContent = `${Math.round(w.amp * 100)} %`;
    if (faseOut) faseOut.textContent = `${Math.round(w.fase)}°`;
    caja.classList.toggle('is-off', !w.activo);
    const n = nota(w.freq);
    const cents = n.cents === 0 ? '' : ` (${n.cents > 0 ? '+' : ''}${n.cents} cents)`;
    const lon = longitudOnda(w.freq);
    lecturaEl.textContent = `≈ ${n.nombre}${cents} · periodo ${fmt(periodoMs(w.freq), 2)} ms · longitud de onda ${lon >= 1 ? `${fmt(lon, 2)} m` : `${fmt(lon * 100, 1)} cm`}`;
  };

  return {
    lectura,
    sync() {
      const w = o();
      activo.checked = w.activo;
      botonesForma.forEach((b, i) => b.setAttribute('aria-pressed', String(FORMAS[i].id === w.forma)));
      fCtl.value = String(Math.round(controlDeFreq(w.freq)));
      fNum.value = fmt(w.freq, 2);
      aCtl.value = String(Math.round(w.amp * 100));
      if (fCtlFase) fCtlFase.value = String(Math.round(w.fase));
      lectura();
    }
  };
}

const paneles = [crearPanel('a'), crearPanel('b')];

// ---------- Ventana de tiempo ----------

function pintarVentana() {
  const ms = est.ventanaMs;
  ventanaOut.textContent = `${fmt(ms, ms < 10 ? 2 : 1)} ms en pantalla · ${fmt(ms / 10, ms < 10 ? 3 : 2)} ms por división`;
}

ventanaCtl.addEventListener('input', () => {
  est.ventanaMs = ventanaDeControl(Number(ventanaCtl.value));
  pintarVentana();
  guardarLuego();
  pedirDibujo();
});

botonAuto.addEventListener('click', () => {
  const ms = ventanaAutomatica(est);
  if (ms === null) return;
  est.ventanaMs = ms;
  ventanaCtl.value = String(Math.round(controlDeVentana(ms)));
  pintarVentana();
  guardarLuego();
  pedirDibujo();
});

// ---------- Información combinada ----------

function pintarInfo() {
  const lineas: string[] = [];
  const { a, b } = est;
  if (!a.activo && !b.activo) {
    lineas.push('Activa la onda A o la B para empezar.');
  } else if (a.activo && b.activo) {
    const iv = intervalo(a.freq, b.freq);
    lineas.push(
      iv
        ? `Intervalo entre A y B: ${iv.nombre} (${iv.razon}). Las frecuencias están en una razón de números enteros pequeños, por eso suenan consonantes.`
        : `Razón entre las frecuencias (B ÷ A): ${fmt(b.freq / a.freq, 3)}.`
    );
    const p = pulsaciones(est);
    if (p !== null) lineas.push(`Pulsaciones: ${fmt(p, 1)} por segundo. Las dos ondas se suman y se restan alternadamente, y el volumen sube y baja ${fmt(p, 1)} veces cada segundo.`);
    const inter = interferencia(est);
    if (inter === 'constructiva') lineas.push('Interferencia constructiva: las ondas están en fase y se suman, la amplitud se duplica.');
    if (inter === 'destructiva') {
      const iguales = a.forma === b.forma && Math.abs(a.amp - b.amp) < 0.005;
      lineas.push(iguales ? 'Interferencia destructiva: las ondas están en oposición y se anulan por completo (así funciona la cancelación de ruido).' : 'Interferencia destructiva: las ondas están en oposición y se restan.');
    }
  }
  if (a.activo || b.activo) lineas.push(`Pico máximo posible de la suma: ${fmt(picoMaximo(est), 2)} (con amplitud 1 = nivel máximo).`);
  infoEl.replaceChildren(...lineas.map((t) => el('li', '', t)));
}

// ---------- Sonido ----------

function pintarSonido() {
  const on = sint.activo;
  botonSonido.textContent = on ? '🔇 Silenciar' : '🔊 Activar sonido';
  botonSonido.setAttribute('aria-pressed', String(on));
  if (!audioDisponible()) estadoSonido.textContent = 'Este navegador no permite audio.';
  else if (!on) estadoSonido.textContent = 'Sonido apagado.';
  else estadoSonido.textContent = picoMaximo(est) > 0 ? 'Sonando.' : 'Sonido activado, pero no hay ondas activas.';
}

function apagarSonido() {
  sint.detener();
  pintarSonido();
}

botonSonido.addEventListener('click', async () => {
  if (sint.activo) {
    apagarSonido();
    return;
  }
  botonSonido.disabled = true;
  try {
    await sint.iniciar(est);
  } catch {
    estadoSonido.textContent = 'No se pudo activar el sonido en este navegador.';
    botonSonido.disabled = false;
    return;
  }
  botonSonido.disabled = false;
  pintarSonido();
});

volumenCtl.addEventListener('input', () => {
  est.volumen = Number(volumenCtl.value) / 100;
  volumenOut.textContent = `${Math.round(est.volumen * 100)} %`;
  sint.aplicar(est);
  guardarLuego();
});

// Buena educación: si la pestaña queda en segundo plano, el sonido se apaga.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && sint.activo) apagarSonido();
});
window.addEventListener('pagehide', () => sint.detener(true));

// ---------- Cambios ----------

function cambio() {
  paneles.forEach((p) => p.lectura());
  pintarInfo();
  pintarSonido();
  lienzoOnda.setAttribute('aria-label', describir(est));
  sint.aplicar(est);
  guardarLuego();
  pedirDibujo();
}

function sincronizarTodo() {
  paneles.forEach((p) => p.sync());
  ventanaCtl.value = String(Math.round(controlDeVentana(est.ventanaMs)));
  volumenCtl.value = String(Math.round(est.volumen * 100));
  volumenOut.textContent = `${Math.round(est.volumen * 100)} %`;
  pintarVentana();
  cambio();
}

// ---------- Ejemplos ----------

for (const ej of EJEMPLOS) {
  const b = el('button', 'wv-chip', ej.nombre);
  b.type = 'button';
  b.addEventListener('click', () => {
    est = { ...est, a: { ...ej.a }, b: { ...ej.b }, ventanaMs: ej.ventanaMs };
    ejemploDesc.textContent = ej.descripcion;
    sincronizarTodo();
  });
  contenedorEjemplos.appendChild(b);
}

botonReiniciar.addEventListener('click', () => {
  est = estadoInicial();
  ejemploDesc.textContent = '';
  sincronizarTodo();
});

// ---------- Arranque ----------

if (!audioDisponible()) botonSonido.disabled = true;
if (reducirMovimiento) animarChk.title = 'Tu dispositivo pide menos movimiento: la animación está apagada.';
sincronizarTodo();
