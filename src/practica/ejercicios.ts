// Ejercicios de la página /practica-dom. Son solo datos: la interfaz está en main.ts.
//
// Cada ejercicio trae un HTML de partida, un código inicial, una pista y una solución.
// `prueba` es el cuerpo de una función que recibe `check(condicion, mensaje)`; se ejecuta
// dentro del iframe de práctica DESPUÉS de tu código, así que puede leer y hacer clic en
// lo que construiste. En las cadenas de código se evitan las comillas invertidas a propósito.

export interface Ejercicio {
  id: string;
  titulo: string;
  nivel: 'Básico' | 'Intermedio' | 'Reto';
  /** Texto con `código` entre comillas invertidas. */
  concepto: string;
  pasos: string[];
  /** HTML con el que arranca el ejercicio (se muestra y se usa en la vista previa). */
  html: string;
  inicial: string;
  pista: string;
  solucion: string;
  prueba: string;
  /** Dónde se usa esta idea en el casino. */
  enTuCodigo?: string;
  mdn?: { texto: string; url: string };
}

const MDN = 'https://developer.mozilla.org/es/docs/Web';

export const EJERCICIOS: Ejercicio[] = [
  {
    id: 'texto',
    titulo: 'Cambiar un texto',
    nivel: 'Básico',
    concepto:
      'Todo empieza por encontrar el elemento. `document.getElementById(\'id\')` devuelve el elemento con ese id y `textContent` lee o cambia su texto de forma segura (sin interpretar HTML).',
    pasos: [
      'Cambia el texto del título (`#titulo`) para que diga: Hola, DOM',
      'Cambia el texto del párrafo (`#subtitulo`) para que diga: Ya sé cambiar texto'
    ],
    html: '<h1 id="titulo">Hola, mundo</h1>\n<p id="subtitulo">Texto original</p>',
    inicial: "// Busca los elementos y cambia su textContent\nconst titulo = document.getElementById('titulo');\n",
    pista: "Una vez tienes el elemento en una variable, se cambia así: titulo.textContent = 'nuevo texto';",
    solucion:
      "const titulo = document.getElementById('titulo');\ntitulo.textContent = 'Hola, DOM';\n\ndocument.getElementById('subtitulo').textContent = 'Ya sé cambiar texto';",
    prueba: `
      check(document.getElementById('titulo').textContent.trim() === 'Hola, DOM', 'El título dice "Hola, DOM"');
      check(document.getElementById('subtitulo').textContent.trim() === 'Ya sé cambiar texto', 'El párrafo dice "Ya sé cambiar texto"');
    `,
    enTuCodigo: 'src/casino/main.ts, updateHud(): chipsEl.textContent = money(wallet.chips) actualiza el saldo en pantalla.',
    mdn: { texto: 'Document.getElementById', url: `${MDN}/API/Document/getElementById` }
  },
  {
    id: 'clases',
    titulo: 'Buscar con selectores CSS y mover una clase',
    nivel: 'Básico',
    concepto:
      '`querySelector(\'.clase\')` devuelve el primer elemento que coincide con un selector CSS y `querySelectorAll` devuelve todos. `classList.add`, `remove` y `toggle` cambian sus clases sin tocar las demás.',
    pasos: [
      'Hoy el elemento activo del menú es "Inicio". Quítale la clase `activo`.',
      'Ponle la clase `activo` al segundo elemento (`Juegos`).'
    ],
    html: '<ul class="menu">\n  <li class="item activo">Inicio</li>\n  <li class="item">Juegos</li>\n  <li class="item">Contacto</li>\n</ul>',
    inicial: "// 1) Encuentra el que tiene .activo y quítale la clase\n// 2) Ponle la clase al segundo .item\n",
    pista: "querySelectorAll('.item') devuelve una lista numerada desde 0: el segundo elemento es el [1].",
    solucion:
      "document.querySelector('.activo').classList.remove('activo');\ndocument.querySelectorAll('.item')[1].classList.add('activo');",
    prueba: `
      const activos = document.querySelectorAll('.activo');
      check(activos.length === 1, 'Hay exactamente un elemento con la clase activo (hay ' + activos.length + ')');
      check(activos.length === 1 && activos[0].textContent.trim() === 'Juegos', 'El elemento activo es "Juegos"');
      check(document.querySelectorAll('li.item').length === 3, 'Los tres elementos conservan la clase item');
    `,
    enTuCodigo: "src/casino/main.ts: li.classList.toggle('is-on', i <= idx) marca los niveles alcanzados en \"Mi cuenta\".",
    mdn: { texto: 'Element.classList', url: `${MDN}/API/Element/classList` }
  },
  {
    id: 'recorrer',
    titulo: 'Recorrer varios elementos',
    nivel: 'Básico',
    concepto:
      '`querySelectorAll` devuelve una lista de elementos que se puede recorrer con `forEach` o con `for...of`. Dentro del bucle, cada elemento se cambia por separado.',
    pasos: ['Agrega el símbolo $ al principio del texto de cada precio (`1000` pasa a `$1000`).'],
    html: '<ul>\n  <li class="precio">1000</li>\n  <li class="precio">2500</li>\n  <li class="precio">400</li>\n</ul>',
    inicial: "// Recorre todos los .precio y cambia el texto de cada uno\n",
    pista: "Dentro del forEach: el.textContent = '$' + el.textContent;",
    solucion:
      "document.querySelectorAll('.precio').forEach((el) => {\n  el.textContent = '$' + el.textContent;\n});",
    prueba: `
      const textos = Array.from(document.querySelectorAll('.precio')).map((el) => el.textContent.trim());
      check(textos.length === 3, 'Siguen los tres precios');
      check(JSON.stringify(textos) === JSON.stringify(['$1000', '$2500', '$400']), 'Los precios dicen $1000, $2500 y $400. Ahora dicen: ' + textos.join(', '));
    `,
    enTuCodigo: "src/casino/main.ts: document.querySelectorAll('.cs-levels li').forEach(...) recorre los niveles.",
    mdn: { texto: 'NodeList.forEach', url: `${MDN}/API/NodeList/forEach` }
  },
  {
    id: 'atributos',
    titulo: 'Atributos y data-*',
    nivel: 'Básico',
    concepto:
      'Los atributos `data-algo` del HTML se leen con `elemento.dataset.algo` (siempre como texto). Propiedades como `disabled` se asignan directamente: `boton.disabled = true`.',
    pasos: [
      'Recorre los botones `.comprar`.',
      'Si su `data-stock` es 0, desactívalos y cambia su texto a: Agotado'
    ],
    html: '<button class="comprar" data-stock="3">Comprar</button>\n<button class="comprar" data-stock="0">Comprar</button>\n<button class="comprar" data-stock="7">Comprar</button>',
    inicial: "// dataset.stock llega como texto: conviértelo con Number(...)\n",
    pista: "if (Number(boton.dataset.stock) === 0) { boton.disabled = true; boton.textContent = 'Agotado'; }",
    solucion:
      "document.querySelectorAll('.comprar').forEach((boton) => {\n  if (Number(boton.dataset.stock) === 0) {\n    boton.disabled = true;\n    boton.textContent = 'Agotado';\n  }\n});",
    prueba: `
      const b = document.querySelectorAll('.comprar');
      check(b[1].disabled === true, 'El botón sin stock está desactivado');
      check(b[1].textContent.trim() === 'Agotado', 'El botón sin stock dice "Agotado"');
      check(!b[0].disabled && !b[2].disabled, 'Los botones con stock siguen activos');
      check(b[0].textContent.trim() === 'Comprar' && b[2].textContent.trim() === 'Comprar', 'Los botones con stock siguen diciendo "Comprar"');
    `,
    enTuCodigo: 'src/casino/main.ts: dailyBtn.disabled = !can bloquea el regalo diario, y b.dataset.break lee los minutos de cada pausa.',
    mdn: { texto: 'HTMLElement.dataset', url: `${MDN}/API/HTMLElement/dataset` }
  },
  {
    id: 'crear',
    titulo: 'Crear elementos desde datos',
    nivel: 'Intermedio',
    concepto:
      '`document.createElement(\'li\')` crea un elemento que todavía no está en la página. Se le pone contenido y se inserta con `padre.append(hijo)`. Es la base de todo lo que se dibuja a partir de datos.',
    pasos: ['Por cada nombre del arreglo `juegos`, crea un `<li>` con ese texto.', 'Agrégalos, en orden, a la lista `#juegos`.'],
    html: '<ul id="juegos"></ul>',
    inicial: "const juegos = ['Tragamonedas', 'Blackjack', 'Ruleta'];\n\n// Crea un <li> por cada juego y agrégalo a #juegos\n",
    pista: "for (const nombre of juegos) { const li = document.createElement('li'); li.textContent = nombre; lista.append(li); }",
    solucion:
      "const juegos = ['Tragamonedas', 'Blackjack', 'Ruleta'];\nconst lista = document.getElementById('juegos');\n\nfor (const nombre of juegos) {\n  const li = document.createElement('li');\n  li.textContent = nombre;\n  lista.append(li);\n}",
    prueba: `
      const items = Array.from(document.querySelectorAll('#juegos li')).map((li) => li.textContent.trim());
      check(items.length === 3, 'La lista tiene 3 elementos (tiene ' + items.length + ')');
      check(JSON.stringify(items) === JSON.stringify(['Tragamonedas', 'Blackjack', 'Ruleta']), 'Los textos están en orden: Tragamonedas, Blackjack, Ruleta');
    `,
    enTuCodigo: 'src/casino/shell.ts, h(): una función de 5 líneas que crea elementos. Todas las cartas del blackjack nacen de ahí.',
    mdn: { texto: 'Document.createElement', url: `${MDN}/API/Document/createElement` }
  },
  {
    id: 'borrar',
    titulo: 'Borrar elementos',
    nivel: 'Intermedio',
    concepto:
      '`elemento.remove()` quita un elemento de la página. Al borrar, acuérdate de actualizar todo lo que dependía de él (contadores, totales).',
    pasos: ['Quita de la lista todas las tareas con la clase `hecha`.', 'Actualiza `#pendientes` con el número de tareas que quedaron.'],
    html: '<ul id="tareas">\n  <li class="hecha">Instalar Astro</li>\n  <li>Leer sobre el DOM</li>\n  <li class="hecha">Abrir DevTools</li>\n  <li>Hacer los ejercicios</li>\n</ul>\n<p>Pendientes: <strong id="pendientes">4</strong></p>',
    inicial: "// 1) Quita cada .hecha con remove()\n// 2) Cuenta los <li> que quedan y escríbelo en #pendientes\n",
    pista: "document.querySelectorAll('#tareas li').length te da cuántos <li> quedan. Pásalo a textContent.",
    solucion:
      "document.querySelectorAll('.hecha').forEach((li) => li.remove());\n\nconst quedan = document.querySelectorAll('#tareas li').length;\ndocument.getElementById('pendientes').textContent = quedan;",
    prueba: `
      const items = Array.from(document.querySelectorAll('#tareas li')).map((li) => li.textContent.trim());
      check(items.length === 2, 'Quedan 2 tareas (quedan ' + items.length + ')');
      check(JSON.stringify(items) === JSON.stringify(['Leer sobre el DOM', 'Hacer los ejercicios']), 'Quedan las tareas pendientes, no las hechas');
      check(document.getElementById('pendientes').textContent.trim() === '2', 'El contador de pendientes dice 2');
    `,
    enTuCodigo: 'src/casino/ui-blackjack.ts, render(): handsBox.replaceChildren() vacía las manos antes de volver a pintarlas.',
    mdn: { texto: 'Element.remove', url: `${MDN}/API/Element/remove` }
  },
  {
    id: 'clic',
    titulo: 'Reaccionar a un clic',
    nivel: 'Intermedio',
    concepto:
      '`elemento.addEventListener(\'click\', funcion)` ejecuta la función cada vez que se hace clic. El código se escribe una vez y se ejecuta muchas veces, así que el estado (la cuenta) debe vivir fuera de la función.',
    pasos: ['Cada clic en `#sumar` debe aumentar en 1 el número de `#n`.', 'Al cargar, el contador debe seguir en 0.'],
    html: '<p>Clics: <strong id="n">0</strong></p>\n<button id="sumar">Sumar</button>',
    inicial: "let cuenta = 0;\n\n// Escucha el clic de #sumar y actualiza #n\n",
    pista: "Dentro de la función del evento: cuenta++; n.textContent = cuenta;",
    solucion:
      "let cuenta = 0;\nconst n = document.getElementById('n');\n\ndocument.getElementById('sumar').addEventListener('click', () => {\n  cuenta++;\n  n.textContent = cuenta;\n});",
    prueba: `
      const n = document.getElementById('n');
      const boton = document.getElementById('sumar');
      check(n.textContent.trim() === '0', 'Al cargar el contador sigue en 0');
      boton.click(); boton.click(); boton.click();
      check(n.textContent.trim() === '3', 'Después de 3 clics el contador marca 3 (marca ' + n.textContent.trim() + ')');
    `,
    enTuCodigo: "src/casino/main.ts: dailyBtn.addEventListener('click', ...) reclama el regalo del día.",
    mdn: { texto: 'EventTarget.addEventListener', url: `${MDN}/API/EventTarget/addEventListener` }
  },
  {
    id: 'input',
    titulo: 'Escuchar lo que escribe el usuario',
    nivel: 'Intermedio',
    concepto:
      'El evento `input` se dispara con cada tecla escrita. El valor del campo está en `campo.value`. Con `trim()` se quitan los espacios sobrantes de los lados.',
    pasos: [
      'Mientras la persona escribe su nombre, `#saludo` debe decir: Hola, (nombre)',
      'Si el campo queda vacío, debe volver a decir: Hola, desconocido'
    ],
    html: '<label>Tu nombre <input id="nombre" type="text" /></label>\n<p id="saludo">Hola, desconocido</p>',
    inicial: "// Escucha el evento 'input' del campo #nombre\n",
    pista: "const nombre = campo.value.trim();  y luego  'Hola, ' + (nombre || 'desconocido')",
    solucion:
      "const campo = document.getElementById('nombre');\nconst saludo = document.getElementById('saludo');\n\ncampo.addEventListener('input', () => {\n  const nombre = campo.value.trim();\n  saludo.textContent = 'Hola, ' + (nombre || 'desconocido');\n});",
    prueba: `
      const campo = document.getElementById('nombre');
      const saludo = document.getElementById('saludo');
      const escribir = (t) => { campo.value = t; campo.dispatchEvent(new Event('input', { bubbles: true })); };
      escribir('Ana');
      check(saludo.textContent.trim() === 'Hola, Ana', 'Con "Ana" dice "Hola, Ana"');
      escribir('David López');
      check(saludo.textContent.trim() === 'Hola, David López', 'Con "David López" dice "Hola, David López"');
      escribir('   ');
      check(saludo.textContent.trim() === 'Hola, desconocido', 'Con solo espacios vuelve a "Hola, desconocido"');
    `,
    enTuCodigo: "src/casino/main.ts: themeSel.addEventListener('change', ...) usa 'change' porque un <select> no escribe, elige.",
    mdn: { texto: 'Evento input', url: `${MDN}/API/HTMLElement/input_event` }
  },
  {
    id: 'delegacion',
    titulo: 'Delegación de eventos',
    nivel: 'Intermedio',
    concepto:
      'En vez de un listener por elemento, se pone UNO en el padre. El evento "sube" por el árbol (burbujeo) y `e.target.closest(\'li\')` dice qué hijo recibió el clic. Funciona también con elementos creados después.',
    pasos: [
      'Con un solo listener en `#lista`, haz que al tocar un `<li>` se alterne la clase `hecho`.',
      'Un clic fuera de los `<li>` no debe hacer nada.',
      'Debe funcionar también para los elementos que se agreguen después.'
    ],
    html: '<ul id="lista">\n  <li>Comprar café</li>\n  <li>Responder correos</li>\n  <li>Estudiar el DOM</li>\n</ul>',
    inicial: "const lista = document.getElementById('lista');\n\n// UN solo addEventListener, en la lista (no en cada li)\n",
    pista: "lista.addEventListener('click', (e) => { const li = e.target.closest('li'); if (!li) return; li.classList.toggle('hecho'); });",
    solucion:
      "const lista = document.getElementById('lista');\n\nlista.addEventListener('click', (e) => {\n  const li = e.target.closest('li');\n  if (!li) return;\n  li.classList.toggle('hecho');\n});",
    prueba: `
      const lista = document.getElementById('lista');
      const primero = lista.children[0];
      primero.click();
      check(primero.classList.contains('hecho'), 'Un clic marca el elemento como hecho');
      primero.click();
      check(!primero.classList.contains('hecho'), 'Otro clic le quita la marca');
      lista.click();
      check(!lista.classList.contains('hecho'), 'Un clic en la lista, fuera de un elemento, no hace nada');
      const nuevo = document.createElement('li');
      nuevo.textContent = 'Elemento nuevo';
      lista.append(nuevo);
      nuevo.click();
      check(nuevo.classList.contains('hecho'), 'Un elemento agregado DESPUÉS también responde (eso es delegación)');
    `,
    enTuCodigo:
      'src/casino/ui-roulette.ts: cada casilla del tapete tiene su propio listener (b.addEventListener(\'click\', () => place(id))). Con delegación bastaría uno solo en el tapete.',
    mdn: { texto: 'Element.closest', url: `${MDN}/API/Element/closest` }
  },
  {
    id: 'ocultar',
    titulo: 'Mostrar y ocultar, con accesibilidad',
    nivel: 'Intermedio',
    concepto:
      'El atributo `hidden` oculta un elemento (`panel.hidden = true`). Para lectores de pantalla se avisa el estado con `aria-expanded` en el botón. Ojo: si el CSS le pone `display` al elemento, `hidden` puede dejar de funcionar.',
    pasos: [
      'Al hacer clic en el botón, alterna `hidden` en `#panel`.',
      'Mantén `aria-expanded` del botón en "true" o "false" según esté abierto.',
      'El botón debe decir "Ver reglas" cuando está cerrado y "Ocultar reglas" cuando está abierto.'
    ],
    html: '<button id="toggle" aria-expanded="false" aria-controls="panel">Ver reglas</button>\n<div id="panel" hidden>Blackjack paga 3:2. El crupier se planta en 17.</div>',
    inicial: "const boton = document.getElementById('toggle');\nconst panel = document.getElementById('panel');\n\n",
    pista: "panel.hidden = !panel.hidden;  y luego  boton.setAttribute('aria-expanded', String(!panel.hidden));",
    solucion:
      "const boton = document.getElementById('toggle');\nconst panel = document.getElementById('panel');\n\nboton.addEventListener('click', () => {\n  panel.hidden = !panel.hidden;\n  boton.setAttribute('aria-expanded', String(!panel.hidden));\n  boton.textContent = panel.hidden ? 'Ver reglas' : 'Ocultar reglas';\n});",
    prueba: `
      const boton = document.getElementById('toggle');
      const panel = document.getElementById('panel');
      check(panel.hidden === true, 'Al cargar el panel está oculto');
      boton.click();
      check(panel.hidden === false, 'Un clic muestra el panel');
      check(boton.getAttribute('aria-expanded') === 'true', 'aria-expanded pasa a "true"');
      check(boton.textContent.trim() === 'Ocultar reglas', 'El botón dice "Ocultar reglas"');
      boton.click();
      check(panel.hidden === true, 'Otro clic lo vuelve a ocultar');
      check(boton.getAttribute('aria-expanded') === 'false', 'aria-expanded vuelve a "false"');
      check(boton.textContent.trim() === 'Ver reglas', 'El botón vuelve a decir "Ver reglas"');
    `,
    enTuCodigo: 'src/casino/main.ts, updateBroke(): brokeCard.hidden = !broke muestra la ayuda solo cuando te quedas sin fichas.',
    mdn: { texto: 'Atributo hidden', url: `${MDN}/HTML/Global_attributes/hidden` }
  },
  {
    id: 'render',
    titulo: 'Estado → pantalla: la función render()',
    nivel: 'Reto',
    concepto:
      'El patrón que usan tus tres juegos: los datos viven en una variable y una función `render()` vacía el contenedor (`replaceChildren()`) y lo vuelve a pintar completo desde esos datos. Así la pantalla nunca se desincroniza del estado.',
    pasos: [
      'Cada botón agrega un producto al arreglo `carrito` y llama a `render()`.',
      '`render()` pinta un `<li>` por producto con el formato: Café · $4000',
      '`render()` también actualiza `#total` con la suma de los precios.',
      'Pinta siempre desde el arreglo completo: no debe haber líneas repetidas.'
    ],
    html: '<ul id="carrito"></ul>\n<p>Total: <strong id="total">0</strong></p>\n<button id="add-cafe">+ Café ($4000)</button>\n<button id="add-pan">+ Pan ($2500)</button>',
    inicial:
      "const carrito = [];\n\nfunction render() {\n  // Vacía la lista y vuelve a pintar TODO el carrito desde el arreglo\n}\n\n// Conecta los dos botones: cada uno agrega { nombre, precio } y llama a render()\n",
    pista: "lista.replaceChildren(...carrito.map((p) => { const li = document.createElement('li'); li.textContent = p.nombre + ' · $' + p.precio; return li; }));",
    solucion:
      "const carrito = [];\nconst lista = document.getElementById('carrito');\nconst total = document.getElementById('total');\n\nfunction render() {\n  lista.replaceChildren(\n    ...carrito.map((p) => {\n      const li = document.createElement('li');\n      li.textContent = p.nombre + ' · $' + p.precio;\n      return li;\n    })\n  );\n  total.textContent = carrito.reduce((suma, p) => suma + p.precio, 0);\n}\n\nfunction agregar(nombre, precio) {\n  carrito.push({ nombre, precio });\n  render();\n}\n\ndocument.getElementById('add-cafe').addEventListener('click', () => agregar('Café', 4000));\ndocument.getElementById('add-pan').addEventListener('click', () => agregar('Pan', 2500));",
    prueba: `
      const lista = document.getElementById('carrito');
      const total = document.getElementById('total');
      check(lista.children.length === 0 && total.textContent.trim() === '0', 'Al empezar el carrito está vacío y el total es 0');
      document.getElementById('add-cafe').click();
      document.getElementById('add-pan').click();
      document.getElementById('add-cafe').click();
      const lineas = Array.from(lista.children).map((li) => li.textContent.trim());
      check(lineas.length === 3, 'Después de 3 clics hay 3 líneas, sin repetidas (hay ' + lineas.length + ')');
      check(JSON.stringify(lineas) === JSON.stringify(['Café · $4000', 'Pan · $2500', 'Café · $4000']), 'Cada línea dice "Nombre · $precio". Ahora: ' + JSON.stringify(lineas));
      check(total.textContent.trim() === '10500', 'El total es 10500 (es ' + total.textContent.trim() + ')');
    `,
    enTuCodigo: 'src/casino/ui-blackjack.ts, render(): es exactamente este patrón, con manos y cartas en vez de productos.',
    mdn: { texto: 'Element.replaceChildren', url: `${MDN}/API/Element/replaceChildren` }
  },
  {
    id: 'final',
    titulo: 'Reto final: lista de tareas',
    nivel: 'Reto',
    concepto:
      'Todo lo anterior junto: un formulario que crea elementos, delegación de eventos para marcar y borrar, y un contador que se mantiene al día. Si lo resuelves, ya sabes manejar el DOM.',
    pasos: [
      'Al enviar el formulario (evento `submit`, con `e.preventDefault()`), si el texto no está vacío agrega un `<li>` a `#tareas`.',
      'Cada `<li>` lleva un `<span class="texto">` con el texto y un `<button class="borrar">` ("✕"). Después de agregar, vacía el campo.',
      'Clic en `.texto` alterna la clase `hecha` del `<li>`. Clic en `.borrar` quita el `<li>`.',
      '`#restantes` siempre muestra cuántas tareas NO están hechas.',
      'Usa delegación: un solo listener de clic en `#tareas`.'
    ],
    html: '<form id="form">\n  <input id="texto" type="text" placeholder="Nueva tarea" />\n  <button id="agregar" type="submit">Agregar</button>\n</form>\n<ul id="tareas"></ul>\n<p><span id="restantes">0</span> pendientes</p>',
    inicial:
      "const form = document.getElementById('form');\nconst input = document.getElementById('texto');\nconst lista = document.getElementById('tareas');\nconst restantes = document.getElementById('restantes');\n\nfunction actualizar() {\n  // cuenta los <li> que no tienen la clase 'hecha'\n}\n\n",
    pista: "Para contar: lista.querySelectorAll('li:not(.hecha)').length. En el listener de clic de la lista, e.target.closest('.borrar') y e.target.closest('.texto') te dicen qué tocaron.",
    solucion:
      "const form = document.getElementById('form');\nconst input = document.getElementById('texto');\nconst lista = document.getElementById('tareas');\nconst restantes = document.getElementById('restantes');\n\nfunction actualizar() {\n  restantes.textContent = lista.querySelectorAll('li:not(.hecha)').length;\n}\n\nform.addEventListener('submit', (e) => {\n  e.preventDefault();\n  const texto = input.value.trim();\n  if (!texto) return;\n\n  const li = document.createElement('li');\n  const span = document.createElement('span');\n  span.className = 'texto';\n  span.textContent = texto;\n  const borrar = document.createElement('button');\n  borrar.type = 'button';\n  borrar.className = 'borrar';\n  borrar.textContent = '✕';\n  li.append(span, borrar);\n  lista.append(li);\n\n  input.value = '';\n  actualizar();\n});\n\nlista.addEventListener('click', (e) => {\n  const li = e.target.closest('li');\n  if (!li) return;\n  if (e.target.closest('.borrar')) li.remove();\n  else if (e.target.closest('.texto')) li.classList.toggle('hecha');\n  actualizar();\n});",
    prueba: `
      const form = document.getElementById('form');
      const input = document.getElementById('texto');
      const lista = document.getElementById('tareas');
      const restantes = document.getElementById('restantes');
      const enviar = (t) => { input.value = t; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };

      enviar('   ');
      check(lista.children.length === 0, 'Un texto vacío no agrega nada');
      enviar('Estudiar DOM');
      enviar('Hacer ejercicios');
      check(lista.children.length === 2, 'Se agregaron 2 tareas (hay ' + lista.children.length + ')');
      const t0 = lista.children[0] && lista.children[0].querySelector('.texto');
      check(!!t0 && t0.textContent.trim() === 'Estudiar DOM', 'Cada tarea tiene un span.texto con su texto');
      check(!!(lista.children[0] && lista.children[0].querySelector('button.borrar')), 'Cada tarea tiene un button.borrar');
      check(input.value === '', 'El campo se vacía después de agregar');
      check(restantes.textContent.trim() === '2', 'Restantes dice 2 (dice ' + restantes.textContent.trim() + ')');
      if (t0) t0.click();
      check(!!lista.children[0] && lista.children[0].classList.contains('hecha'), 'Clic en el texto marca la tarea como hecha');
      check(restantes.textContent.trim() === '1', 'Restantes baja a 1');
      if (t0) t0.click();
      check(!!lista.children[0] && !lista.children[0].classList.contains('hecha') && restantes.textContent.trim() === '2', 'Otro clic la desmarca y restantes vuelve a 2');
      const b1 = lista.children[1] && lista.children[1].querySelector('.borrar');
      if (b1) b1.click();
      check(lista.children.length === 1 && restantes.textContent.trim() === '1', 'Borrar quita la tarea y actualiza restantes');
    `,
    enTuCodigo: 'Es la unión de todo lo que ya hace tu casino: crear elementos, escuchar eventos, ocultar y repintar desde el estado.',
    mdn: { texto: 'Evento submit', url: `${MDN}/API/HTMLFormElement/submit_event` }
  }
];
