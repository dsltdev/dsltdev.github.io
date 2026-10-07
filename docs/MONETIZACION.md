# Cómo monetizar Pagos Idle

El juego vive en `/juego`. Todo el dinero se activa en **un solo archivo**: `src/game/config.ts`
(objeto `MONETIZATION`). Mientras un campo esté vacío, esa vía queda apagada y el juego funciona igual.

> Realismo: un juego idle bien hecho puede dar ingresos, pero depende del tráfico. Ningún juego
> garantiza dinero. Lo que sí controlas es tener los canales listos para cuando llegue gente.

## 1. Anuncios con recompensa (el botón "Ver anuncio")

Hoy muestra un **anuncio de prueba** de 5 s para que veas el flujo completo (boost x2 por 2 min).
Para uno real hay dos caminos:

- **Portales** (Poki, CrazyGames, itch.io con ads): ellos proveen el SDK de anuncios. Reemplaza el
  cuerpo de `showRewardedAd()` en `src/game/ads.ts` por la llamada a su SDK. El resto del juego solo
  espera una promesa `true/false`.
- **Tu propio sitio**: AdSense for Games / H5 Games Ads requiere aprobación de Google. Cuando la
  tengas, integra su SDK en la misma función.

## 2. Banner de AdSense

1. Solicita la cuenta en AdSense y verifica `dsltdev.com`.
2. Rellena `adsenseClient` (`ca-pub-…`) y `adsenseBannerSlot` en `config.ts`.
3. El banner aparece debajo del juego y **se oculta a quien compra el Pase Pro**.

AdSense exige una política de privacidad que mencione anuncios y cookies: actualiza `/privacy`
antes de activarlo.

## 3. Compras (Pase Pro y Maletín de oro)

El sitio es estático y no tiene backend de pagos, así que las compras usan **links de pago + código de canje**:

1. En Wompi crea un *Payment Link* por producto y pega la URL en `products[].url` de `config.ts`.
   Ajusta también `price`.
2. Cuando alguien pague, genera su código:
   ```sh
   node scripts/gen-code.mjs pro    # o: gold
   ```
3. Envíale **el código** al comprador (correo o WhatsApp) y pega **la línea del hash** en
   `redeemCodes` de `config.ts`; publica el cambio.
4. El comprador lo pega en Tienda → "Canjear código".

Limitaciones honestas de este método:

- Es manual: sirve para validar si la gente compra. Si vende, el siguiente paso es un Worker de
  Cloudflare que reciba el webhook de Wompi, genere el código y lo envíe solo (ya tienes experiencia con eso).
- Los códigos son de un solo uso **por dispositivo**; alguien podría compartir un código. Para
  un juego de este tamaño es un riesgo aceptable. Un Worker con base de datos lo resolvería.
- Solo guardamos el **hash** de cada código en el repositorio, nunca el código.

## 4. Donaciones

Rellena `donateUrl` con un link de Wompi, Buy Me a Coffee, etc. Aparece el botón "♥ Apoyar" arriba.

## 5. Portales (audiencia propia de otros)

Poki, CrazyGames e itch.io traen jugadores y reparten ingresos por anuncios. Todos piden una build
estática: `npm run build` y subir el contenido de `dist/` (la página del juego es `dist/juego/index.html`,
habría que ajustar rutas para empaquetarlo solo; se puede preparar una build dedicada).

## Medir qué funciona

El juego envía eventos a Plausible (ya cargado en el sitio): `rewarded_ad_start`,
`rewarded_ad_complete`, `checkout_open`, `redeem_ok`, `donate_click`, `prestige`. En Plausible,
crea esos *goals* para ver el embudo.

## Ajustar el equilibrio

Todo está en `src/game/config.ts`: costos, producción, bonus de licencias y duración del boost.
Si cambias el balance, el guardado de los jugadores sigue siendo compatible mientras no cambies los `id`.
