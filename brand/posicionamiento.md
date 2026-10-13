# Posicionamiento: IA aplicada al dinero

## La idea central

**Pruebo con IA qué funciona de verdad en finanzas.**

No soy "un desarrollador más". Mi trabajo es someter ideas y código que mueven dinero a una prueba honesta, con agentes de IA y con método estadístico, y decir lo que resulta, incluso cuando es "no funciona".

Dos frentes, un mismo método:

1. **Pagos:** agentes que auditan integraciones (Wompi, PSE, webhooks) y encuentran errores que fallan en silencio. Es lo que se vende hoy.
2. **Trading:** un protocolo que registra cada hipótesis antes de ver resultados y la descarta si no pasa las compuertas. Es la prueba de que el método es honesto.

## Frases listas

- **Titular del sitio:** Pruebo con IA qué funciona de verdad en finanzas.
- **Una línea:** Uso agentes de IA para auditar código de pagos y un protocolo estadístico para descartar estrategias de trading antes de arriesgar dinero real.
- **Bio corta (X/Instagram/TikTok, ~140 caracteres):** Pruebo con IA qué funciona de verdad en finanzas. Auditoría de pagos + trading con método. Medellín 🇨🇴
- **Titular de LinkedIn:** IA aplicada al dinero · Audito integraciones de pago con agentes · Descarto estrategias de trading con método

## Lo que puedo afirmar (y de dónde sale)

| Afirmación | Evidencia |
|---|---|
| Encontré que el webhook de Payouts de Wompi validaba con la llave y el esquema del checkout | Artículo del blog (2026-09-16) |
| Probé 3 hipótesis de trading y las 3 se descartaron | `trading-bot/README.md`: H001 y H002 rechazadas en desarrollo, H003 rechazada en la muestra bloqueada |
| Cada hipótesis se registra antes de ver resultados y la muestra bloqueada se abre una sola vez | Reglas del proyecto en el mismo README |
| La auditoría de pagos cuesta $150.000 COP con reporte en 24 h hábiles; el monitoreo, $180.000/mes | Oferta del sitio |

## Lo que NO debo afirmar

- **Rentabilidad o señales.** Ninguna estrategia pasó las compuertas. No prometer retornos ni "método ganador", y no dar asesoría financiera personalizada.
- **Que el desk es dinero real.** `trading-sim` es paper trading.
- **Que el replay 3D es una auditoría de un cliente.** Es una reproducción hecha en la misma sesión que escribió el código.
- **Resultados con números que no tengo.** Si aún no hay clientes o conversiones medidas, no inventarlas.

Dato que conviene contar con honestidad, porque refuerza la marca: en H003 la hipótesis "pasó" solo con una enmienda hecha después de ver el resultado, y el propio proyecto lo considera mala práctica. Por eso desde 2026-10-07 las compuertas son inmutables. Contar ese error es mejor contenido que ocultarlo.

## Series de contenido

1. **"Lo encontró el agente"** (auditorías de pagos). Un bug real por video, con el síntoma, la causa y el arreglo. Cierra con la oferta. Primer episodio: el webhook de Payouts (ya hecho).
2. **"Hipótesis descartada"** (trading). Una idea, el criterio que se fijó antes, y por qué no pasó. Sin vender nada: construye autoridad.
3. **"Así lo probé"** (método). Detrás de cámara: cómo un agente audita, qué es una muestra bloqueada, qué es el Sharpe deflactado explicado simple.

## Escalera de monetización

contenido → **Revisor gratis** (herramienta del sitio) → **auditoría $150.000** → **monitoreo $180.000/mes**.

Medir en el panel con `utm_campaign` por video. El indicador que importa es cuántas personas escriben o pagan, no las vistas.

## Ideas de los próximos videos

1. "Probé una estrategia de trading con IA. Falló. Así lo supe." (H001 o H002)
2. "Le pedí a un agente que audite mi webhook: esto encontró" (versión con el replay, aclarando que es reproducción)
3. "Por qué mi estrategia 'pasó' y aun así la descarté" (el caso de la enmienda de H003)
4. "3 señales de que tu webhook de pagos falla en silencio"
5. "Qué es una muestra bloqueada y por qué evita engañarte"

## Qué cambió en el sitio y el video

- Hero: kicker, H1 (antes en inglés), frase que se teclea y subtítulo.
- Título y descripción de la página (`Layout.astro` e `index.astro`).
- Primer párrafo de "Sobre mí".
- Etiqueta del video: "[ DL ] David López · IA aplicada al dinero".
- Sin tocar todavía: oferta, pruebas, proyectos y habilidades (siguen siendo válidos), y la imagen social `og-default.png`.
