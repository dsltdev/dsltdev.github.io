# Cómo monetizar Pagos Idle

`dsltdev.com` abre directamente el juego. Todo el dinero se activa en **un solo archivo**:
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
existe). Para probar el flujo sin Google, abre `https://dsltdev.com/?demoads`.

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
