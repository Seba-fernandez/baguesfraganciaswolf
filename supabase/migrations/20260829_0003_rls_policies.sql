-- ============================================================================
-- 0003 · RLS — Row Level Security
-- Público (anon): solo lee catálogo/promos activos. No toca clientes ni pedidos.
-- Admin (vos): acceso total, identificado por email en el JWT.
-- Crear pedido desde la web: solo vía la función crear_pedido_web() (0004).
-- ============================================================================

-- Email(s) con acceso de admin. Si mañana sumás a alguien, se agrega acá.
create or replace function public.es_admin()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') in (
    'sebixtar@gmail.com'
  );
$$;

alter table public.products    enable row level security;
alter table public.customers   enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.promos      enable row level security;
alter table public.settings    enable row level security;

-- ---------- PRODUCTS -----------------------------------------------------
create policy products_public_read on public.products
  for select to anon, authenticated
  using (activo = true or public.es_admin());

create policy products_admin_all on public.products
  for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ---------- PROMOS ------------------------------------------------------
create policy promos_public_read on public.promos
  for select to anon, authenticated
  using (activo = true or public.es_admin());

create policy promos_admin_all on public.promos
  for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ---------- SETTINGS ---------------------------------------------------
-- El público necesita leer whatsapp_owner / textos para el checkout.
create policy settings_public_read on public.settings
  for select to anon, authenticated using (true);

create policy settings_admin_write on public.settings
  for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- ---------- CUSTOMERS / ORDERS / ORDER_ITEMS --------------------------
-- Nada para anon. Solo admin. (La web escribe vía RPC SECURITY DEFINER.)
create policy customers_admin_all on public.customers
  for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy orders_admin_all on public.orders
  for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy order_items_admin_all on public.order_items
  for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
