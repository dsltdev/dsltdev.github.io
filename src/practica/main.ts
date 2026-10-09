// Página de práctica del DOM (/practica-dom).
//
// Este archivo también es material de estudio: toda la interfaz se construye con la API del DOM
// (createElement, append, replaceChildren, classList, dataset, addEventListener...) y nunca con innerHTML.
//
// Cómo funciona una ejecución:
//   1. Tu código y la prueba del ejercicio viajan a un <iframe sandbox="allow-scripts"> (sin allow-same-origin).
//      Así tu código corre en un origen aislado: no puede tocar esta página ni tus partidas guardadas.
//   2. Dentro del iframe se ejecuta tu código y después la prueba, que hace clic y escribe como lo haría una persona.
//   3. El iframe responde con postMessage y aquí pintamos la lista de comprobaciones.
import { EJERCICIOS, type Ejercicio } from './ejercicios';

const SAVE_KEY = 'pagos-practica:v1';
const TIEMPO_MAX_MS = 4000;

// ---------- Guardado ----------

interface Progreso {
  done: string[];
  code: Record<string, string>;
  last: string;
}

const vacio = (): Progreso => ({ done: [], code: {}, last: EJERCICIOS[0].id });
const idsValidos = new Set(EJERCICIOS.map((e) => e.id));

function cargar(): Progreso {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return vacio();
    const d = JSON.parse(raw) as Partial<Progreso>;
    const p = vacio();
    if (Array.isArray(d.done)) p.done = d.done.filter((id) => typeof id === 'string' && idsValidos.has(id));
    if (d.code && typeof d.code === 'object') {
      for (const [id, texto] of Object.entries(d.code)) {
        if (idsValidos.has(id) && typeof texto === 'string' && texto.length < 20_000) p.code[id] = texto;
      }
    }
    if (typeof d.last === 'string' && idsValidos.has(d.last)) p.last = d.last;
    return p;
  } catch {
    return vacio();
  }
}

const progreso = cargar();

function guardar() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progreso));
  } catch {
    /* sin almacenamiento la práctica funciona igual, solo que no se guarda */
  }
}

// ---------- Utilidades de DOM ----------

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', texto = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (texto) e.textContent = texto;
  return e;
}

/** Pone texto donde lo que va entre comillas invertidas se muestra como <code>. */
function textoConCodigo(destino: HTMLElement, texto: string) {
  destino.replaceChildren(
    ...texto.split('`').map((trozo, i) => {
      if (i % 2 === 0) return document.createTextNode(trozo);
      const c = el('code');
      c.textContent = trozo;
      return c;
    })
  );
}

// ---------- Documento del iframe ----------

