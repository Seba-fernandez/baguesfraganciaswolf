-- ============================================================================
-- 0002 · ESQUEMA PERFUMES — Bagues Grupo Wolf
-- Tablas: products, customers, orders, order_items, promos, settings
-- Convención: snake_case, español. Timestamps en timestamptz.
-- ============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- ---------- ENUMS ----------------------------------------------------------
do $$ begin
  create type public.genero as enum ('masculino', 'femenino', 'unisex');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estado_pedido as enum (
    'nuevo',          -- entró (web o manual), sin tocar
    'senia',          -- el cliente pagó la seña
    'cargado',        -- ya lo cargaste en la web de Bagués
    'en_proveedora',  -- llegó a tu proveedora, esperás el viernes
    'retirado',       -- lo buscaste el viernes
    'avisado',        -- le avisaste al cliente que está listo
    'entregado',      -- cerrado
    'cancelado'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estado_pago as enum ('no', 'senia', 'total');
exception when duplicate_object then null; end $$;

-- ---------- updated_at helper -------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- PRODUCTS --------------------------------------------------------
create table public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  nombre            text not null,                       -- "Hawai Masculino"
  linea             text not null default 'bagues',
  genero            public.genero not null default 'unisex',
  familia_olfativa  text default '',                     -- amaderado, cítrico, dulce...
  momento           text not null default 'todo',        -- verano | invierno | todo
  descripcion_corta text default '',
  descripcion_larga text default '',
  nota_salida       text default '',
  nota_corazon      text default '',
  nota_fondo        text default '',
  imagen_url        text default '',
  -- [{ "ml": 50, "precio": 18000, "activo": true }, ...]
  presentaciones    jsonb not null default '[]'::jsonb,
  activo            boolean not null default true,        -- toggle del panel
  destacado         boolean not null default false,
  orden             int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index products_activo_idx    on public.products (activo);
create index products_orden_idx     on public.products (orden);
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------- CUSTOMERS -----------------------------------------------------
create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  telefono    text unique not null,                      -- normalizado: 549351...
  notas       text default '',
  created_at  timestamptz not null default now()
);

-- ---------- ORDERS --------------------------------------------------------
create table public.orders (
  id                    uuid primary key default gen_random_uuid(),
  numero                bigint generated always as identity,   -- "Pedido #14"
  customer_id           uuid not null references public.customers(id) on delete restrict,
  estado                public.estado_pedido not null default 'nuevo',
  pago                  public.estado_pago  not null default 'no',
  senia_monto           numeric(12,2) default 0,
  total_estimado        numeric(12,2) default 0,
  canal                 text not null default 'manual',        -- web | manual
  notas_conversacion    text default '',                       -- qué le dijiste al cliente
  notas_privadas        text default '',
  semana_pedido         date default (now() at time zone 'America/Argentina/Cordoba')::date,
  fecha_retiro_estimada date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index orders_estado_idx   on public.orders (estado);
create index orders_customer_idx on public.orders (customer_id);
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ---------- ORDER_ITEMS -------------------------------------------------
create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  product_id       uuid references public.products(id) on delete set null,
  nombre_snapshot  text not null,                         -- "Hawai Masculino Bagués 50ml"
  ml               int,
  cantidad         int not null default 1 check (cantidad > 0),
  precio_unitario  numeric(12,2) not null default 0
);
create index order_items_order_idx on public.order_items (order_id);

-- ---------- PROMOS --------------------------------------------------------
create table public.promos (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null default '',
  bajada      text default '',
  imagen_url  text default '',
  cta_texto   text default '',
  cta_link    text default '',
  ubicacion   text not null default 'seccion',            -- hero | seccion
  activo      boolean not null default true,
  orden       int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- SETTINGS (fila única) ------------------------------------------
create table public.settings (
  id                 int primary key default 1 check (id = 1),
  whatsapp_owner     text default '',                     -- 549351XXXXXXX (link wa.me)
  instagram_user     text default '',
  mensaje_checkout   text default 'Tu pedido me llega y te escribo por WhatsApp para confirmar stock y tiempos.',
  aclaracion_pedido  text default 'Venta particular · catálogo Bagués. Pedidos de fin de semana, retiro los viernes.',
  updated_at         timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict do nothing;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();
