# Despliegue directo a Cloudflare (sin git ni GitHub Actions)

El sitio es estático: Astro genera `dist/` y Cloudflare lo sirve como un Worker con archivos estáticos. Desplegar es compilar y subir desde tu computador, sin pasar por GitHub Actions.

> **Estado (22 de octubre de 2026):** dsltdev.com se sirve desde el Worker `dsltdev-sitio` (dominio personalizado en `wrangler.jsonc`). El despliegue es `npm run deploy` desde tu computador. GitHub Actions ya no despliega: se eliminó `deploy.yml` y `public/CNAME`.
>
> El panel (`/app/`) se compila con `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`. Si faltan, muestra «El panel abre pronto». Para desplegar **sin** el Supabase local, deja esas variables vacías: `PUBLIC_SUPABASE_URL= PUBLIC_SUPABASE_ANON_KEY= npm run deploy`. Con el `.env` local compilaría contra `localhost`.

## Qué hay en el repositorio

| Archivo | Para qué |
|---|---|
| `wrangler.jsonc` | Configuración: nombre del Worker (`dsltdev-sitio`), carpeta `dist/`, manejo de `/blog` ↔ `/blog/` y página 404. |
| `public/_headers` | Encabezados: caché de un año para `/_astro/*` (archivos con huella) y `nosniff` + `Referrer-Policy` para todo. |
| `src/pages/404.astro` | Página 404 propia (antes, un enlace roto mostraba la página genérica del servidor). |
| `package.json` | Scripts `npm run deploy` (compila y sube) y `npm run deploy:prueba` (compila y simula, sin subir). Wrangler como dependencia local. |

El Worker del asistente de IA (`asistente/`) y el de `worker/` son aparte y se despliegan por separado.

## Antes de empezar

1. **El dominio `dsltdev.com` debe estar como zona en tu cuenta de Cloudflare.** Compruébalo en el panel (Websites). Si no está, hay que cambiar los nameservers del dominio, y eso es lo único que puede causar un corte: hazlo con calma y por separado.
2. Node 22.12 o superior y `npm install` hecho.

## Paso 1: publicar en una dirección de prueba (no toca dsltdev.com)

```bash
npm install
npx wrangler login        # abre el navegador; autoriza tu cuenta
npm run deploy:prueba     # compila y simula: debe terminar sin errores
npm run deploy            # sube de verdad
```

El primer despliegue crea el Worker `dsltdev-sitio` y muestra una dirección del tipo `https://dsltdev-sitio.<tu-subdominio>.workers.dev`. dsltdev.com **sigue en GitHub Pages**.

## Paso 2: revisar la dirección de prueba

- La portada es la landing de la plataforma, `/app/` abre el panel (login), `/servicios` es la landing de servicios, y el blog y los artículos cargan.
- Las direcciones viejas (`/juego`, `/casino`, `/trading`, `/4d`, `/desk`…) redirigen a la portada.
- `/blog` redirige a `/blog/` y una dirección inventada muestra la página 404 propia.
- `/privacy` y `/terms` cargan.
- En `/servicios`, el botón de pago abre Wompi y la banda "Partida doble" se anima.
- El panel necesita las variables `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` del Supabase en internet al compilar (ver `.env.example`).

## Paso 3: conectar dsltdev.com

Cuando todo esté bien, tienes dos formas equivalentes:

- **Con la configuración:** en `wrangler.jsonc` descomenta la línea `routes` (`dsltdev.com`, `custom_domain: true`) y ejecuta `npm run deploy`.
- **Desde el panel:** Workers & Pages → `dsltdev-sitio` → Settings → Domains & Routes → Add → Custom domain.

Cloudflare crea el registro DNS y emite el certificado HTTPS. **Desde ese momento dsltdev.com se sirve desde Cloudflare.** Si ya existe un registro DNS para ese nombre apuntando a GitHub Pages, Cloudflare lo avisará y habrá que eliminarlo antes. Si usas `www`, agrega también un dominio personalizado para `www.dsltdev.com` o una regla de redirección hacia `dsltdev.com`.

## Paso 4: limpiar lo de GitHub

Solo después de comprobar dsltdev.com en vivo:

1. ✅ Hecho: `public/CNAME` y `.github/workflows/deploy.yml` eliminados.
2. Pendiente: Settings → Pages → desactiva la publicación. **Antes**, crea en Cloudflare una regla de redirección de `www.dsltdev.com` a `https://dsltdev.com` (Rules → Redirect Rules); hoy ese redireccionamiento lo hace GitHub Pages y se perdería.

El código puede seguir en git: es tu historial y tu respaldo, aunque ya no sea el camino al despliegue.

## Revertir

- **Código:** Workers & Pages → `dsltdev-sitio` → Deployments / Versions, y vuelve a una versión anterior. También hay `npx wrangler rollback` (revisa `npx wrangler rollback --help`).
- **Volver a GitHub Pages:** quita el dominio personalizado de Cloudflare y vuelve a apuntar el DNS a GitHub Pages.

## Después de cada cambio

```bash
npm run deploy
```

Para publicar solo una vista previa sin tocar producción, revisa Workers Previews en la documentación de Cloudflare (Wrangler ≥ 4.135, ya instalado).

## Automatizar sin GitHub Actions (opcional)

Para desplegar sin abrir el navegador (por ejemplo, desde otro servicio) hace falta un token de API de Cloudflare con permisos de Workers. **Créalo en tu panel y guárdalo como variable de entorno `CLOUDFLARE_API_TOKEN`. Nunca lo pegues en un chat ni lo subas al repositorio.**

## Qué no pude verificar

- La conexión real con tu cuenta y el dominio, por lo explicado arriba.
- Los detalles vigentes de la documentación de Cloudflare (límites, precios, comportamiento del DNS): no tuve acceso a ella. Contrástalos en <https://developers.cloudflare.com/workers/static-assets/> antes del paso 3.