const CSS_BASE = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;padding:12px;background:#1c1712;color:#efe6d6;font:15px/1.5 system-ui,sans-serif}
button{font:inherit;color:#1a1206;background:#e0a23e;border:0;border-radius:4px;padding:.35rem .8rem;cursor:pointer;margin:.15rem .25rem .15rem 0}
button:disabled{opacity:.45;cursor:not-allowed}
input{font:inherit;color:#efe6d6;background:#14100b;border:1px solid #4a3a24;border-radius:4px;padding:.35rem .5rem}
ul{padding-left:1.2rem}li{margin:.2rem 0}
.activo{color:#f3c778;font-weight:700}
.hecho,.hecha{text-decoration:line-through;opacity:.55}
.texto{cursor:pointer}
.borrar{margin-left:.5rem;padding:.05rem .5rem;background:#b4543f;color:#fff}
#panel{margin-top:.5rem;padding:.6rem;border:1px solid #4a3a24;border-radius:4px;background:#221b13}
[hidden]{display:none!important}
`;

// Corre dentro del iframe, antes que tu código. Sin <!-- ni cierre de script adentro, para poder incrustarlo.
const EJECUTOR = `
var __n = 0;
window.__g = function () {
  if (++__n > 300000) throw new Error('Tu código repitió demasiadas veces seguidas (¿bucle infinito?)');
};
window.__go = function (p) {
  var send = function (m) { m.src = 'practica'; m.run = p.run; parent.postMessage(m, '*'); };
  var fmt = function (v) {
    try {
      if (typeof v === 'string') return v;
      if (typeof Element !== 'undefined' && v instanceof Element) return '<' + v.tagName.toLowerCase() + '>';
      var s = JSON.stringify(v);
      return s === undefined ? String(v) : s;
    } catch (e) { return String(v); }
  };
  ['log', 'info', 'warn', 'error'].forEach(function (k) {
    console[k] = function () {
      send({ type: 'log', level: k, text: Array.prototype.map.call(arguments, fmt).join(' ') });
    };
  });
  window.addEventListener('error', function (e) { send({ type: 'error', text: e.message }); });
  var results = [];
  var check = function (cond, label) { results.push({ ok: !!cond, label: String(label) }); };
  try {
    new Function(p.code).call(window);
  } catch (e) {
    send({ type: 'done', error: (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : e), results: [] });
    return;
  }
  try {
    new Function('check', p.test)(check);
  } catch (e) {
    results.push({ ok: false, label: 'No pude comprobar tu solución: ' + (e && e.message ? e.message : e) });
  }
  send({ type: 'done', results: results });
};
`;

/**
 * Evita que un bucle infinito congele la pestaña: inserta una llamada a __g() (un contador) al inicio de
 * cada for, while y do que tenga llaves. Es una protección sencilla, no un analizador completo de JavaScript.
 */
function protegerBucles(codigo: string): string {
  let salida = '';
  let desde = 0;
  const re = /\b(?:for|while)\s*\(|\bdo\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(codigo))) {
    let fin = m.index + m[0].length;
    if (!m[0].endsWith('{')) {
      // for / while: buscar el paréntesis que cierra la condición y exigir una llave después
      let prof = 1;
      let j = fin;
      for (; j < codigo.length && prof > 0; j++) {
        if (codigo[j] === '(') prof++;
        else if (codigo[j] === ')') prof--;
      }
      const llave = /^\s*\{/.exec(codigo.slice(j));
      if (prof !== 0 || !llave) continue;
      fin = j + llave[0].length;
    }
    salida += `${codigo.slice(desde, fin)}__g();`;
    desde = fin;
    re.lastIndex = fin;
  }
  return salida + codigo.slice(desde);
}

function documentoPlano(ex: Ejercicio, extra = ''): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${CSS_BASE}</style></head><body>${ex.html}${extra}</body></html>`;
}

function documentoEjecutable(ex: Ejercicio, codigo: string, run: number): string {
  // El "<" se escapa para que nada dentro del código pueda cerrar la etiqueta <script>.
  const carga = JSON.stringify({ code: protegerBucles(codigo), test: ex.prueba, run }).replace(/</g, '\\u003c');
  return documentoPlano(ex, `<script>${EJECUTOR}</script><script>window.__go(${carga})</script>`);
}

// ---------- Referencias a la página ----------

const nav = $('pd-nav');
const nivelEl = $('pd-nivel');
const tituloEl = $('pd-title');
const conceptoEl = $('pd-concepto');
const pasosEl = $('pd-pasos');
const htmlEl = $('pd-html');
const editor = $<HTMLTextAreaElement>('pd-code');
const frame = $<HTMLIFrameElement>('pd-frame');
const resultadoEl = $('pd-result');
const consolaEl = $('pd-console');
const pistaEl = $('pd-hint');
const solucionBox = $('pd-solution');
const solucionEl = $('pd-solution-code');
const tuCodigoEl = $('pd-tucodigo');
const mdnEl = $<HTMLAnchorElement>('pd-mdn');
const barra = $('pd-bar');
const barraBox = $('pd-progress');
const textoProgreso = $('pd-progress-text');
const btnEjecutar = $<HTMLButtonElement>('pd-run');
const btnPista = $<HTMLButtonElement>('pd-btn-hint');
const btnSolucion = $<HTMLButtonElement>('pd-btn-solution');
const btnRestaurar = $<HTMLButtonElement>('pd-btn-reset');
const btnAnterior = $<HTMLButtonElement>('pd-prev');
const btnSiguiente = $<HTMLButtonElement>('pd-next');
const btnBorrarTodo = $<HTMLButtonElement>('pd-clear');

// ---------- Estado ----------

let actual: Ejercicio = EJERCICIOS[0];
let runId = 0;
let esperando = false;
let hubeError = false;
let vigilante = 0;
let aguardar = 0;
const botonesNav = new Map<string, HTMLButtonElement>();

// ---------- Navegación ----------

EJERCICIOS.forEach((ex, i) => {
  const b = el('button', 'pd-nav-btn', String(i + 1));
  b.type = 'button';
  b.title = ex.titulo;
  b.setAttribute('aria-label', `Ejercicio ${i + 1}: ${ex.titulo}`);
  b.addEventListener('click', () => seleccionar(ex.id));
  nav.appendChild(b);
  botonesNav.set(ex.id, b);
});

function pintarProgreso() {
  const hechos = progreso.done.length;
  const total = EJERCICIOS.length;
  barra.style.width = `${(hechos / total) * 100}%`;
  barraBox.setAttribute('aria-valuenow', String(hechos));
  barraBox.setAttribute('aria-valuemax', String(total));
  textoProgreso.textContent =
    hechos === total
      ? `¡Completaste los ${total} ejercicios! Ya sabes manejar el DOM.`
      : `${hechos} de ${total} ejercicios completados`;
  for (const [id, b] of botonesNav) {
    b.classList.toggle('is-done', progreso.done.includes(id));
    if (id === actual.id) b.setAttribute('aria-current', 'step');
    else b.removeAttribute('aria-current');
  }
}

function indiceActual() {
  return EJERCICIOS.findIndex((e) => e.id === actual.id);
}

function seleccionar(id: string) {
  const ex = EJERCICIOS.find((e) => e.id === id);
  if (!ex) return;
  guardarCodigoYa();
  actual = ex;
  progreso.last = id;
  guardar();
  try {
    history.replaceState(null, '', `#${id}`);
  } catch {
    /* sin historial no pasa nada */
  }

  nivelEl.textContent = `${indiceActual() + 1}/${EJERCICIOS.length} · ${ex.nivel}`;
  nivelEl.dataset.nivel = ex.nivel;
  tituloEl.textContent = ex.titulo;
  textoConCodigo(conceptoEl, ex.concepto);
  pasosEl.replaceChildren(
    ...ex.pasos.map((p) => {
      const li = el('li');
      textoConCodigo(li, p);
      return li;
    })
  );
  htmlEl.textContent = ex.html;
  editor.value = progreso.code[id] ?? ex.inicial;

  pistaEl.hidden = true;
  pistaEl.textContent = '';
  solucionBox.hidden = true;
  btnSolucion.textContent = 'Ver solución';
  btnSolucion.setAttribute('aria-expanded', 'false');
  solucionEl.textContent = ex.solucion;

  tuCodigoEl.hidden = !ex.enTuCodigo;
  tuCodigoEl.textContent = ex.enTuCodigo ? `En tu casino: ${ex.enTuCodigo}` : '';
  mdnEl.hidden = !ex.mdn;
  if (ex.mdn) {
    mdnEl.href = ex.mdn.url;
    mdnEl.textContent = `Documentación: ${ex.mdn.texto}`;
  }

  btnAnterior.disabled = indiceActual() === 0;
  btnSiguiente.disabled = indiceActual() === EJERCICIOS.length - 1;

  reiniciarEjecucion();
  frame.srcdoc = documentoPlano(ex);
  resultadoEl.replaceChildren(el('p', 'pd-dim', 'Escribe tu código y pulsa Ejecutar (o Ctrl + Enter).'));
  pintarProgreso();
}

btnAnterior.addEventListener('click', () => seleccionar(EJERCICIOS[Math.max(0, indiceActual() - 1)].id));
btnSiguiente.addEventListener('click', () => seleccionar(EJERCICIOS[Math.min(EJERCICIOS.length - 1, indiceActual() + 1)].id));

// ---------- Editor ----------

let iniciado = false; // hasta pintar el primer ejercicio el editor está vacío: no hay nada que guardar
function guardarCodigoYa() {
  if (!iniciado) return;
  clearTimeout(aguardar);
  progreso.code[actual.id] = editor.value;
  guardar();
}
function guardarCodigoLuego() {
  clearTimeout(aguardar);
  aguardar = window.setTimeout(guardarCodigoYa, 400);
}

editor.addEventListener('input', guardarCodigoLuego);

// Tab inserta dos espacios; Esc libera el Tab para poder salir del cuadro con el teclado.
let tabAtrapado = true;
editor.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    ejecutar();
  } else if (e.key === 'Escape') {
    tabAtrapado = false;
  } else if (e.key === 'Tab' && !e.shiftKey && tabAtrapado) {
    e.preventDefault();
    editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end');
    guardarCodigoLuego();
  } else if (e.key !== 'Shift' && e.key !== 'Tab') {
    tabAtrapado = true;
  }
});

