# dsltdev.com

Plataforma para pequeños negocios (ventas, inventario, clientes y suscripción) más la landing de servicios de desarrollo y auditoría.
Astro (sitio estático) + React (panel) + Supabase (base de datos y login).

## Estructura

| Ruta | Qué es | Dónde está |
| :-- | :-- | :-- |
| `/` | Landing de la plataforma | `src/pages/index.astro`, textos y planes en `src/data/plataforma.ts` |
| `/app/` | Panel (login, ventas, productos, inventario, clientes, ajustes) | `src/app/` |
| `/servicios`, `/portafolio`, `/blog` | Servicios de auditoría y desarrollo | `src/pages/` |
| `/privacy`, `/terms` | Documentos legales | `src/pages/` |

Base de datos: `db/migrations/*.sql`. Entorno local con Docker: `infra/README.md`.

## Comandos

| Comando | Acción |
| :-- | :-- |
| `npm install` | Instala dependencias |
| `npm run dev` | Servidor local en `localhost:4321` |
| `npm run build` | Compila a `./dist/` |
| `npm run typecheck` | Revisa tipos |

Copia `.env.example` a `.env` y completa `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`.
