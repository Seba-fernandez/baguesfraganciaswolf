-- ============================================================================
-- 0004 · RPC crear_pedido_web()
-- Punto de entrada ÚNICO para que la web pública cree un pedido.
-- SECURITY DEFINER: corre con permisos del dueño, saltea RLS de forma controlada.
-- Valida todo, hace customer + order + items en una transacción, devuelve el nº.
-- ============================================================================

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
begin
  -- -------- validaciones básicas ----------------------------------------
  v_nombre := nullif(btrim(p_nombre), '');
  if v_nombre is null or length(v_nombre) > 120 then
    raise exception 'nombre_invalido';
  end if;

  -- teléfono: solo dígitos, 8 a 15 (formato internacional sin +)
  v_tel := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  if length(v_tel) < 8 or length(v_tel) > 15 then
    raise exception 'telefono_invalido';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items_invalidos';
  end if;
  v_count := jsonb_array_length(p_items);
  if v_count < 1 or v_count > 40 then
    raise exception 'items_fuera_de_rango';
  end if;

  -- -------- cliente: upsert por teléfono --------------------------------
  insert into public.customers (nombre, telefono)
  values (v_nombre, v_tel)
  on conflict (telefono)
  do update set nombre = excluded.nombre
  returning id into v_customer;

  -- -------- pedido -----------------------------------------------------
  insert into public.orders (customer_id, canal, estado)
  values (v_customer, 'web', 'nuevo')
  returning orders.id, orders.numero into v_order, v_numero;

  -- -------- ítems -----------------------------------------------------
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

    -- precio: se toma de la presentación del producto según ml (fuente de verdad),
    -- nunca del cliente. Si no se encuentra, queda 0 y lo ajustás en el panel.
    v_precio := 0;
    if v_prod.id is not null then
      select coalesce((pres ->> 'precio')::numeric, 0) into v_precio
      from jsonb_array_elements(v_prod.presentaciones) pres
      where (pres ->> 'ml')::int = v_ml
      limit 1;

      v_nombre_snap := v_prod.nombre
        || ' Bagués'
        || coalesce(' ' || v_ml::text || 'ml', '');
    else
      -- ítem escrito a mano en el form (fallback)
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

-- Solo anon/authenticated pueden ejecutarla; nada más de la DB queda expuesto.
revoke all on function public.crear_pedido_web(text, text, jsonb) from public;
grant execute on function public.crear_pedido_web(text, text, jsonb) to anon, authenticated;
