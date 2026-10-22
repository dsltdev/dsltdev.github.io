# dsltdev.com

**Mis finanzas**: aplicación personal y privada para llevar gastos, ingresos, transferencias entre cuentas, pagos recurrentes y presupuestos.
Además, la landing de servicios de auditoría y desarrollo.
Astro (sitio estático) + React (la app) + Supabase (base de datos y login) + Cloudflare (hosting).

## Estructura

| Ruta | Qué es | Dónde está |
| :-- | :-- | :-- |
| `/` | La app (login, resumen, movimientos, cuentas, categorías, recurrentes, ajustes) | `src/pages/index.astro` y `src/app/` |
| `/servicios`, `/portafolio`, `/blog` | Servicios de auditoría y desarrollo | `src/pages/` |
| `/privacy`, `/terms` | Documentos legales | `src/pages/` |

Base de datos: `db/migrations/*.sql` (se aplican en orden). Las migraciones 0001 y 0002 son de una plataforma de negocios que ya no existe; la 0003 la reemplaza por el esquema de gastos.
Entorno local con Docker: `infra/README.md`. Despliegue: `docs/DESPLIEGUE-CLOUDFLARE.md`.

## Registro cerrado

Es una app de una sola persona: un trigger de la base de datos (`cerrar_registro`) impide crear cuentas nuevas cuando ya existe una. Para abrir el registro otra vez hay que borrar ese trigger.

## Comandos

| Comando | Acción |
| :-- | :-- |
| `npm install` | Instala dependencias |
| `npm run dev` | Servidor local en `localhost:4321` |
| `npm run build` | Compila a `./dist/` |
| `npm run deploy` | Compila y sube a Cloudflare |
| `npm run typecheck` | Revisa tipos |

Copia `.env.example` a `.env` y completa `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY`.
