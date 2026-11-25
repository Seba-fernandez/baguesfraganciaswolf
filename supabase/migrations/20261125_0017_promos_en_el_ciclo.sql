-- Las promos 2x1 entran en el todo-o-nada del ciclo (Sebas, 25/11/2026).
--
-- Hasta ahora aplicarPromos() corria DESPUES de aplicar_ciclo(), desde el
-- navegador y en pasos sueltos (un update por perfume y otro a settings), sin
-- respaldo. Si fallaba a mitad quedaban perfumes con el grupo cambiado y otros
-- no. Ahora aplicar_ciclo() recibe dos parametros nuevos y hace todo en la
-- MISMA transaccion:
--   p_promos   el settings.promos_ciclo completo que queda (null = no tocarlo)
--   p_grupos   [{ codigo, grupo_promo }]: que presentacion pasa a que grupo
--              (grupo_promo null = sacarla de todo grupo)
--
-- Garantias:
--   * Todo o nada: una excepcion en cualquier punto deshace el ciclo entero.
--   * Respaldo: products se copia antes de tocar nada (como hasta hoy) y,
--     si se van a tocar los ajustes, settings tambien (respaldo.copias).
--   * Un codigo de p_grupos que no existe frena TODO con un mensaje claro.
--   * grupo_promo cambia solo ese campo de la presentacion; el codigo no se
--     toca, y al final se comprueba que no desaparecio ningun codigo.
--   * Sin borrados ni eliminar funciones: el conector no pide confirmacion.
--
-- Al sumar parametros nace una sobrecarga nueva (Postgres no reemplaza una
-- funcion de otra firma, y borrar la vieja pediria confirmacion). Para que no
-- haya llamadas ambiguas ("function is not unique"), la firma nueva NO tiene
-- valores por defecto: siempre se llama con los seis parametros (p_promos null
-- = no tocar las promos, p_grupos '[]' = no cambiar grupos). La firma de siempre
-- (4 parametros, con sus defaults) queda como envoltorio que llama a la nueva sin
-- promos, asi no se rompe nada de lo que ya la usa (incluido un panel viejo).
-- No hace falta ningun paso manual despues de aplicarla.

