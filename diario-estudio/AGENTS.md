# Diario de estudio — memoria del proyecto

Mini web para registrar sesiones de estudio y ver la racha de días seguidos. Se construye poco a poco, así que esta carpeta se mantiene deliberadamente pequeña. Lee este archivo antes de tocar nada aquí y actualízalo al terminar.

## Estado actual

Ya funciona:

- Formulario con fecha (por defecto hoy, editable hacia atrás), tema y minutos.
- Validación en español: tema obligatorio, minutos obligatorios y mayores que 0.
- Racha de días seguidos en grande, arriba de la página.
- Lista de sesiones de la más reciente a la más antigua.
- Todo guardado en `localStorage`, aguanta la recarga.
- Diseño en una columna centrada que se ve bien en móvil.

Todavía **no** existe (no lo dés por hecho ni lo añadas sin que te lo pidan): borrar o editar sesiones, totales de minutos, estadísticas, gráficas, filtros, buscador, etiquetas, exportar o importar datos, modo oscuro y récord histórico de racha.

## Archivos

Solo estos tres, y no debe haber más:

- `index.html` — estructura: tarjeta de racha, formulario y lista.
- `styles.css` — variables de color en `:root` y clases con nombres en español.
- `app.js` — en este orden: constantes y elementos del DOM, fechas, `localStorage`, racha, pintado de pantalla, formulario y arranque.

## Reglas que no se rompen

- Tres archivos, cero dependencias, cero compilación. Tiene que funcionar abriendo `index.html` con doble clic (`file://`).
- Todos los textos de la interfaz en español. Los nombres de variables y funciones, también.
- Código sencillo para alguien que empieza a programar: funciones cortas con nombre claro, sin abstracciones de más.
- Fechas siempre en hora local, nunca UTC. Cada día es un texto `AAAA-MM-DD`.
- Reglas de la racha: un día cuenta si tiene al menos una sesión; la racha son los días consecutivos que terminan hoy; si hoy no hay sesión pero ayer sí, la racha sigue viva y se cuenta desde ayer; si el último día con sesión es anteayer o anterior, la racha es 0.

Los detalles con ejemplos de código están en `.cursor/rules/diario-estudio.mdc` y `.cursor/rules/fechas-locales-y-racha.mdc`.

## Datos guardados

Clave de `localStorage`: `diario-de-estudio`. Dentro, una lista de sesiones:

```javascript
{ fecha: "2026-10-02", tema: "Bucles en JavaScript", minutos: 30, creadaEn: 1759444800000 }
```

`creadaEn` solo sirve para ordenar dos sesiones del mismo día. Si cambias la clave o el nombre de un campo, los datos que la persona ya tenga guardados dejan de leerse: hazlo solo si de verdad hace falta y avisa en el resumen.

## Cómo probarlo

Abre `diario-estudio/index.html` con doble clic (o `file:///ruta/al/repo/diario-estudio/index.html`) y repasa:

1. La página carga sin errores en la consola y la racha empieza en 0.
2. El campo de fecha viene con el día de hoy y no deja elegir fechas futuras.
3. Guardar con el tema vacío, o con 0 minutos, muestra el error en español correspondiente.
4. Guardar una sesión de hoy pone la racha en 1 («día seguido») y vacía el formulario.
5. Guardar otra con la fecha de ayer pone la racha en 2 («días seguidos»), con la de hoy arriba en la lista.
6. Recargar la página mantiene las sesiones y la racha.

Atajos útiles en la consola del navegador:

- Empezar de cero: `localStorage.removeItem("diario-de-estudio")` y recarga.
- Probar la racha sin esperar días reales: registra sesiones cambiando la fecha a días anteriores.
- Casos límite que conviene repasar al tocar fechas: huecos en medio, dos sesiones el mismo día, cambio de mes, cambio de año y el fin de semana del cambio de hora.

## Decisiones tomadas y por qué

- La web vive en su propia carpeta porque el repo es un sitio Astro con su propio `index`. Esta carpeta no entra en el build de Astro.
- El campo de fecha lleva `max` en hoy, para no registrar sesiones en el futuro.
- El formulario usa `novalidate` y valida en JavaScript, para que los avisos salgan en español en cualquier navegador y no en el idioma del navegador.
- La lista se ordena por fecha y, si empatan, por `creadaEn`, así la última sesión añadida de un día aparece primero.

## Cómo mantener esta memoria

Al acabar un cambio en esta carpeta, mueve lo que hayas hecho de «todavía no existe» a «ya funciona», añade las decisiones nuevas con su motivo y amplía la lista de comprobación si has añadido algo que haya que probar a mano.
