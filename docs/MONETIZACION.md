# Cómo monetizar Pagos Idle

El juego vive en `dsltdev.com/juego` (la portada `dsltdev.com` es la landing de servicios). Todo el dinero se activa en **un solo archivo**:
`src/game/config.ts` (objeto `MONETIZATION`). Un campo vacío = esa vía apagada; el juego funciona igual.

> Realismo: los ingresos dependen del tráfico. Hoy puedes dejar **todos los canales listos**, pero
> las aprobaciones de Google pueden tardar y sin visitantes no hay ingresos. Mide con Plausible.

## Estado actual

| Pieza | Estado |
|---|---|
| Anuncio con recompensa (API Ad Placement de Google) | **Integrado y probado** con un doble de la API. Falta tu ID de AdSense |
| `ads.txt` | Se genera solo desde `adsenseClient` |
| Política de privacidad y términos | Reescritas para el juego (mencionan anuncios, cookies y Wompi) |
| Pase Pro / Maletín de oro | Listos; faltan tus links de pago de Wompi |
| Donaciones | Listo; falta `donateUrl` |
| Banner de AdSense | Opcional; falta `adsenseBannerSlot` |

Mientras no haya `adsenseClient`, el botón "Ver anuncio" **no aparece** (no prometemos algo que no
existe). Para probar el flujo sin Google, abre `https://dsltdev.com/juego?demoads`.

## Ruta para hoy (en este orden)

### 1. Cobros con Wompi (~15 min, sin esperar a nadie)
1. En Wompi crea un *Payment Link* para **Pase Pro** y otro para **Maletín de oro**.
2. Pega cada URL en `products[].url` de `config.ts` y ajusta `price` si quieres.
3. Cuando alguien pague, genera su código y envíaselo:
   ```sh
   node scripts/gen-code.mjs pro    # o: gold
   ```
   Entrega **el código** al comprador y pega **la línea del hash** en `redeemCodes` de `config.ts`.
   Publica el cambio para que el código funcione.
4. El comprador lo canjea en Tienda → "Canjear código".

Es manual: sirve para validar que alguien compra. Si vende, el siguiente paso es un Worker de
Cloudflare que reciba el webhook de Wompi, genere el código y lo envíe solo. Los códigos son de
un uso por dispositivo; alguien podría compartir uno (riesgo aceptable a esta escala).

### 2. Donaciones (~5 min)
Rellena `donateUrl` con un link de Wompi, Buy Me a Coffee, etc. Aparece "♥ Apoyar" arriba.

