-- Cargar un ciclo nuevo desde el panel (Sebas, 27/10/2026).
--
-- El panel lee los PDF del ciclo, arma una propuesta (src/lib/ciclo/) y, con
-- el OK de Sebas, llama a aplicar_ciclo(). Esta funcion es la unica que
-- escribe, y vuelve a validar todo del lado del servidor: el navegador puede
-- equivocarse o ser manipulado, la base no.
--
-- Reglas (las mismas del CLAUDE.md, seccion 7):
--   * Solo entra la cuenta de Sebas (es_admin()).
--   * Antes de tocar nada, copia el catalogo entero en respaldo.copias.
--   * Todo o nada: si una operacion no pasa una validacion, no se aplica
--     ninguna (una funcion de Postgres corre en una sola transaccion).
--   * Nunca borra un codigo ni un perfume: lo que no esta en el ciclo se
--     desactiva (activo = false).
--   * Los codigos tienen 8 cifras: 1028... Bagues, 2028... Unlock.
--
-- No cambia la estructura de products: suma la clave "type" (el Type de la
-- caja de Bagues) dentro de cada presentacion, para detectar el ciclo que
-- viene si una caja cambio de perfume (paso con Doha en el ciclo 10).

-- 1. El registro de cada carga: que se leyo, que se propuso y que se aplico.
create table if not exists public.ciclo_cargas (
  id uuid primary key default gen_random_uuid(),
  creada_en timestamptz not null default now(),
  creada_por text not null default coalesce(auth.jwt() ->> 'email', ''),
  archivos jsonb not null default '[]'::jsonb,   -- nombre, linea, paginas de cada PDF
  lectura jsonb not null default '{}'::jsonb,    -- lo que se leyo, por linea
  propuesta jsonb not null default '{}'::jsonb,  -- resumen, alertas y bloqueos
  aplicada_en timestamptz,
  resultado jsonb
);
alter table public.ciclo_cargas enable row level security;
revoke all on public.ciclo_cargas from anon;
create policy ciclo_cargas_admin on public.ciclo_cargas
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
-- Guarda lo leido ya armado (unos 150 productos por carga), no el PDF: pesa
-- poco y queda como historial de cada ciclo.

-- 2. Una presentacion por codigo: devuelve el id del perfume que la tiene.
create or replace function public.ciclo_producto_de_codigo(p_codigo text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.products p
  where p.presentaciones @> jsonb_build_array(jsonb_build_object('codigo', p_codigo));
$$;
revoke execute on function public.ciclo_producto_de_codigo(text) from public, anon;

-- 3. Aplicar el ciclo.
--   p_carga        id de ciclo_cargas (puede ser null)
--   p_operaciones  [{ tipo: precio|activar|desactivar|caja|type, codigo, ... }]
--   p_nuevos       [{ codigo, linea, ml, precio, precio_anterior, nombre_proveedor,
--                     type, sumar_a (uuid) | aroma { nombre, inspirado_en, genero,
--                     familia_olfativa, nota_salida, nota_corazon, nota_fondo } }]
--   p_ciclo        { nombre, hasta (aaaa-mm-dd) } o null
create or replace function public.aplicar_ciclo(
  p_carga uuid,
  p_operaciones jsonb,
  p_nuevos jsonb default '[]'::jsonb,
  p_ciclo jsonb default null
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
  r jsonb := jsonb_build_object('precios', 0, 'activados', 0, 'desactivados', 0, 'cajas', 0, 'types', 0,
                                'nuevos', 0, 'aromas_nuevos', 0, 'aromas_apagados', 0, 'aromas_prendidos', 0);
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

  -- Respaldo completo antes de tocar nada.
  insert into respaldo.copias (tabla, filas, datos)
  select 'products (antes de cargar un ciclo)', count(*), coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from public.products p;

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

  if p_carga is not null then
    update public.ciclo_cargas set aplicada_en = now(), resultado = r where id = p_carga;
  end if;
  return r;
end;
$$;
revoke execute on function public.aplicar_ciclo(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.aplicar_ciclo(uuid, jsonb, jsonb, jsonb) to authenticated;

-- 4. La ayudante solo la usa aplicar_ciclo (que corre como duenia de la base):
-- nadie de afuera necesita llamarla (aviso del asesor de seguridad, 28/10).
revoke execute on function public.ciclo_producto_de_codigo(text) from authenticated;
