-- Plataforma multi-negocio: negocios, miembros, productos, inventario, clientes, ventas y suscripción.
-- Cada fila de negocio pertenece a un negocio; RLS deja ver y tocar solo los negocios donde el usuario es miembro.

create extension if not exists pgcrypto;

-- ───────────── Tipos ─────────────
create type rol_miembro as enum ('dueno', 'admin', 'vendedor');
create type tipo_producto as enum ('producto', 'servicio');
create type tipo_movimiento as enum ('entrada', 'salida', 'ajuste', 'venta', 'anulacion');
create type estado_venta as enum ('completada', 'anulada');
create type estado_suscripcion as enum ('prueba', 'activa', 'vencida', 'cancelada');

-- ───────────── Tablas ─────────────
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  created_at timestamptz not null default now()
);

create table negocios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(btrim(nombre)) between 2 and 80),
  moneda text not null default 'COP',
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table miembros (
  negocio_id uuid not null references negocios (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rol rol_miembro not null default 'vendedor',
  created_at timestamptz not null default now(),
  primary key (negocio_id, user_id)
);
create index on miembros (user_id);

create table categorias (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) > 0),
  unique (negocio_id, nombre)
);

create table productos (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  categoria_id uuid references categorias (id) on delete set null,
  tipo tipo_producto not null default 'producto',
  sku text,
  nombre text not null check (length(btrim(nombre)) > 0),
  descripcion text,
  precio numeric(14, 2) not null default 0 check (precio >= 0),
  costo numeric(14, 2) not null default 0 check (costo >= 0),
  controla_stock boolean not null default true,
  stock_minimo numeric(14, 2) not null default 0 check (stock_minimo >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (negocio_id, sku)
);
create index on productos (negocio_id, nombre);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) > 0),
  documento text,
  email text,
  telefono text,
  direccion text,
  notas text,
  created_at timestamptz not null default now()
);
create index on clientes (negocio_id, nombre);

create table metodos_pago (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) > 0),
  activo boolean not null default true,
  unique (negocio_id, nombre)
);

create table ventas (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  numero bigint not null,
  cliente_id uuid references clientes (id) on delete set null,
  metodo_pago_id uuid references metodos_pago (id) on delete set null,
  subtotal numeric(14, 2) not null default 0,
  descuento numeric(14, 2) not null default 0 check (descuento >= 0),
  total numeric(14, 2) not null default 0,
  estado estado_venta not null default 'completada',
  nota text,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  unique (negocio_id, numero)
);
create index on ventas (negocio_id, created_at desc);
create index on ventas (cliente_id);

create table venta_items (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references ventas (id) on delete cascade,
  negocio_id uuid not null references negocios (id) on delete cascade,
  producto_id uuid references productos (id) on delete set null,
  descripcion text not null,
  cantidad numeric(14, 2) not null check (cantidad > 0),
  precio_unitario numeric(14, 2) not null check (precio_unitario >= 0),
  total numeric(14, 2) not null
);
create index on venta_items (venta_id);

create table movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios (id) on delete cascade,
  producto_id uuid not null references productos (id) on delete cascade,
  tipo tipo_movimiento not null,
  -- Con signo: entradas y anulaciones suman, ventas y salidas restan, un ajuste puede ser ambos.
  cantidad numeric(14, 2) not null check (cantidad <> 0),
  nota text,
  venta_id uuid references ventas (id) on delete set null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);
create index on movimientos_inventario (producto_id, created_at desc);
create index on movimientos_inventario (negocio_id, created_at desc);

create table planes (
  codigo text primary key,
  nombre text not null,
  precio_cop numeric(14, 2) not null,
  max_usuarios int,
  max_productos int,
  orden int not null default 0
);

create table suscripciones (
  negocio_id uuid primary key references negocios (id) on delete cascade,
  plan_codigo text not null references planes (codigo),
  estado estado_suscripcion not null default 'prueba',
  prueba_hasta timestamptz not null default (now() + interval '14 days'),
  proximo_cobro timestamptz,
  referencia_wompi text,
  updated_at timestamptz not null default now()
);

insert into planes (codigo, nombre, precio_cop, max_usuarios, max_productos, orden) values
  ('basico', 'Básico', 49000, 2, 200, 1),
  ('negocio', 'Negocio', 99000, 5, 2000, 2),
  ('pro', 'Pro', 199000, null, null, 3);

-- ───────────── Funciones de permisos ─────────────
create function es_miembro(p_negocio uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from miembros where negocio_id = p_negocio and user_id = auth.uid());
$$;