create or replace function public.aplicar_ciclo(
  p_carga uuid,
  p_operaciones jsonb,
  p_nuevos jsonb,
  p_ciclo jsonb,
  p_promos jsonb,
  p_grupos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  op jsonb;
  nv jsonb;
  v_codigo text;
  v_tipo text;
  v_id uuid;
  v_ids uuid[] := '{}';
  v_parche jsonb;
  v_precio integer;
  v_anterior integer;
  v_cuenta integer;
  v_slug text;
  v_base text;
  v_n integer;
  v_pres jsonb;
  v_genero text;
  g jsonb;
  v_grupo text;
  v_vistos text[] := '{}';
  v_antes text[];
  v_antes_prod text[];
  v_despues_prod text[];
  v_perdidos text;
  r jsonb := jsonb_build_object('precios', 0, 'activados', 0, 'desactivados', 0, 'cajas', 0, 'types', 0,
                                'nuevos', 0, 'aromas_nuevos', 0, 'aromas_apagados', 0, 'aromas_prendidos', 0,
                                'grupos', 0);
begin
  if not public.es_admin() then
    raise exception 'Solo la cuenta de la tienda puede cargar un ciclo';
  end if;
  if jsonb_typeof(p_operaciones) <> 'array' or jsonb_typeof(coalesce(p_nuevos, '[]'::jsonb)) <> 'array' then
    raise exception 'Formato de cambios invalido';
  end if;
  if jsonb_array_length(p_operaciones) + jsonb_array_length(coalesce(p_nuevos, '[]'::jsonb)) > 3000 then
    raise exception 'Demasiados cambios juntos (mas de 3000): revisa los PDF';
  end if;
  -- Las promos y los grupos se validan ANTES de copiar o tocar nada.
  if p_promos is not null and (jsonb_typeof(p_promos) <> 'array' or jsonb_array_length(p_promos) > 50) then
    raise exception 'Las promos del ciclo tienen que ser una lista de hasta 50 reglas';
  end if;
  if p_promos is not null and exists (select 1 from jsonb_array_elements(p_promos) x where jsonb_typeof(x) <> 'object') then
    raise exception 'Cada promo del ciclo tiene que ser un objeto con su grupo, titulo y precio';
  end if;
  if jsonb_typeof(coalesce(p_grupos, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_grupos, '[]'::jsonb)) > 3000 then
    raise exception 'Los grupos de promo tienen que ser una lista de hasta 3000 codigos';
  end if;

  -- Respaldo completo antes de tocar nada.
  insert into respaldo.copias (tabla, filas, datos)
  select 'products (antes de cargar un ciclo)', count(*), coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from public.products p;
  -- Si el ciclo va a tocar los ajustes (tira de fechas o promos), tambien se copian.
  if p_promos is not null or (p_ciclo is not null and jsonb_typeof(p_ciclo) = 'object') then
    insert into respaldo.copias (tabla, filas, datos)
    select 'settings (antes de cargar un ciclo)', count(*), coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from public.settings s;
  end if;
  -- Todos los codigos de hoy, para comprobar al final que no se perdio ninguno.
  select coalesce(array_agg(e ->> 'codigo' order by e ->> 'codigo'), '{}') into v_antes
    from public.products p, jsonb_array_elements(p.presentaciones) e;


  -- Operaciones sobre codigos que ya existen.
  for op in select * from jsonb_array_elements(p_operaciones) loop
    v_tipo := op ->> 'tipo';
    v_codigo := op ->> 'codigo';
    if v_codigo is null or v_codigo !~ '^(1028|2028)[0-9]{4}$' then
      raise exception 'Codigo invalido: %', coalesce(v_codigo, '(vacio)');
    end if;
    select count(*) into v_cuenta from public.products p
      where p.presentaciones @> jsonb_build_array(jsonb_build_object('codigo', v_codigo));
    if v_cuenta <> 1 then
      raise exception 'El codigo % aparece en % perfumes (tiene que ser uno)', v_codigo, v_cuenta;
    end if;
    v_id := public.ciclo_producto_de_codigo(v_codigo);

    if v_tipo = 'precio' then
      v_precio := (op ->> 'precio')::integer;
      v_anterior := nullif(op ->> 'precio_anterior', '')::integer;
      if v_precio is null or v_precio < 1000 or v_precio > 500000 then
        raise exception 'Precio fuera de rango para %: %', v_codigo, op ->> 'precio';
      end if;
      if v_anterior is not null and v_anterior < v_precio then
        raise exception 'El precio de lista de % es menor que el del ciclo', v_codigo;
      end if;
      v_parche := jsonb_build_object('precio', v_precio, 'precio_anterior', to_jsonb(v_anterior));
      r := jsonb_set(r, '{precios}', to_jsonb((r ->> 'precios')::int + 1));
    elsif v_tipo = 'activar' then
      v_parche := '{"activo": true}'::jsonb;
      r := jsonb_set(r, '{activados}', to_jsonb((r ->> 'activados')::int + 1));
    elsif v_tipo = 'desactivar' then
      v_parche := '{"activo": false}'::jsonb;
      r := jsonb_set(r, '{desactivados}', to_jsonb((r ->> 'desactivados')::int + 1));
    elsif v_tipo = 'caja' then
      if v_codigo !~ '^1028' or length(trim(coalesce(op ->> 'nombre_proveedor', ''))) not between 1 and 60 then
        raise exception 'Nombre de caja invalido para %', v_codigo;
      end if;
      v_parche := jsonb_build_object('nombre_proveedor', trim(op ->> 'nombre_proveedor'));
      r := jsonb_set(r, '{cajas}', to_jsonb((r ->> 'cajas')::int + 1));
    elsif v_tipo = 'type' then
      if v_codigo !~ '^1028' or length(trim(coalesce(op ->> 'type', ''))) not between 1 and 80 then
        raise exception 'Type invalido para %', v_codigo;
      end if;
      v_parche := jsonb_build_object('type', trim(op ->> 'type'));
      r := jsonb_set(r, '{types}', to_jsonb((r ->> 'types')::int + 1));
    else
      raise exception 'Operacion desconocida: %', coalesce(v_tipo, '(vacia)');
    end if;

    update public.products p
       set presentaciones = (
         select jsonb_agg(case when e ->> 'codigo' = v_codigo then e || v_parche else e end order by ord)
         from jsonb_array_elements(p.presentaciones) with ordinality as t(e, ord)
       )
     where p.id = v_id;
    v_ids := array_append(v_ids, v_id);
  end loop;

  -- Codigos nuevos: se suman a un perfume que existe o crean uno.
  for nv in select * from jsonb_array_elements(coalesce(p_nuevos, '[]'::jsonb)) loop
    v_codigo := nv ->> 'codigo';
    if v_codigo is null or v_codigo !~ '^(1028|2028)[0-9]{4}$' then
      raise exception 'Codigo nuevo invalido: %', coalesce(v_codigo, '(vacio)');
    end if;
    if (nv ->> 'linea') is distinct from (case when v_codigo like '1028%' then 'bagues' else 'unlock' end) then
      raise exception 'El codigo % no corresponde a la linea %', v_codigo, nv ->> 'linea';
    end if;
    if public.ciclo_producto_de_codigo(v_codigo) is not null then
      raise exception 'El codigo % ya existe', v_codigo;
    end if;
    v_precio := (nv ->> 'precio')::integer;
    v_anterior := nullif(nv ->> 'precio_anterior', '')::integer;
    if v_precio is null or v_precio < 1000 or v_precio > 500000 or (v_anterior is not null and v_anterior < v_precio) then
      raise exception 'Precio invalido para el codigo nuevo %', v_codigo;
    end if;
    if (nv ->> 'ml')::integer is null or (nv ->> 'ml')::integer not between 5 and 500 then
      raise exception 'ml invalidos para el codigo nuevo %', v_codigo;
    end if;
    v_pres := jsonb_strip_nulls(jsonb_build_object(
      'ml', (nv ->> 'ml')::integer,
      'linea', nv ->> 'linea',
      'codigo', v_codigo,
      'precio', v_precio,
      'precio_anterior', to_jsonb(v_anterior),
      'nombre_proveedor', nullif(trim(coalesce(nv ->> 'nombre_proveedor', '')), ''),
      'type', nullif(trim(coalesce(nv ->> 'type', '')), ''),
      'grupo_promo', case when nv ->> 'linea' = 'bagues' then 'disenador' end,
      'activo', true
    )) || jsonb_build_object('precio_anterior', to_jsonb(v_anterior));

    if nv ? 'sumar_a' and nullif(nv ->> 'sumar_a', '') is not null then
      v_id := (nv ->> 'sumar_a')::uuid;
      update public.products set presentaciones = presentaciones || jsonb_build_array(v_pres) where id = v_id;
      if not found then
        raise exception 'El perfume al que se suma el codigo % no existe', v_codigo;
      end if;
    else
      if length(trim(coalesce(nv -> 'aroma' ->> 'nombre', ''))) not between 2 and 80 then
        raise exception 'Falta el nombre del perfume para el codigo nuevo %', v_codigo;
      end if;
      v_genero := coalesce(nullif(nv -> 'aroma' ->> 'genero', ''), 'unisex');
      if v_genero not in ('masculino', 'femenino', 'unisex') then
        raise exception 'Genero invalido para %', v_codigo;
      end if;
      v_base := (nv ->> 'linea') || '-' || trim(both '-' from regexp_replace(lower(
        translate(nv -> 'aroma' ->> 'nombre', 'áéíóúàèìòùäëïöüâêîôûñç', 'aeiouaeiouaeiouaeiounc')), '[^a-z0-9]+', '-', 'g'));
      v_slug := v_base;
      v_n := 1;
      while exists (select 1 from public.products where slug = v_slug) loop
        v_n := v_n + 1;
        v_slug := v_base || '-' || v_n;
      end loop;
      insert into public.products (slug, nombre, inspirado_en, linea, genero, familia_olfativa,
                                   nota_salida, nota_corazon, nota_fondo, presentaciones, activo, orden)
      values (v_slug, trim(nv -> 'aroma' ->> 'nombre'), trim(coalesce(nv -> 'aroma' ->> 'inspirado_en', nv -> 'aroma' ->> 'nombre')),
              nv ->> 'linea', v_genero::public.genero, coalesce(nv -> 'aroma' ->> 'familia_olfativa', ''),
              coalesce(nv -> 'aroma' ->> 'nota_salida', ''), coalesce(nv -> 'aroma' ->> 'nota_corazon', ''),
              coalesce(nv -> 'aroma' ->> 'nota_fondo', ''), jsonb_build_array(v_pres), true,
              coalesce((select max(orden) from public.products), 0) + 1)
      returning id into v_id;
      r := jsonb_set(r, '{aromas_nuevos}', to_jsonb((r ->> 'aromas_nuevos')::int + 1));
    end if;
    r := jsonb_set(r, '{nuevos}', to_jsonb((r ->> 'nuevos')::int + 1));
    v_ids := array_append(v_ids, v_id);
  end loop;

  -- Grupos de promo: cambia SOLO la clave grupo_promo de la presentacion de cada
  -- codigo pedido (el resto de la presentacion, y el codigo, quedan como estaban).
  -- Va despues de los codigos nuevos para poder agrupar tambien a los recien sumados.
  for g in select * from jsonb_array_elements(coalesce(p_grupos, '[]'::jsonb)) loop
    if jsonb_typeof(g) <> 'object' then
      raise exception 'Cada grupo de promo tiene que ser un objeto con codigo y grupo_promo';
    end if;
    v_codigo := g ->> 'codigo';
    if v_codigo is null or v_codigo !~ '^(1028|2028)[0-9]{4}$' then
      raise exception 'Codigo invalido en los grupos de promo: %', coalesce(v_codigo, '(vacio)');
    end if;
    if v_codigo = any (v_vistos) then
      raise exception 'El codigo % esta repetido en los grupos de promo', v_codigo;
    end if;
    v_vistos := array_append(v_vistos, v_codigo);
    if not (g ? 'grupo_promo') then
      raise exception 'Falta el grupo_promo del codigo %', v_codigo;
    end if;
    if jsonb_typeof(g -> 'grupo_promo') = 'null' then
      v_grupo := null;
    elsif jsonb_typeof(g -> 'grupo_promo') = 'string' and length(trim(g ->> 'grupo_promo')) between 1 and 40 then
      v_grupo := trim(g ->> 'grupo_promo');
    else
      raise exception 'Grupo de promo invalido para el codigo %', v_codigo;
    end if;
    select count(*) into v_cuenta from public.products p
      where p.presentaciones @> jsonb_build_array(jsonb_build_object('codigo', v_codigo));
    if v_cuenta = 0 then
      raise exception 'El codigo % de los grupos de promo no existe en ningun perfume: no se aplico nada', v_codigo;
    elsif v_cuenta > 1 then
      raise exception 'El codigo % aparece en % perfumes (tiene que ser uno)', v_codigo, v_cuenta;
    end if;
    v_id := public.ciclo_producto_de_codigo(v_codigo);
    select array_agg(e ->> 'codigo' order by ord) into v_antes_prod
      from public.products p, jsonb_array_elements(p.presentaciones) with ordinality as t(e, ord) where p.id = v_id;
    update public.products p
       set presentaciones = (
         select jsonb_agg(case when e ->> 'codigo' = v_codigo
                               then e || jsonb_build_object('grupo_promo', to_jsonb(v_grupo)) else e end order by ord)
         from jsonb_array_elements(p.presentaciones) with ordinality as t(e, ord)
       )
     where p.id = v_id;
    select array_agg(e ->> 'codigo' order by ord) into v_despues_prod
      from public.products p, jsonb_array_elements(p.presentaciones) with ordinality as t(e, ord) where p.id = v_id;
    if v_antes_prod is distinct from v_despues_prod then
      raise exception 'Se freno: cambiar el grupo de promo de % alteraba los codigos del perfume', v_codigo;
    end if;
    r := jsonb_set(r, '{grupos}', to_jsonb((r ->> 'grupos')::int + 1));
  end loop;

  -- Los perfumes tocados: sin ningun tamaño activo se apagan; con alguno, se prenden.
  with tocados as (
    select p.id, p.activo,
           exists (select 1 from jsonb_array_elements(p.presentaciones) e where coalesce((e ->> 'activo')::boolean, true)) as alguno
    from public.products p where p.id = any (v_ids)
  ), apagar as (
    update public.products p set activo = false from tocados t where p.id = t.id and t.activo and not t.alguno returning p.id
  )
  select count(*) into v_cuenta from apagar;
  r := jsonb_set(r, '{aromas_apagados}', to_jsonb(v_cuenta));
  with prender as (
    update public.products p set activo = true
    where p.id = any (v_ids) and not p.activo
      and exists (select 1 from jsonb_array_elements(p.presentaciones) e where coalesce((e ->> 'activo')::boolean, true))
      and exists (select 1 from jsonb_array_elements(p_operaciones) o
                  where o ->> 'tipo' = 'activar' and p.presentaciones @> jsonb_build_array(jsonb_build_object('codigo', o ->> 'codigo')))
    returning p.id
  )
  select count(*) into v_cuenta from prender;
  r := jsonb_set(r, '{aromas_prendidos}', to_jsonb(v_cuenta));

  -- El ciclo (la tira "Pedidos hasta..." de la tienda).
  if p_ciclo is not null and jsonb_typeof(p_ciclo) = 'object' then
    if nullif(p_ciclo ->> 'hasta', '') is not null and (p_ciclo ->> 'hasta') !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'Fecha de cierre del ciclo invalida';
    end if;
    update public.settings
       set ciclo_nombre = coalesce(nullif(left(trim(p_ciclo ->> 'nombre'), 40), ''), ciclo_nombre),
           ciclo_hasta = coalesce(nullif(p_ciclo ->> 'hasta', '')::date, ciclo_hasta)
     where id = 1;
    r := r || jsonb_build_object('ciclo', p_ciclo);
  end if;

  -- Las reglas de promo que quedan (settings.promos_ciclo), en la misma transaccion.
  if p_promos is not null then
    update public.settings set promos_ciclo = p_promos where id = 1;
    if not found then
      raise exception 'No se encontraron los ajustes de la tienda para guardar las promos';
    end if;
    r := r || jsonb_build_object('promos', jsonb_array_length(p_promos));
  end if;

  -- Candado final: ningun codigo que existia antes puede haber desaparecido.
  select string_agg(a, ', ') into v_perdidos from unnest(v_antes) a
    where not exists (select 1 from public.products p, jsonb_array_elements(p.presentaciones) e where e ->> 'codigo' = a);
  if v_perdidos is not null then
    raise exception 'Se freno: el ciclo hacia desaparecer codigos (%). No se aplico nada', v_perdidos;
  end if;

  if p_carga is not null then
    update public.ciclo_cargas set aplicada_en = now(), resultado = r where id = p_carga;
  end if;
  return r;
end;
$$;

revoke execute on function public.aplicar_ciclo(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.aplicar_ciclo(uuid, jsonb, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- La firma de siempre (4 parametros): misma puerta, sin promos.
create or replace function public.aplicar_ciclo(
  p_carga uuid,
  p_operaciones jsonb,
  p_nuevos jsonb default '[]'::jsonb,
  p_ciclo jsonb default null
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.aplicar_ciclo(p_carga, p_operaciones, p_nuevos, p_ciclo, null::jsonb, '[]'::jsonb);
$$;
revoke execute on function public.aplicar_ciclo(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.aplicar_ciclo(uuid, jsonb, jsonb, jsonb) to authenticated;
