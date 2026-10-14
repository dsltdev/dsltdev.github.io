# Plan de contenido (8 semanas)

**Objetivo:** que el contenido técnico traiga clientes para la auditoría de pagos ($150.000 COP), no anuncios. Se mide en contactos y compras, no en visualizaciones.

**Punto de partida real:** un caso verificado (el webhook de Wompi Payouts que nunca validaba) y dos artículos nuevos que salen de él. No hay datos propios de audiencia todavía: todo lo que sigue es una hipótesis que este plan sirve para probar.

## El embudo

```
Pieza (video corto, publicación, artículo)
      → artículo del blog        (utm_source / utm_campaign = nombre de la pieza)
      → landing  /#servicios     (Plausible: landing_pagar, landing_correo, asistente_*)
      → pago en Wompi o correo   (la compra real se confirma en Wompi y en tu bandeja)
```

Todos los artículos cierran con un botón a la landing con parámetros `utm`. Plausible los registra solo, sin cookies, así que se puede ver qué pieza trajo visitas, clics y contactos.

## Qué piezas hay

| Pieza | Estado | Material | Qué enseña |
|---|---|---|---|
| El webhook que rechazaba cada pago real | Publicado | Caso real tuyo | Dos webhooks del mismo proveedor, dos firmas distintas |
| Cinco preguntas para saber si tu webhook funciona | Publicado | Explicativo | Lista de revisión: prueba real, firma, repetición, pendiente, alertas |
| PSE y tarjeta: por qué no cobrar al volver | Publicado | Explicativo | Estados pendientes, regreso del cliente, webhook como fuente de verdad |

## Calendario

Cada semana sale **una pieza principal** más sus derivadas: un video corto (30 a 90 segundos, grabando pantalla y explicando) y 2 o 3 publicaciones cortas para LinkedIn o X con el hallazgo y el enlace al artículo.

| Semana | Pieza principal | Fuente | Necesito de ti |
|---|---|---|---|
| 1 | Caso del webhook de Payouts → video de pantalla | Real, ya publicado | Grabar 60–90 s mostrando el síntoma (transferencias en `pending`) y el fix |
| 2 | PSE y tarjeta → video con el diagrama de los dos recorridos | Publicado | Revisar el artículo y confirmar que refleja cómo lo ves en producción |
| 3 | Cinco preguntas → carrusel/hilo con las cinco | Publicado | Nada |
| 4 | Demo: "probé mi webhook de punta a punta y esto pasó" | Real, a construir | Un webhook de prueba tuyo y 10 minutos de grabación |
| 5 | Un segundo caso real de tus propios sistemas | Real, **pendiente** | Elegir un hallazgo que puedas contar sin exponer datos de clientes |
| 6 | Reintentos y duplicados: idempotencia en un webhook | Explicativo | Revisar el ejemplo de código |
| 7 | Libro de cuentas y concurrencia (con la animación "Partida doble" de la portada como imagen) | Explicativo | Elegir el ejemplo |
| 8 | Balance de resultados y qué sigue | Datos propios | Los números de Plausible y de tu correo |

Las semanas 4 y 5 dependen de material tuyo. Si no hay un segundo caso real, se cambia por otra pieza explicativa; no se inventa uno.

## Cómo se mide

Por pieza, en Plausible (filtrando por `utm_campaign`):

1. Visitas al artículo.
2. Clics a la landing y eventos `landing_pagar` / `landing_correo` (con `donde=asistente` si vino del chat).
3. Contactos reales recibidos por correo y compras en Wompi (esto no lo ve Plausible; se anota a mano).

Ficha semanal de 5 minutos: pieza publicada, visitas, clics a la landing, contactos, compras, y una línea de qué funcionó o no.

## Criterio de decisión a las 8 semanas

Estos umbrales son una propuesta mía, no salen de datos: ajústalos si no te parecen realistas.

| Resultado | Decisión |
|---|---|
| Al menos 1 auditoría vendida, o 3 contactos que encajen con el servicio | Seguir con este tipo de pieza y automatizar más |
| Visitas pero ningún contacto | Cambiar la llamada a la acción y el artículo de entrada, no el canal |
| Casi sin visitas | Cambiar la distribución (dónde se publica), no el tipo de contenido |

El 3 % de canales de automatización que llega a monetizar, y el abandono común entre los meses 4 y 6, son motivo para no juzgar antes de las 8 semanas ni decidir con una sola.

## Qué se automatiza y qué no

| Se automatiza (siguiente fase) | Se queda en ti |
|---|---|
| Borrador de guion y de publicaciones a partir de cada artículo | El hallazgo y tu conclusión |
| Subtítulos y cortes verticales del video | Grabar la pantalla y explicar |
| Programar la publicación y armar la ficha semanal desde Plausible | Aprobar cada pieza antes de que salga |

Regla: nada sale sin que lo hayas leído. YouTube no monetiza contenido masivo hecho con plantillas, y una pieza genérica no vende una auditoría. Primero se prueban las 8 semanas con producción casi manual; automatizar viene después, sobre lo que haya funcionado.

## Pendiente de tu lado

- Confirmar que los artículos nuevos dicen lo que dirías tú. Los redacté sin anécdotas propias para no inventar experiencia, pero están firmados con tu nombre.
- Elegir el canal de distribución principal (LinkedIn, X, YouTube) y dónde vive tu audiencia.
- Crear los *goals* en Plausible: `landing_pagar`, `landing_correo`, `asistente_abrir`, `asistente_mensaje`.
