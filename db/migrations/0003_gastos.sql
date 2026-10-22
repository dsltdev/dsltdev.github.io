-- App personal de gastos: cuentas, categorías, movimientos (gasto, ingreso, transferencia),
-- pagos recurrentes y presupuestos. Reemplaza por completo el esquema de la plataforma de negocios
-- (0001 y 0002); se ejecutó cuando esas tablas aún no tenían datos reales.
-- Cada fila es de una sola persona (user_id) y el registro se cierra después de la primera cuenta.

-- ───────────── Se retira el esquema anterior ─────────────
-- Primero vista y tablas (las políticas dependen de las funciones), luego funciones y tipos.
drop trigger if exists al_registrarse on auth.users;
drop view if exists productos_stock;
drop table if exists suscripciones, planes, movimientos_inventario, venta_items, ventas, metodos_pago,
  clientes, productos, categorias, miembros, negocios, profiles cascade;
drop function if exists crear_profile();
drop function if exists crear_negocio(text);
drop function if exists registrar_venta(uuid, uuid, uuid, numeric, text, jsonb);
drop function if exists anular_venta(uuid, text);
drop function if exists ajustar_stock(uuid, tipo_movimiento, numeric, text);
drop function if exists es_miembro(uuid);
drop function if exists tiene_rol(uuid, rol_miembro[]);
drop type if exists rol_miembro, tipo_producto, tipo_movimiento, estado_venta, estado_suscripcion;

-- ───────────── Tipos ─────────────
create type tipo_cuenta as enum ('efectivo', 'banco', 'billetera', 'tarjeta');
create type tipo_movimiento as enum ('gasto', 'ingreso', 'transferencia');
create type tipo_categoria as enum ('gasto', 'ingreso');
create type frecuencia as enum ('semanal', 'mensual', 'anual');

-- ───────────── Tablas ─────────────
create table cuentas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) between 1 and 60),
  tipo tipo_cuenta not null default 'banco',
  -- Puede ser negativo: una tarjeta de crédito arranca con lo que ya debes.
  saldo_inicial numeric(14, 2) not null default 0,
  archivada boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, nombre)
);

create table categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) between 1 and 60),
  tipo tipo_categoria not null default 'gasto',
  -- Límite del mes para esta categoría (solo tiene sentido en gastos).
  presupuesto_mensual numeric(14, 2) check (presupuesto_mensual is null or presupuesto_mensual > 0),
  created_at timestamptz not null default now(),
  unique (user_id, tipo, nombre)
);

create table pagos_recurrentes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) between 1 and 80),
  tipo tipo_categoria not null default 'gasto',
  monto numeric(14, 2) not null check (monto > 0),
  cuenta_id uuid not null references cuentas (id) on delete restrict,
  categoria_id uuid references categorias (id) on delete set null,
  frecuencia frecuencia not null default 'mensual',
  proxima_fecha date not null,
  recordar_dias int not null default 3 check (recordar_dias between 0 and 30),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table movimientos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo tipo_movimiento not null,
  cuenta_id uuid not null references cuentas (id) on delete restrict,
  -- Solo en transferencias: la cuenta que recibe el dinero.
  cuenta_destino_id uuid references cuentas (id) on delete restrict,
  categoria_id uuid references categorias (id) on delete set null,
  monto numeric(14, 2) not null check (monto > 0),
  fecha date not null default ((now() at time zone 'America/Bogota')::date),
  nota text,
  recurrente_id uuid references pagos_recurrentes (id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (tipo = 'transferencia' and cuenta_destino_id is not null and cuenta_destino_id <> cuenta_id and categoria_id is null)
    or (tipo <> 'transferencia' and cuenta_destino_id is null)
  )
);
create index on movimientos (user_id, fecha desc);
create index on movimientos (cuenta_id);
create index on movimientos (cuenta_destino_id);
create index on movimientos (categoria_id);
create index on pagos_recurrentes (user_id, proxima_fecha);

-- ───────────── RLS: todo es solo del dueño ─────────────
alter table cuentas enable row level security;
alter table categorias enable row level security;
alter table pagos_recurrentes enable row level security;
alter table movimientos enable row level security;

create policy cuentas_propias on cuentas for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy categorias_propias on categorias for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy recurrentes_propios on pagos_recurrentes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy movimientos_propios on movimientos for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- ───────────── Saldo actual de cada cuenta ─────────────
create view cuentas_saldo with (security_invoker = true) as
select c.*,
       (c.saldo_inicial + coalesce(sum(
          case
            when m.cuenta_id = c.id and m.tipo = 'ingreso' then m.monto
            when m.cuenta_id = c.id then -m.monto            -- gasto o transferencia que sale
            when m.cuenta_destino_id = c.id then m.monto     -- transferencia que entra
          end
        ), 0))::numeric(14, 2) as saldo
from cuentas c
left join movimientos m on m.cuenta_id = c.id or m.cuenta_destino_id = c.id
group by c.id;
grant select on cuentas_saldo to authenticated;

-- ───────────── Funciones ─────────────
-- Crea las categorías de partida la primera vez; si ya tienes categorías, no toca nada.
create function preparar_categorias() returns void
language plpgsql security invoker set search_path = public as $$
begin
  if exists (select 1 from categorias) then
    return;
  end if;
  insert into categorias (nombre, tipo) values
    ('Comida', 'gasto'), ('Mercado', 'gasto'), ('Transporte', 'gasto'), ('Arriendo', 'gasto'),
    ('Servicios', 'gasto'), ('Salud', 'gasto'), ('Ocio', 'gasto'), ('Ropa', 'gasto'),
    ('Educación', 'gasto'), ('Suscripciones', 'gasto'), ('Otros gastos', 'gasto'),
    ('Salario', 'ingreso'), ('Otros ingresos', 'ingreso');
end;
$$;

-- Registra el pago de un recurrente como movimiento y avanza su próxima fecha.
create function pagar_recurrente(p_id uuid, p_fecha date default null) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  r pagos_recurrentes%rowtype;
  v_mov uuid;
begin
  select * into r from pagos_recurrentes where id = p_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'Pago recurrente no encontrado';
  end if;

  insert into movimientos (tipo, cuenta_id, categoria_id, monto, fecha, nota, recurrente_id)
  values (r.tipo::text::tipo_movimiento, r.cuenta_id, r.categoria_id, r.monto,
          coalesce(p_fecha, (now() at time zone 'America/Bogota')::date), r.nombre, r.id)
  returning id into v_mov;

  update pagos_recurrentes
     set proxima_fecha = case r.frecuencia
           when 'semanal' then r.proxima_fecha + 7
           when 'mensual' then (r.proxima_fecha + interval '1 month')::date
           else (r.proxima_fecha + interval '1 year')::date
         end
   where id = r.id;
  return v_mov;
end;
$$;

-- Registro cerrado: es una app personal, solo existe la primera cuenta.
create function cerrar_registro() returns trigger
language plpgsql security definer set search_path = auth, public as $$
begin
  if exists (select 1 from auth.users) then
    raise exception 'El registro está cerrado' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger registro_cerrado before insert on auth.users
  for each row execute function cerrar_registro();

revoke execute on all functions in schema public from public, anon;
revoke execute on function public.cerrar_registro() from authenticated;
grant execute on function preparar_categorias(), pagar_recurrente(uuid, date) to authenticated;
