-- ============================================================================
-- 0010 · HARDENING — cierra dos cosas que quedaron abiertas
--
-- 1) Se elimina la extension pg_net. La instalo la 0008 para el webhook de
--    aviso, que la 0009 borro por redundante y roto. Desde entonces pg_net
--    quedo instalada en el schema `public` sin que ninguna funcion ni trigger
--    la use (verificado). pg_net permite hacer requests HTTP desde la base:
--    dejarla instalada y sin uso es superficie de ataque (SSRF/exfiltracion si
--    algun dia hubiera una inyeccion) a cambio de cero beneficio. Se va.
--    Tambien resuelve el aviso `extension_in_public` del linter.
--
-- 2) Se agrega rate limiting a crear_pedido_web(). Es el unico punto por el que
--    la web publica escribe, y hasta ahora cualquiera podia llamarlo sin limite:
--    un script podia crear pedidos y clientes ilimitados (spam de la tabla
--    orders/customers). Los topes son deliberadamente altos: el trafico real es
--    de pocos pedidos por dia, asi que solo se disparan ante abuso automatizado
--    y nunca ante una clienta comprando normal.
--      - global:   maximo 20 pedidos 'web' por minuto (todos juntos)
--      - por tel.: no dos pedidos del mismo telefono en 15 segundos
--                  (ademas frena el doble-submit accidental)
--
-- Para revertir el rate limiting: reinstalar la definicion de la 0004.
-- Para revertir el drop de pg_net: `create extension pg_net;` (no hace falta,
-- no lo usa nadie).
-- ============================================================================

drop extension if exists pg_net;

create or replace function public.crear_pedido_web(
  p_nombre    text,
  p_telefono  text,
  p_items     jsonb          -- [{ "product_id": uuid|null, "nombre": text, "ml": int, "cantidad": int }]
)
returns table (order_id uuid, numero bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tel        text;
  v_nombre     text;
  v_customer   uuid;
  v_order      uuid;
  v_numero     bigint;
  v_item       jsonb;
  v_count      int;
  v_prod       public.products%rowtype;
  v_precio     numeric(12,2);
  v_ml         int;
  v_cant       int;
  v_nombre_snap text;
  v_total      numeric(12,2) := 0;
  v_recientes  int;
begin
  -- -------- validaciones basicas ----------------------------------------
  v_nombre := nullif(btrim(p_nombre), '');
  if v_nombre is null or length(v_nombre) > 120 then
    raise exception 'nombre_invalido';
  end if;

  -- telefono: solo digitos, 8 a 15 (formato internacional sin +)
  v_tel := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  if length(v_tel) < 8 or length(v_tel) > 15 then
    raise exception 'telefono_invalido';
  end if;

  -- -------- rate limiting ------------------------------------------------
  -- Tope global: frena una avalancha automatizada sin rozar el trafico real.
  select count(*) into v_recientes
  from public.orders
  where canal = 'web' and created_at > now() - interval '1 minute';
  if v_recientes >= 20 then
    raise exception 'demasiados_pedidos';
  end if;

  -- Anti doble-submit / spam del mismo numero.
  select count(*) into v_recientes
  from public.orders o
  join public.customers c on c.id = o.customer_id
  where o.canal = 'web'
    and c.telefono = v_tel
    and o.created_at > now() - interval '15 seconds';
  if v_recientes >= 1 then
    raise exception 'pedido_muy_seguido';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items_invalidos';
  end if;
  v_count := jsonb_array_length(p_items);
  if v_count < 1 or v_count > 40 then
    raise exception 'items_fuera_de_rango';
  end if;

  -- -------- cliente: upsert por telefono --------------------------------
  insert into public.customers (nombre, telefono)
  values (v_nombre, v_tel)
  on conflict (telefono)
  do update set nombre = excluded.nombre
  returning id into v_customer;

  -- -------- pedido -----------------------------------------------------
  insert into public.orders (customer_id, canal, estado)
  values (v_customer, 'web', 'nuevo')
  returning orders.id, orders.numero into v_order, v_numero;

  -- -------- items -----------------------------------------------------
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_cant := coalesce((v_item ->> 'cantidad')::int, 1);
    if v_cant < 1 or v_cant > 20 then v_cant := 1; end if;
    v_ml := nullif(v_item ->> 'ml', '')::int;

    v_prod := null;
    if (v_item ->> 'product_id') is not null then
      select * into v_prod from public.products
        where id = (v_item ->> 'product_id')::uuid and activo = true;
    end if;

    -- precio: se toma de la presentacion del producto segun ml (fuente de
    -- verdad), nunca del cliente. Si no se encuentra, queda 0 y lo ajustas.
    v_precio := 0;
    if v_prod.id is not null then
      select coalesce((pres ->> 'precio')::numeric, 0) into v_precio
      from jsonb_array_elements(v_prod.presentaciones) pres
      where (pres ->> 'ml')::int = v_ml
      limit 1;

      v_nombre_snap := v_prod.nombre
        || ' Bagues'
        || coalesce(' ' || v_ml::text || 'ml', '');
    else
      -- item escrito a mano en el form (fallback)
      v_nombre_snap := left(coalesce(v_item ->> 'nombre', 'Perfume'), 160);
    end if;

    insert into public.order_items
      (order_id, product_id, nombre_snapshot, ml, cantidad, precio_unitario)
    values
      (v_order, v_prod.id, v_nombre_snap, v_ml, v_cant, v_precio);

    v_total := v_total + v_precio * v_cant;
  end loop;

  update public.orders set total_estimado = v_total where id = v_order;

  return query select v_order, v_numero;
end $$;

revoke all on function public.crear_pedido_web(text, text, jsonb) from public;
grant execute on function public.crear_pedido_web(text, text, jsonb) to anon, authenticated;
