// Nombre con el que guardamos las sesiones en el navegador
const CLAVE_GUARDADO = "diario-de-estudio";

// Elementos de la página que vamos a usar
const formulario = document.getElementById("formulario");
const campoFecha = document.getElementById("fecha");
const campoTema = document.getElementById("tema");
const campoMinutos = document.getElementById("minutos");
const mensajeError = document.getElementById("error");
const lista = document.getElementById("lista");
const mensajeVacio = document.getElementById("vacio");
const rachaNumero = document.getElementById("racha-numero");
const rachaTexto = document.getElementById("racha-texto");

// Todas las sesiones registradas. Cada sesión es un objeto:
// { fecha: "2026-10-02", tema: "Bucles", minutos: 30, creadaEn: 1759... }
let sesiones = leerDeLocalStorage();

/* ------------------------------------------------------------------
   Fechas
   Trabajamos siempre con la fecha local del usuario (nunca UTC).
   Para eso guardamos cada día como un texto "AAAA-MM-DD" construido
   con getFullYear, getMonth y getDate, que ya devuelven hora local.
------------------------------------------------------------------ */

function aTextoDeDia(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return anio + "-" + mes + "-" + dia;
}

function diaDeHoy() {
  return aTextoDeDia(new Date());
}

// Convierte "2026-10-02" en un objeto Date a medianoche en hora local
function aFechaLocal(textoDeDia) {
  const partes = textoDeDia.split("-");
  const anio = Number(partes[0]);
  const mes = Number(partes[1]);
  const dia = Number(partes[2]);
  return new Date(anio, mes - 1, dia);
}

function diaAnterior(textoDeDia) {
  const fecha = aFechaLocal(textoDeDia);
  fecha.setDate(fecha.getDate() - 1);
  return aTextoDeDia(fecha);
}

// "2026-10-02" -> "Viernes, 2 de octubre de 2026"
function diaEnBonito(textoDeDia) {
  const texto = aFechaLocal(textoDeDia).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/* ------------------------------------------------------------------
   Guardar y leer en localStorage
------------------------------------------------------------------ */

function leerDeLocalStorage() {
  try {
    const guardado = localStorage.getItem(CLAVE_GUARDADO);
    if (!guardado) {
      return [];
    }
    const datos = JSON.parse(guardado);
    return Array.isArray(datos) ? datos : [];
  } catch (error) {
    // Si los datos están corruptos empezamos de cero en lugar de romper la web
    return [];
  }
}

function guardarEnLocalStorage() {
  try {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(sesiones));
  } catch (error) {
    mensajeError.textContent = "No se han podido guardar los datos en este navegador.";
  }
}

/* ------------------------------------------------------------------
   Racha
   Un día cuenta si tiene al menos una sesión.
   La racha son los días consecutivos con sesión que terminan hoy.
   Si hoy todavía no he estudiado pero ayer sí, la racha sigue viva.
------------------------------------------------------------------ */

function calcularRacha() {
  // Días que tienen al menos una sesión, sin repetidos
  const diasConSesion = new Set();
  for (const sesion of sesiones) {
    diasConSesion.add(sesion.fecha);
  }

  const hoy = diaDeHoy();
  let diaActual = hoy;

  // Si hoy no hay sesión, la racha todavía puede estar viva desde ayer
  if (!diasConSesion.has(diaActual)) {
    diaActual = diaAnterior(hoy);
    if (!diasConSesion.has(diaActual)) {
      return 0;
    }
  }

  // Vamos hacia atrás día a día mientras encontremos sesiones
  let racha = 0;
  while (diasConSesion.has(diaActual)) {
    racha = racha + 1;
    diaActual = diaAnterior(diaActual);
  }
  return racha;
}

/* ------------------------------------------------------------------
   Pintar la pantalla
------------------------------------------------------------------ */

function mostrarRacha() {
  const racha = calcularRacha();
  rachaNumero.textContent = racha;

  if (racha === 0) {
    rachaTexto.textContent = "Empieza hoy tu racha";
  } else if (racha === 1) {
    rachaTexto.textContent = "día seguido estudiando";
  } else {
    rachaTexto.textContent = "días seguidos estudiando";
  }
}

function mostrarSesiones() {
  // Ordenamos de la más reciente a la más antigua.
  // Si dos sesiones son del mismo día, primero la que se añadió después.
  const ordenadas = sesiones.slice().sort(function (a, b) {
    if (a.fecha !== b.fecha) {
      return a.fecha < b.fecha ? 1 : -1;
    }
    return b.creadaEn - a.creadaEn;
  });

  lista.textContent = "";
  mensajeVacio.hidden = ordenadas.length > 0;

  for (const sesion of ordenadas) {
    const tema = document.createElement("p");
    tema.className = "sesion-tema";
    tema.textContent = sesion.tema;

    const fecha = document.createElement("p");
    fecha.className = "sesion-fecha";
    fecha.textContent = diaEnBonito(sesion.fecha);

    const textos = document.createElement("div");
    textos.appendChild(tema);
    textos.appendChild(fecha);

    const minutos = document.createElement("span");
    minutos.className = "sesion-minutos";
    minutos.textContent = sesion.minutos + " min";

    const elemento = document.createElement("li");
    elemento.className = "sesion";
    elemento.appendChild(textos);
    elemento.appendChild(minutos);

    lista.appendChild(elemento);
  }
}

/* ------------------------------------------------------------------
   Formulario
------------------------------------------------------------------ */

formulario.addEventListener("submit", function (evento) {
  evento.preventDefault();

  const fecha = campoFecha.value;
  const tema = campoTema.value.trim();
  const minutos = Number(campoMinutos.value);

  // Comprobamos los datos antes de guardar
  if (!fecha) {
    mensajeError.textContent = "Elige la fecha de la sesión.";
    return;
  }
  if (!tema) {
    mensajeError.textContent = "Escribe el tema que has estudiado.";
    return;
  }
  if (campoMinutos.value === "" || isNaN(minutos) || minutos <= 0) {
    mensajeError.textContent = "Los minutos tienen que ser un número mayor que 0.";
    return;
  }

  mensajeError.textContent = "";

  sesiones.push({
    fecha: fecha,
    tema: tema,
    minutos: minutos,
    creadaEn: Date.now(),
  });

  guardarEnLocalStorage();
  mostrarRacha();
  mostrarSesiones();

  // Dejamos el formulario listo para la siguiente sesión
  campoTema.value = "";
  campoMinutos.value = "";
  campoFecha.value = diaDeHoy();
  campoTema.focus();
});

/* ------------------------------------------------------------------
   Arranque
------------------------------------------------------------------ */

// La fecha empieza en hoy, pero se puede cambiar para apuntar días anteriores
campoFecha.value = diaDeHoy();
campoFecha.max = diaDeHoy();

mostrarRacha();
mostrarSesiones();