// ---------- Ejecutar ----------

function reiniciarEjecucion() {
  runId++; // los mensajes de una ejecución anterior se ignoran
  esperando = false;
  hubeError = false;
  clearTimeout(vigilante);
  consolaEl.replaceChildren(el('span', 'pd-dim', 'Aquí aparece lo que imprimas con console.log(...)'));
}

function lineaConsola(texto: string, clase: string) {
  if (consolaEl.querySelector('.pd-dim')) consolaEl.replaceChildren();
  const l = el('span', clase, texto);
  consolaEl.append(l, '\n');
}

function ejecutar() {
  guardarCodigoYa();
  reiniciarEjecucion();
  esperando = true;
  resultadoEl.replaceChildren(el('p', 'pd-dim', 'Ejecutando…'));
  frame.srcdoc = documentoEjecutable(actual, editor.value, runId);
  const miRun = runId;
  vigilante = window.setTimeout(() => {
    if (!esperando || miRun !== runId) return;
    runId++;
    esperando = false;
    frame.srcdoc = documentoPlano(actual);
    resultadoEl.replaceChildren(
      mensaje('pd-error', 'Tu código tardó demasiado. ¿Hay un bucle infinito (while o for sin salida)? Revísalo y vuelve a ejecutar.')
    );
  }, TIEMPO_MAX_MS);
}