### 3. Pedir la aprobación de anuncios (hoy se solicita; la respuesta tarda)
1. Crea la cuenta en [AdSense](https://adsense.google.com) y añade `dsltdev.com`.
2. Solicita **AdSense for Games** (necesario para la API de anuncios con recompensa).
3. Google revisa el sitio. Ya cumple lo básico: sitio publicado, política de privacidad y términos,
   y `ads.txt` (se completa al poner tu ID). La aprobación puede tardar de días a semanas y no está
   garantizada: un sitio de una sola página suele recibir más rechazos. Si te rechazan, el motivo
   viene en el correo y se corrige.
4. En AdSense → *Privacidad y mensajes*, activa el mensaje de consentimiento (obligatorio para
   visitantes de la UE/Reino Unido; no requiere código).

### 4. Cuando te aprueben (5 min)
1. En `config.ts` pon `adsenseClient: 'ca-pub-XXXXXXXXXXXXXXXX'` (el tuyo).
2. Primero con `adsenseTestMode: true` y publica: Google sirve anuncios simulados (alterna anuncio /
   sin anuncio). Comprueba el botón "Ver anuncio" en tu celular.
3. Pon `adsenseTestMode: false` y publica. Ya hay anuncios reales y `https://dsltdev.com/ads.txt`
   muestra tu línea.

## Más audiencia (sin esperar aprobaciones)

- **itch.io**: gratis, subes la build HTML5 y recibes jugadores y donaciones.
- **Poki / CrazyGames**: traen mucha audiencia y reparten ingresos por anuncios, pero piden aprobación
  y su propio SDK de anuncios (habría que preparar una build dedicada).
- **Compartir**: el enlace ya tiene imagen de vista previa (`public/og-juego.png`) para WhatsApp,
  X y Telegram. Comunidades de juegos incrementales (p. ej. r/incremental_games) suelen probar juegos nuevos.

## Mesa de trading (`/trading`)

Simulador de trading con **dinero virtual y precios ficticios** (sin depósitos ni retiros). Comparte
la monetización del juego: si estás casi en quiebra y hay anuncios disponibles, puedes ver un anuncio
con recompensa para recibir $5.000 virtuales (si no hay anuncios solo ofrece "cuenta nueva"). Eventos de
Plausible: `trade_open`, `trade_close`, `trading_recharge`, `trading_new_account`.

> Mantenerlo como simulador es deliberado: en Colombia operar juegos de azar o intermediar dinero real
> de terceros está regulado (Coljuegos, Superfinanciera). Antes de manejar dinero real hay que consultar
> a un abogado.

## Terminal (`/terminal`)

Misma mesa de trading, pero por línea de comandos y con lluvia de código estilo Matrix (`help`, `buy`,
`sell`, `chart`, `news`…). Comparte la cuenta de `/trading` (`pagos-trader:v1`); solo las preferencias
de lluvia y sonido son propias (`pagos-terminal:prefs`).

## Casino de fichas virtuales (`/casino`)

Tragamonedas, blackjack y ruleta europea con **fichas sin ningún valor real**: no se compran, no se
canjean, no se transfieren y no hay premios. Billetera propia (`pagos-casino:v1`), separada del juego
principal y del trading.

**Cómo se monetiza (y cómo no):**

- **Sin AdSense** por ahora (`MONETIZATION.casinoAds = false`). No se verificó que la política de
  publicadores acepte páginas de casino, y un rechazo podría afectar a todo el sitio. Cuando se
  confirme, basta cambiar ese valor a `true` para ofrecer el anuncio con recompensa en la pantalla de
  "sin fichas" (+5.000 fichas). Con `?demoads` se prueba el flujo con un anuncio simulado.
- **Nunca se venden fichas.** Lo que sí se puede vender es cosmético (temas, marcos) y el pase.
- Los enlaces de pago de Wompi para Pase Pro y Maletín de oro siguen pendientes.

**Reglas de diseño (no cambiarlas sin pensarlo):**

| Juego | Retorno al jugador | Cómo se verificó |
| --- | --- | --- |
| Tragamonedas (5 líneas) | 95,30 % | enumeración exacta de las 8.000 combinaciones |
| Blackjack (6 mazos, S17, BJ 3:2) | ≈ 99,5 % con estrategia básica | simulación de 6 millones de manos |
| Ruleta europea | 97,30 % (36/37) | exacto |

- Aviso +18 al entrar (no se cierra con Esc), enlace a `/juego-responsable`, pausas voluntarias de
  15 min / 1 h / 24 h que sobreviven a recargar, recordatorio cada 30 min, sin autojuego.
- Un premio menor que la apuesta **no se celebra** (se avisa que es menos de lo apostado).
- Aleatoriedad con `crypto.getRandomValues` y rechazo de sesgo (`src/casino/rng.ts`).
- Eventos de Plausible: `casino_open`, `casino_spin`, `casino_hand`, `casino_roulette`,
  `casino_break`, `rewarded_ad_start` (`where: casino`).

> **Antes de lanzarlo en serio:** consulta a un abogado en Colombia. Un casino con fichas sin valor
> suele considerarse entretenimiento, pero Coljuegos regula los juegos de suerte y azar y la línea
> depende de los detalles (premios, compras, canjes). Mientras nada de valor entre ni salga, el riesgo
> es bajo; si algún día se vende algo que mejore las probabilidades o se canjean fichas, cambia por completo.

## Landing de servicios (`/`)

La portada vende dos cosas con precio fijo (auditoría de pagos y monitoreo mensual) y desarrollo fintech a la
medida por cotización. El juego pasó a `dsltdev.com/juego`.

- **Dónde se cambia todo:** `src/data/oferta.ts` (precios, enlace de pago de Wompi, correo, ciudad). Los textos
  están en `src/pages/index.astro`.
- **Cobro:** el botón "Pagar la auditoría" abre el enlace de Wompi de la auditoría. No hay servidor que confirme
  el pago: tú ves el cobro en Wompi y entregas el reporte cuando el cliente te escribe con el acceso. El monitoreo
  y el desarrollo se acuerdan por correo.
- **Eventos de Plausible** (créalos como *goals* en Plausible para ver el embudo): `landing_pagar` y
  `landing_correo`, ambos con la propiedad `donde` (`encabezado`, `hero`, `servicios`, `monitoreo`, `desarrollo`
  o `final`).
- **Solo hechos reales:** la landing no tiene testimonios, cifras de clientes ni garantías, porque no hay datos
  que las respalden. Agrega testimonios solo cuando un cliente real los autorice.
- **Pendiente de revisar:** `/privacy` y `/terms` están escritos para el juego; conviene una versión para el
  servicio (qué datos recibes del cliente, confidencialidad, alcance de la auditoría, política de devolución).

## Medir qué funciona

El juego envía eventos a Plausible: `rewarded_ad_start`, `rewarded_ad_complete`,
`rewarded_ad_unavailable`, `checkout_open`, `redeem_ok`, `donate_click`, `prestige`. En Plausible,
crea esos *goals* para ver el embudo.

## Ajustar el equilibrio

Costos, producción, bonus de licencias y duración del boost están en `src/game/config.ts`. El guardado
de los jugadores sigue siendo compatible mientras no cambies los `id`.

## Otras páginas del sitio

La antigua portada personal sigue en `/portafolio` (sin enlazar y con `noindex`), y el blog, `/desk`
y `/4d` no se tocaron. Si no los quieres, se pueden borrar sin afectar al juego.

## Asistente de IA en la landing

Chat opcional que responde dudas de la auditoría y lleva al visitante a pagar con Wompi o a escribirte. Corre en un Worker de Cloudflare (carpeta `asistente/`) con la API de Claude. Está apagado hasta que pongas la URL del Worker en `OFERTA.asistenteUrl`. Guía de publicación, control de gasto y privacidad en `asistente/README.md`.

