-- 23/10/2026 · Autorizado por Sebas (docs/SEGURIDAD.md, puntos A y B).
--
-- A. Un pedido ya no le cambia el nombre a una clienta. Antes, el upsert por
--    telefono pisaba el nombre guardado con el que escribiera cualquiera que
--    usara ese telefono. Ahora se conserva el guardado y, si el del pedido es
--    otro, queda anotado en las notas privadas del pedido para que Sebas lo vea.
-- B. No entran items sin producto. Antes, un item sin product_id (o con un
--    tamano que no existe) entraba con el nombre que mandara quien llamara a
--    la funcion y precio 0. La tienda nunca manda eso; solo podia venir de una
--    llamada a mano. Ahora se rechaza el pedido entero ('item_invalido'): la
--    tienda le muestra a la clienta que siga por WhatsApp.
--
-- Todo lo demas queda igual (validaciones de nombre, telefono, limites por
-- minuto y por telefono, cantidad de items, precio buscado en la base).
--
-- Aplicada el 23/10/2026 con apply_migration (misma logica que este archivo).
-- Probada antes en una transaccion que se deshace: pedido valido (total bien
-- calculado), mismo telefono con otro nombre (se conserva y se anota), item
-- sin producto, tamano inexistente y product_id basura (los tres rechazados).

create or replace function public.crear_pedido_web(p_nombre text, p_telefono text, p_items jsonb)
 returns table(order_id uuid, numero bigint)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_tel        text;
  v_nombre     text;
  v_guardado   text;
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
  v_nombre := nullif(btrim(p_nombre), '');
  if v_nombre is null or length(v_nombre) > 120 then
    raise exception 'nombre_invalido';
  end if;

  v_tel := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  if length(v_tel) < 8 or length(v_tel) > 15 then
    raise exception 'telefono_invalido';
  end if;

  select count(*) into v_recientes
  from public.orders
  where canal = 'web' and created_at > now() - interval '1 minute';
  if v_recientes >= 20 then
    raise exception 'demasiados_pedidos';
  end if;

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

  -- B: antes de escribir nada, cada item tiene que ser un producto activo con
  -- ese tamano activo.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object'
       or (v_item ->> 'product_id') is null
       or (v_item ->> 'product_id') !~ '^[0-9a-fA-F-]{36}$'
       or coalesce(v_item ->> 'ml', '') !~ '^\d{1,4}$' then
      raise exception 'item_invalido';
    end if;
    if not exists (
      select 1
      from public.products p, jsonb_array_elements(p.presentaciones) pres
      where p.id = (v_item ->> 'product_id')::uuid
        and p.activo = true
        and (pres ->> 'ml')::int = (v_item ->> 'ml')::int
        and coalesce((pres ->> 'activo')::boolean, true)
    ) then
      raise exception 'item_invalido';
    end if;
  end loop;

  -- A: el nombre guardado no se pisa.
  select id, nombre into v_customer, v_guardado from public.customers where telefono = v_tel;
  if v_customer is null then
    insert into public.customers (nombre, telefono)
    values (v_nombre, v_tel)
    on conflict (telefono) do update set telefono = excluded.telefono
    returning id, nombre into v_customer, v_guardado;
  end if;

  insert into public.orders (customer_id, canal, estado, notas_privadas)
  values (
    v_customer, 'web', 'nuevo',
    case when lower(btrim(v_guardado)) <> lower(v_nombre)
         then 'En la web escribio el nombre: ' || v_nombre end
  )
  returning orders.id, orders.numero into v_order, v_numero;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_cant := coalesce((v_item ->> 'cantidad')::int, 1);
    if v_cant < 1 or v_cant > 20 then v_cant := 1; end if;
    v_ml := (v_item ->> 'ml')::int;

    select * into v_prod from public.products
      where id = (v_item ->> 'product_id')::uuid and activo = true;

    select coalesce((pres ->> 'precio')::numeric, 0) into v_precio
    from jsonb_array_elements(v_prod.presentaciones) pres
    where (pres ->> 'ml')::int = v_ml
      and coalesce((pres ->> 'activo')::boolean, true)
    limit 1;

    v_nombre_snap := v_prod.nombre || ' Bagues' || ' ' || v_ml::text || 'ml';

    insert into public.order_items
      (order_id, product_id, nombre_snapshot, ml, cantidad, precio_unitario)
    values
      (v_order, v_prod.id, v_nombre_snap, v_ml, v_cant, v_precio);

    v_total := v_total + v_precio * v_cant;
  end loop;

  update public.orders set total_estimado = v_total where id = v_order;

  return query select v_order, v_numero;
end $function$;

-- Los permisos no cambian (create or replace los conserva): anon y
-- authenticated la pueden ejecutar, como antes.
