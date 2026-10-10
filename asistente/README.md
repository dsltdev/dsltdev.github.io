# Asistente de IA de dsltdev.com

Un chat en la landing que responde dudas sobre la auditoría de pagos, entiende qué necesita el visitante y lo lleva a **pagar con Wompi** o a **escribirte**. Responde con la API de Claude a través de un Cloudflare Worker: el sitio sigue siendo estático y la llave de la API nunca llega al navegador.

```
Navegador (landing)  ──POST /chat──▶  Worker (asistente/)  ──▶  API de Claude
   src/components/Asistente.astro        valida · limita · arma el prompt
```

Mientras no haya un Worker desplegado, **el asistente no se dibuja** y la landing queda como está.

## Qué sabe (y qué no)

El prompt (`src/prompt.ts`) se arma con los mismos módulos que la landing (`src/data/oferta.ts` y `src/data/contenido.ts`). Si cambias un precio, un plazo o una pregunta frecuente, el asistente lo aprende en el siguiente deploy. Tiene reglas para no inventar precios, garantías ni testimonios; para decir que es una IA; para no pedir llaves, contraseñas ni datos de tarjeta; y para ignorar instrucciones que pidan cambiar sus reglas. Cuando no sabe algo, ofrece que David responda por correo.

Al final de una respuesta puede poner un marcador que el Worker convierte en un botón: `[[PAGAR]]` (enlace de Wompi) o `[[CORREO]]` (mailto con asunto). El navegador nunca interpreta HTML del modelo: todo se muestra como texto.

## Publicarlo

Necesitas una cuenta de Cloudflare (la que ya usas para tus Workers) y una llave de API de Anthropic.

```bash
cd asistente
npm install
npx wrangler login
npm run secret          # pega tu ANTHROPIC_API_KEY cuando la pida
npm run deploy          # imprime la URL: https://dsltdev-asistente.<tu-subdominio>.workers.dev
```

Luego enciende el asistente en el sitio con **una** de estas dos opciones:

- Pega la URL en `asistenteUrl` de `src/data/oferta.ts` (recomendado: queda versionado).
- O define `PUBLIC_ASISTENTE_URL` en el entorno del build.

Y despliega el sitio como siempre.

## Controlar el gasto (hazlo antes de publicar)

1. **Tope mensual en la consola de Anthropic** (Billing → límites de gasto). Es el freno real: aunque algo falle, no se pasa de ahí.
2. **Límite por visitante:** descomenta `ratelimits` en `wrangler.jsonc` (10 preguntas por minuto por IP).
3. **Tope diario de conversaciones:** crea el KV (`npx wrangler kv namespace create CUOTA`), pega el id en `wrangler.jsonc` y ajusta `MAX_DIA` (300 por defecto). Al llegar al tope, el asistente manda al visitante a tu correo. El conteo es aproximado (no atómico): sirve como freno, no como contabilidad.
4. Cada respuesta está limitada a 400 tokens, cada conversación a 6 preguntas de 600 caracteres, y el modelo por defecto es el pequeño (`claude-haiku-5-5`, variable `MODEL`).

## Privacidad

El Worker **no guarda ni registra** las conversaciones. Pero lo que escribe el visitante sí viaja a la API de Claude, y el panel lo avisa ("No pegues llaves, contraseñas ni datos de tarjeta"). `/privacy` y `/terms` hoy están escritos para el juego: conviene agregar ahí que existe el asistente y a quién se envían los mensajes antes de encenderlo.

## Seguridad: lo que está cubierto y lo que no

- Solo responde a los orígenes de `ALLOWED_ORIGINS` (CORS + comprobación en el servidor). Cualquier otro origen recibe 403 sin llegar a la API.
- Todo lo que llega se valida: roles que alternan, máximo 12 mensajes, 600 caracteres, sin caracteres de control, cuerpo de hasta 12 KB.
- El navegador no puede elegir modelo, tokens ni instrucciones del sistema.
- **Limitaciones conocidas:** un cliente malicioso puede falsificar los turnos del "asistente" dentro del historial que envía, y ninguna instrucción de prompt garantiza al 100 % que el modelo resista un intento de manipulación. Por eso el asistente no tiene herramientas ni acceso a nada: lo peor que puede hacer es decir algo incorrecto en una conversación, y por eso la regla 1 lo obliga a remitir al correo ante cualquier duda.

## Medición

Plausible registra `asistente_abrir` (al abrir el chat), `asistente_mensaje` (propiedad `donde` = número de pregunta) y, cuando el visitante usa los botones que ofrece el asistente, los mismos eventos de la landing: `landing_pagar` y `landing_correo` con `donde=asistente`. Crea esos *goals* en Plausible para ver cuántos clientes llegan por esta vía.

## Probar en local

```bash
cd asistente
echo 'ANTHROPIC_API_KEY=tu_llave' > .dev.vars     # .dev.vars no se versiona
npx wrangler dev                                  # http://localhost:8787
```

Para que el origen local pueda llamar, agrega `http://localhost:4321` a `ALLOWED_ORIGINS` solo en `.dev.vars` (`ALLOWED_ORIGINS=http://localhost:4321`) y arranca el sitio con `PUBLIC_ASISTENTE_URL=http://localhost:8787 npm run dev`.

## Archivos

| Archivo | Para qué |
|---|---|
| `src/index.ts` | Worker: CORS, validación, límites, llamada a la API |
| `src/prompt.ts` | Instrucciones y hechos del asistente |
| `src/validar.ts` | Validación de entrada y marcadores de acción |
| `wrangler.jsonc` | Configuración (variables, límites opcionales) |
| `../src/components/Asistente.astro` | El chat en la página |
| `../src/data/contenido.ts` | Contenido compartido entre la landing y el asistente |
