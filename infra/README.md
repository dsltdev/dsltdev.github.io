# Entorno local

Supabase corre en Docker (`infra/supabase`). Las claves están en `infra/supabase/.env` (no se sube a git).

```sh
export PATH=/Applications/Docker.app/Contents/Resources/bin:$PATH
sh infra/supabase/run.sh start     # levanta todo (API en http://localhost:8000)
sh infra/supabase/run.sh stop
sh infra/supabase/run.sh secrets   # claves y contraseña del Studio
```

- Studio y API: http://localhost:8000
- Esquema: `db/migrations/*.sql`; se aplica con
  `docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < db/migrations/0001_plataforma.sql`
- Node 22 (para Astro) está en `~/development/node/bin`.