create function tiene_rol(p_negocio uuid, p_roles rol_miembro[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from miembros
    where negocio_id = p_negocio and user_id = auth.uid() and rol = any (p_roles)
  );
$$;

-- ───────────── RLS ─────────────
alter table profiles enable row level security;
alter table negocios enable row level security;
alter table miembros enable row level security;
alter table categorias enable row level security;
alter table productos enable row level security;
alter table clientes enable row level security;
alter table metodos_pago enable row level security;
alter table ventas enable row level security;
alter table venta_items enable row level security;
alter table movimientos_inventario enable row level security;
alter table planes enable row level security;
alter table suscripciones enable row level security;

create policy profiles_propio on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy negocios_ver on negocios for select to authenticated using (es_miembro(id));
create policy negocios_editar on negocios for update to authenticated
  using (tiene_rol(id, array['dueno', 'admin']::rol_miembro[]))
  with check (tiene_rol(id, array['dueno', 'admin']::rol_miembro[]));
-- Los negocios nuevos se crean con crear_negocio(); no hay insert ni delete directo.

create policy miembros_ver on miembros for select to authenticated using (es_miembro(negocio_id));
create policy miembros_gestionar on miembros for all to authenticated
  using (tiene_rol(negocio_id, array['dueno', 'admin']::rol_miembro[]))
  with check (tiene_rol(negocio_id, array['dueno', 'admin']::rol_miembro[]) and rol <> 'dueno');

-- Catálogo: todos los miembros ven; dueño y admin escriben.
create policy categorias_ver on categorias for select to authenticated using (es_miembro(negocio_id));
create policy categorias_escribir on categorias for all to authenticated
  using (tiene_rol(negocio_id, array['dueno', 'admin']::rol_miembro[]))
  with check (tiene_rol(negocio_id, array['dueno', 'admin']::rol_miembro[]));

create policy productos_ver on productos for select to authenticated using (es_miembro(negocio_id));
create policy productos_escribir on productos for all to authenticated
  using (tiene_rol(negocio_id, array['dueno', 'admin']::rol_miembro[]))
  with check (tiene_rol(negocio_id, array['dueno', 'admin']::rol_miembro[]));

create policy metodos_pago_ver on metodos_pago for select to authenticated using (es_miembro(negocio_id));
create policy metodos_pago_escribir on metodos_pago for all to authenticated
  using (tiene_rol(negocio_id, array['dueno', 'admin']::rol_miembro[]))
  with check (tiene_rol(negocio_id, array['dueno', 'admin']::rol_miembro[]));

-- Clientes: cualquier miembro (el vendedor también crea clientes al vender).
create policy clientes_ver on clientes for select to authenticated using (es_miembro(negocio_id));
create policy clientes_escribir on clientes for all to authenticated
  using (es_miembro(negocio_id)) with check (es_miembro(negocio_id));

-- Ventas, ítems e inventario: solo lectura directa; se escriben con las funciones de abajo.
create policy ventas_ver on ventas for select to authenticated using (es_miembro(negocio_id));
create policy venta_items_ver on venta_items for select to authenticated using (es_miembro(negocio_id));
create policy movimientos_ver on movimientos_inventario for select to authenticated using (es_miembro(negocio_id));

create policy planes_ver on planes for select to authenticated using (true);
create policy suscripciones_ver on suscripciones for select to authenticated using (es_miembro(negocio_id));
-- La suscripción solo la cambia el servicio (webhook de Wompi con service_role).

-- ───────────── Grants ─────────────
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on ventas, venta_items, movimientos_inventario, suscripciones, planes, negocios from authenticated;
grant update (nombre, moneda) on negocios to authenticated;
grant all on all tables in schema public to service_role;

-- ───────────── Stock actual ─────────────
create view productos_stock with (security_invoker = true) as
select p.*,
       coalesce(sum(m.cantidad), 0)::numeric(14, 2) as stock_actual
from productos p
left join movimientos_inventario m on m.producto_id = p.id
group by p.id;
grant select on productos_stock to authenticated;

-- ───────────── Funciones de negocio ─────────────
create function crear_negocio(p_nombre text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_negocio uuid;
begin
  if v_user is null then
    raise exception 'Inicia sesión para crear un negocio' using errcode = '28000';
  end if;

  insert into negocios (nombre, created_by) values (btrim(p_nombre), v_user) returning id into v_negocio;
  insert into miembros (negocio_id, user_id, rol) values (v_negocio, v_user, 'dueno');
  insert into suscripciones (negocio_id, plan_codigo) values (v_negocio, 'basico');
  insert into metodos_pago (negocio_id, nombre)
    values (v_negocio, 'Efectivo'), (v_negocio, 'Transferencia'), (v_negocio, 'Tarjeta'), (v_negocio, 'Nequi');
  return v_negocio;
end;
$$;

-- p_items: [{"producto_id": "...", "cantidad": 2, "precio_unitario": 15000}]; precio_unitario es opcional.
create function registrar_venta(
  p_negocio uuid,
  p_cliente uuid,
  p_metodo_pago uuid,
  p_descuento numeric,
  p_nota text,
  p_items jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_venta uuid;
  v_numero bigint;
  v_subtotal numeric(14, 2) := 0;
  v_item jsonb;
  v_prod productos%rowtype;
  v_cant numeric(14, 2);
  v_precio numeric(14, 2);
  v_stock numeric(14, 2);
begin
  if v_user is null or not es_miembro(p_negocio) then
    raise exception 'No tienes acceso a este negocio' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta necesita al menos un producto';
  end if;
  if p_cliente is not null and not exists (select 1 from clientes where id = p_cliente and negocio_id = p_negocio) then
    raise exception 'Cliente no válido';
  end if;
  if p_metodo_pago is not null and not exists (select 1 from metodos_pago where id = p_metodo_pago and negocio_id = p_negocio) then
    raise exception 'Método de pago no válido';
  end if;

  -- Serializa las ventas del mismo negocio para que el consecutivo no se repita.
  perform pg_advisory_xact_lock(hashtextextended(p_negocio::text, 0));
  select coalesce(max(numero), 0) + 1 into v_numero from ventas where negocio_id = p_negocio;

  insert into ventas (negocio_id, numero, cliente_id, metodo_pago_id, descuento, nota, created_by)
  values (p_negocio, v_numero, p_cliente, p_metodo_pago, 0, p_nota, v_user)
  returning id into v_venta;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_cant := (v_item ->> 'cantidad')::numeric;
    if v_cant is null or v_cant <= 0 then
      raise exception 'Cantidad no válida';
    end if;

    select * into v_prod from productos
      where id = (v_item ->> 'producto_id')::uuid and negocio_id = p_negocio and activo
      for update;
    if not found then
      raise exception 'Producto no encontrado o inactivo';
    end if;

    v_precio := coalesce((v_item ->> 'precio_unitario')::numeric, v_prod.precio);
    if v_precio < 0 then
      raise exception 'Precio no válido';
    end if;

    if v_prod.controla_stock then
      select coalesce(sum(cantidad), 0) into v_stock from movimientos_inventario where producto_id = v_prod.id;
      if v_stock < v_cant then
        raise exception 'Stock insuficiente de "%" (quedan %)', v_prod.nombre, v_stock;
      end if;
      insert into movimientos_inventario (negocio_id, producto_id, tipo, cantidad, venta_id, created_by)
      values (p_negocio, v_prod.id, 'venta', -v_cant, v_venta, v_user);
    end if;

    insert into venta_items (venta_id, negocio_id, producto_id, descripcion, cantidad, precio_unitario, total)
    values (v_venta, p_negocio, v_prod.id, v_prod.nombre, v_cant, v_precio, round(v_cant * v_precio, 2));
    v_subtotal := v_subtotal + round(v_cant * v_precio, 2);
  end loop;

  if coalesce(p_descuento, 0) > v_subtotal then
    raise exception 'El descuento no puede superar el subtotal';
  end if;
  update ventas
     set subtotal = v_subtotal, descuento = coalesce(p_descuento, 0), total = v_subtotal - coalesce(p_descuento, 0)
   where id = v_venta;
  return v_venta;
end;
$$;

create function anular_venta(p_venta uuid, p_motivo text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_venta ventas%rowtype;
begin
  select * into v_venta from ventas where id = p_venta for update;
  if not found or v_user is null or not tiene_rol(v_venta.negocio_id, array['dueno', 'admin']::rol_miembro[]) then
    raise exception 'No tienes permiso para anular esta venta' using errcode = '42501';
  end if;
  if v_venta.estado = 'anulada' then
    raise exception 'La venta ya está anulada';
  end if;

  update ventas set estado = 'anulada', nota = coalesce(nullif(btrim(p_motivo), ''), nota) where id = p_venta;
  insert into movimientos_inventario (negocio_id, producto_id, tipo, cantidad, venta_id, nota, created_by)
  select m.negocio_id, m.producto_id, 'anulacion', -m.cantidad, p_venta, 'Anulación venta #' || v_venta.numero, v_user
  from movimientos_inventario m
  where m.venta_id = p_venta and m.tipo = 'venta';
end;
$$;

create function ajustar_stock(p_producto uuid, p_tipo tipo_movimiento, p_cantidad numeric, p_nota text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_negocio uuid;
begin
  select negocio_id into v_negocio from productos where id = p_producto;
  if v_negocio is null or v_user is null or not tiene_rol(v_negocio, array['dueno', 'admin']::rol_miembro[]) then
    raise exception 'No tienes permiso para mover este inventario' using errcode = '42501';
  end if;
  if p_tipo not in ('entrada', 'salida', 'ajuste') then
    raise exception 'Tipo de movimiento no válido';
  end if;
  -- Entradas siempre suman y salidas siempre restan; el ajuste conserva el signo que se envíe.
  insert into movimientos_inventario (negocio_id, producto_id, tipo, cantidad, nota, created_by)
  values (
    v_negocio, p_producto, p_tipo,
    case p_tipo when 'entrada' then abs(p_cantidad) when 'salida' then -abs(p_cantidad) else p_cantidad end,
    p_nota, v_user
  );
end;
$$;

-- Perfil automático al registrarse.
create function crear_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, nombre) values (new.id, new.raw_user_meta_data ->> 'nombre');
  return new;
end;
$$;
create trigger al_registrarse after insert on auth.users for each row execute function crear_profile();

revoke execute on all functions in schema public from public, anon;
grant execute on function crear_negocio(text), registrar_venta(uuid, uuid, uuid, numeric, text, jsonb),
  anular_venta(uuid, text), ajustar_stock(uuid, tipo_movimiento, numeric, text),
  es_miembro(uuid), tiene_rol(uuid, rol_miembro[]) to authenticated;
