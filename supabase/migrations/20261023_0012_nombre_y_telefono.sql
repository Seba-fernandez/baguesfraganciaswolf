-- 23/10/2026 · Pedido de Sebas: controlar nombre y telefono en todo lugar
-- donde se escriben, tolerante con la forma ("+54 9 351...", "0351 15...",
-- "351...") y estricto con el contenido.
--
-- Inyeccion SQL: la tienda nunca arma una consulta con texto; manda los datos
-- como parametros de esta funcion (PostgREST) y aca adentro se usan como
-- valores, nunca como codigo. Estas reglas no tapan un agujero: dejan afuera
-- datos sucios y numeros que despues no abren un chat de WhatsApp.
--
-- 1. telefono_ar(): la misma regla que telefonoArgentino() en
--    src/lib/datosCliente.js (pruebas en scripts/qa/datos.test.mjs). Devuelve
--    549 + caracteristica + numero, el numero de otro pais con "+" tal cual, o
--    null si no es un telefono. No se expone por la API.
-- 2. crear_pedido_web(): nombre con reglas (antes: cualquier texto de 1 a 120)
--    y telefono por telefono_ar (antes: de 8 a 15 cifras cualesquiera). Todo
--    lo demas igual que en la 0011.
-- 3. La unica clienta guardada estaba sin el 9 (54 351...): se pasa al formato
--    nuevo, asi su proximo pedido la encuentra.
--
-- Probada antes en una transaccion que se deshace: 28 formas de escribir un
-- telefono (18 que entran con el numero justo, 10 que no), un pedido valido
-- escrito "  María   José " con "0351 15 ..." (entra como "María José" y
-- 549351...), 7 nombres y 3 telefonos invalidos (rechazados) y la clienta
-- guardada (pasaria a 549 + 10 cifras). Aplicada el 23/10/2026.

create or replace function public.telefono_ar(p text)
 returns text
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare
  t    text := btrim(coalesce(p, ''));
  d    text;
  intl boolean;
begin
  if t = '' or t ~ '[^0-9[:space:]+()./-]' then
    return null;
  end if;
  d := regexp_replace(t, '\D', '', 'g');
  if d = '' then return null; end if;

  intl := left(t, 1) = '+' or left(d, 2) = '00';
  if left(d, 2) = '00' then d := substr(d, 3); end if;
  if intl and left(d, 2) <> '54' then
    return case when length(d) between 8 and 15 then d end;
  end if;

  -- Ninguna caracteristica empieza con 54 ni con 9: son el pais y el 9 del
  -- celular. Despues, el 0 de larga distancia.
  if left(d, 2) = '54' and length(d) >= 12 then d := substr(d, 3); end if;
  if left(d, 1) = '9' and length(d) >= 11 then d := substr(d, 2); end if;
  if left(d, 1) = '0' then d := substr(d, 2); end if;

  -- El 15 del celular, despues de una caracteristica de 2, 3 o 4 cifras.
  if length(d) = 12 then
    if left(d, 2) = '11' then
      if substr(d, 3, 2) = '15' then d := left(d, 2) || substr(d, 5); end if;
    elsif substr(d, 4, 2) = '15' then d := left(d, 3) || substr(d, 6);
    elsif substr(d, 5, 2) = '15' then d := left(d, 4) || substr(d, 7);
    elsif substr(d, 3, 2) = '15' then d := left(d, 2) || substr(d, 5);
    end if;
  end if;

  if length(d) <> 10 or d !~ '^[123]' then return null; end if;
  return '549' || d;
end $function$;

revoke all on function public.telefono_ar(text) from public, anon, authenticated;

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
  -- Nombre: espacios de mas afuera; de 2 a 80 caracteres; solo letras (con
  -- tildes, enie, dieresis), espacios, apostrofo, guion y punto, y al menos
  -- dos letras. Las mismas reglas que nombreCliente() en la tienda.
  v_nombre := regexp_replace(btrim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
  if length(v_nombre) < 2 or length(v_nombre) > 80
     or v_nombre !~ '^[[:alpha:]][[:alpha:] ''’.-]*$'
     or length(regexp_replace(v_nombre, '[^[:alpha:]]', '', 'g')) < 2 then
    raise exception 'nombre_invalido';
  end if;

  -- Telefono: cualquier forma de escribirlo, llevada a 549 + 10 cifras.
  v_tel := public.telefono_ar(p_telefono);
  if v_tel is null then
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

-- Los permisos de crear_pedido_web no cambian (create or replace los
-- conserva): anon y authenticated la pueden ejecutar, como antes.

update public.customers c
   set telefono = public.telefono_ar(c.telefono)
 where public.telefono_ar(c.telefono) is not null
   and public.telefono_ar(c.telefono) <> c.telefono
   and not exists (select 1 from public.customers o where o.telefono = public.telefono_ar(c.telefono));