btnEjecutar.addEventListener('click', ejecutar);

function mensaje(clase: string, texto: string) {
  return el('p', clase, texto);
}

interface Comprobacion {
  ok: boolean;
  label: string;
}
interface Mensaje {
  src: string;
  run: number;
  type: 'log' | 'error' | 'done';
  level?: string;
  text?: string;
  error?: string;
  results?: Comprobacion[];
}

window.addEventListener('message', (e: MessageEvent) => {
  if (e.source !== frame.contentWindow) return;
  const d = e.data as Mensaje | null;
  if (!d || d.src !== 'practica' || d.run !== runId) return;

  if (d.type === 'log') {
    lineaConsola(d.text ?? '', d.level === 'error' ? 'pd-c-err' : d.level === 'warn' ? 'pd-c-warn' : '');
  } else if (d.type === 'error') {
    hubeError = true;
    lineaConsola(`Error: ${d.text ?? ''}`, 'pd-c-err');
  } else if (d.type === 'done') {
    esperando = false;
    clearTimeout(vigilante);
    mostrarResultados(d.results ?? [], d.error);
  }
});

function mostrarResultados(resultados: Comprobacion[], error?: string) {
  const caja = el('div', 'pd-res');
  if (error) {
    caja.append(mensaje('pd-error', `Tu código tiene un error: ${error}`), mensaje('pd-dim', 'Corrígelo y vuelve a ejecutar. ¡Los errores son parte de aprender!'));
    resultadoEl.replaceChildren(caja);
    return;
  }

  const lista = el('ul', 'pd-checks');
  for (const r of resultados) lista.append(el('li', r.ok ? 'ok' : 'bad', `${r.ok ? '✔' : '✘'} ${r.label}`));
  caja.append(lista);

  const bien = resultados.filter((r) => r.ok).length;
  if (hubeError) {
    caja.append(mensaje('pd-warn', 'Hubo un error mientras se probaba tu código (mira la consola). Corrígelo para completar el ejercicio.'));
  } else if (resultados.length > 0 && bien === resultados.length) {
    if (!progreso.done.includes(actual.id)) {
      progreso.done.push(actual.id);
      guardar();
      pintarProgreso();
    }
    caja.append(mensaje('pd-ok', '¡Muy bien! Ejercicio completado.'));
  } else {
    caja.append(mensaje('pd-dim', `Vas bien: ${bien} de ${resultados.length} comprobaciones. Revisa las que faltan y vuelve a ejecutar.`));
  }
  resultadoEl.replaceChildren(caja);
}

// ---------- Pista, solución, restaurar ----------

btnPista.addEventListener('click', () => {
  pistaEl.hidden = false;
  pistaEl.textContent = `Pista: ${actual.pista}`;
});

btnSolucion.addEventListener('click', () => {
  const abrir = solucionBox.hidden;
  solucionBox.hidden = !abrir;
  btnSolucion.textContent = abrir ? 'Ocultar solución' : 'Ver solución';
  btnSolucion.setAttribute('aria-expanded', String(abrir));
});

btnRestaurar.addEventListener('click', () => {
  if (editor.value !== actual.inicial && !confirm('¿Volver al código inicial? Se perderá lo que escribiste.')) return;
  editor.value = actual.inicial;
  guardarCodigoYa();
  editor.focus();
});

btnBorrarTodo.addEventListener('click', () => {
  if (!confirm('¿Borrar todo tu progreso y tu código guardado de esta página?')) return;
  progreso.done = [];
  progreso.code = {};
  guardar();
  seleccionar(EJERCICIOS[0].id);
});

window.addEventListener('pagehide', guardarCodigoYa);

// ---------- Arranque ----------

const desdeHash = location.hash.slice(1);
seleccionar(idsValidos.has(desdeHash) ? desdeHash : progreso.last);
iniciado = true;

// Si cambias el #ejercicio de la dirección estando en la página (enlace o marcador), se abre ese ejercicio.
window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (idsValidos.has(id) && id !== actual.id) seleccionar(id);
});
