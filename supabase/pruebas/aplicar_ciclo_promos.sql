-- Pruebas de aplicar_ciclo() con promos (migracion 0017). Se corren en el editor
-- SQL de Supabase o por el conector DESPUES de aplicar la 0017. Es un solo bloque
-- que termina con RAISE EXCEPTION a proposito: el mensaje trae el resultado y la
-- excepcion deshace todo, asi que no cambia nada real.
--
-- Los codigos se eligen de los datos de hoy (no hay codigos fijos), asi la
-- prueba sigue sirviendo cuando cambia el catalogo.
-- Resultado esperado: "PRUEBA (se deshace): TODO OK | ..."
do $$
declare
  fallas text := '';
  r jsonb;
  c1 text; c2 text; c3 text;   -- c1 y c2 cambian de grupo; c3 es testigo (no se pide)
  promos_antes jsonb;
  promos_nuevas jsonb := '[{"grupo":"disenador","titulo":"2x1 Prueba","detalle":"Detalle de prueba","precio_par":29999}]'::jsonb;
  codigos_antes text[]; codigos_despues text[];
  resto_antes text; resto_despues text;      -- todo menos grupo_promo, por presentacion
  testigos_antes text; testigos_despues text; -- (codigo, grupo_promo) de lo que NO se pidio
  n_prod_antes int; n_set_antes int; n_prod_despues int; n_set_despues int;
  estado1 text; estado2 text;
  msg text;
begin
  perform set_config('request.jwt.claims', '{"email":"sebixtar@gmail.com","role":"authenticated"}', true);

  select e ->> 'codigo' into c1 from public.products p, jsonb_array_elements(p.presentaciones) e
    where e ->> 'codigo' like '1028%' order by e ->> 'codigo' limit 1;
  select e ->> 'codigo' into c2 from public.products p, jsonb_array_elements(p.presentaciones) e
    where e ->> 'codigo' like '2028%' order by e ->> 'codigo' limit 1;
  select e ->> 'codigo' into c3 from public.products p, jsonb_array_elements(p.presentaciones) e
    where e ->> 'codigo' not in (c1, c2) order by e ->> 'codigo' desc limit 1;
  select promos_ciclo into promos_antes from public.settings where id = 1;

  -- Foto de "antes".
  select array_agg(e ->> 'codigo' order by e ->> 'codigo') into codigos_antes
    from public.products p, jsonb_array_elements(p.presentaciones) e;
  select md5(coalesce(jsonb_agg(jsonb_build_array(p.id, ord, e - 'grupo_promo') order by p.id, ord)::text, '')) into resto_antes
    from public.products p, jsonb_array_elements(p.presentaciones) with ordinality as t(e, ord);
  select md5(coalesce(jsonb_agg(jsonb_build_array(e ->> 'codigo', e -> 'grupo_promo') order by e ->> 'codigo')::text, '')) into testigos_antes
    from public.products p, jsonb_array_elements(p.presentaciones) e where e ->> 'codigo' not in (c1, c2);

  -- 1. Camino feliz: promos y grupos en la misma llamada.
  r := public.aplicar_ciclo(null, '[]'::jsonb, '[]'::jsonb, null, promos_nuevas,
         jsonb_build_array(jsonb_build_object('codigo', c1, 'grupo_promo', 'arabe'),
                           jsonb_build_object('codigo', c2, 'grupo_promo', 'disenador')));
  if (select promos_ciclo from public.settings where id = 1) is distinct from promos_nuevas then
    fallas := fallas || 'promos_ciclo no quedo escrito | ';
  end if;
  if (select count(*) from public.products p, jsonb_array_elements(p.presentaciones) e
        where (e ->> 'codigo' = c1 and e ->> 'grupo_promo' = 'arabe')
           or (e ->> 'codigo' = c2 and e ->> 'grupo_promo' = 'disenador')) <> 2 then
    fallas := fallas || 'los codigos pedidos no cambiaron de grupo | ';
  end if;
  select md5(coalesce(jsonb_agg(jsonb_build_array(e ->> 'codigo', e -> 'grupo_promo') order by e ->> 'codigo')::text, '')) into testigos_despues
    from public.products p, jsonb_array_elements(p.presentaciones) e where e ->> 'codigo' not in (c1, c2);
  if testigos_despues <> testigos_antes then fallas := fallas || 'cambio el grupo de un codigo que no se pidio | '; end if;
  select md5(coalesce(jsonb_agg(jsonb_build_array(p.id, ord, e - 'grupo_promo') order by p.id, ord)::text, '')) into resto_despues
    from public.products p, jsonb_array_elements(p.presentaciones) with ordinality as t(e, ord);
  if resto_despues <> resto_antes then fallas := fallas || 'cambio otra clave de alguna presentacion | '; end if;
  select array_agg(e ->> 'codigo' order by e ->> 'codigo') into codigos_despues
    from public.products p, jsonb_array_elements(p.presentaciones) e;
  if codigos_despues is distinct from codigos_antes then fallas := fallas || 'EL CONJUNTO DE CODIGOS CAMBIO | '; end if;
  if (select count(*) from respaldo.copias where tabla = 'settings (antes de cargar un ciclo)' and fecha >= now() - interval '1 minute') < 1
     or (select count(*) from respaldo.copias where tabla = 'products (antes de cargar un ciclo)' and fecha >= now() - interval '1 minute') < 1 then
    fallas := fallas || 'falta el respaldo de products o de settings | ';
  end if;
  if (r ->> 'grupos')::int <> 2 or (r ->> 'promos')::int <> 1 then fallas := fallas || 'el resultado no cuenta grupos y promos | '; end if;

  -- 2. Idempotente: la misma llamada otra vez deja el mismo estado.
  select md5(jsonb_agg(to_jsonb(p) - 'updated_at' order by p.id)::text) into estado1 from public.products p;
  perform public.aplicar_ciclo(null, '[]'::jsonb, '[]'::jsonb, null, promos_nuevas,
            jsonb_build_array(jsonb_build_object('codigo', c1, 'grupo_promo', 'arabe'),
                              jsonb_build_object('codigo', c2, 'grupo_promo', 'disenador')));
  select md5(jsonb_agg(to_jsonb(p) - 'updated_at' order by p.id)::text) into estado2 from public.products p;
  if estado1 <> estado2 then fallas := fallas || 'no es idempotente | '; end if;

  -- 3. Un codigo inexistente frena TODO: ni grupos, ni promos, ni respaldo.
  select count(*) into n_prod_antes from respaldo.copias where tabla = 'products (antes de cargar un ciclo)';
  select count(*) into n_set_antes from respaldo.copias where tabla = 'settings (antes de cargar un ciclo)';
  select md5(jsonb_agg(to_jsonb(p) - 'updated_at' order by p.id)::text) into estado1 from public.products p;
  begin
    perform public.aplicar_ciclo(null, '[]'::jsonb, '[]'::jsonb, null,
              '[{"grupo":"disenador","titulo":"NO DEBE QUEDAR","precio_par":1000}]'::jsonb,
              jsonb_build_array(jsonb_build_object('codigo', c3, 'grupo_promo', 'arabe'),
                                jsonb_build_object('codigo', '10289998', 'grupo_promo', 'arabe')));
    fallas := fallas || 'un codigo inexistente NO freno | ';
  exception when others then
    msg := sqlerrm;
    if msg not like '%no existe%' then fallas := fallas || 'el mensaje del codigo inexistente no es claro: ' || msg || ' | '; end if;
  end;
  select md5(jsonb_agg(to_jsonb(p) - 'updated_at' order by p.id)::text) into estado2 from public.products p;
  if estado1 <> estado2 then fallas := fallas || 'tras el fallo cambio products | '; end if;
  if (select promos_ciclo from public.settings where id = 1) is distinct from promos_nuevas then
    fallas := fallas || 'tras el fallo cambio promos_ciclo | ';
  end if;
  select count(*) into n_prod_despues from respaldo.copias where tabla = 'products (antes de cargar un ciclo)';
  select count(*) into n_set_despues from respaldo.copias where tabla = 'settings (antes de cargar un ciclo)';
  if n_prod_despues <> n_prod_antes or n_set_despues <> n_set_antes then
    fallas := fallas || 'tras el fallo quedo un respaldo a medias | ';
  end if;

  -- 4. Otros casos que tienen que frenar.
  declare
    casos text[] := array['codigo mal formado', 'codigo repetido', 'grupo vacio', 'grupo sin clave', 'promos no es lista', 'sin cuenta'];
    c text;
  begin
    foreach c in array casos loop
      begin
        perform set_config('request.jwt.claims', case when c = 'sin cuenta' then '{"email":"otro@gmail.com"}' else '{"email":"sebixtar@gmail.com"}' end, true);
        if c = 'codigo mal formado' then perform public.aplicar_ciclo(null, '[]'::jsonb, '[]'::jsonb, null, null, '[{"codigo":"123","grupo_promo":"arabe"}]'::jsonb);
        elsif c = 'codigo repetido' then perform public.aplicar_ciclo(null, '[]'::jsonb, '[]'::jsonb, null, null,
          jsonb_build_array(jsonb_build_object('codigo', c1, 'grupo_promo', 'arabe'), jsonb_build_object('codigo', c1, 'grupo_promo', 'disenador')));
        elsif c = 'grupo vacio' then perform public.aplicar_ciclo(null, '[]'::jsonb, '[]'::jsonb, null, null, jsonb_build_array(jsonb_build_object('codigo', c1, 'grupo_promo', '')));
        elsif c = 'grupo sin clave' then perform public.aplicar_ciclo(null, '[]'::jsonb, '[]'::jsonb, null, null, jsonb_build_array(jsonb_build_object('codigo', c1)));
        elsif c = 'promos no es lista' then perform public.aplicar_ciclo(null, '[]'::jsonb, '[]'::jsonb, null, '{"a":1}'::jsonb, '[]'::jsonb);
        else perform public.aplicar_ciclo(null, '[]'::jsonb, '[]'::jsonb, null, promos_nuevas, '[]'::jsonb);
        end if;
        fallas := fallas || c || ': NO FRENO | ';
      exception when others then null;
      end;
    end loop;
    perform set_config('request.jwt.claims', '{"email":"sebixtar@gmail.com","role":"authenticated"}', true);
  end;

  -- 5. La firma de 4 parametros sigue andando (y no es ambigua).
  begin
    perform public.aplicar_ciclo(null, '[]'::jsonb);
    perform public.aplicar_ciclo(null, '[]'::jsonb, '[]'::jsonb, null);
    perform public.aplicar_ciclo(p_carga => null, p_operaciones => '[]'::jsonb, p_nuevos => '[]'::jsonb, p_ciclo => null);
  exception when others then
    fallas := fallas || 'la llamada de 4 parametros fallo: ' || sqlerrm || ' | ';
  end;

  raise exception 'PRUEBA (se deshace): % | c1=% c2=% c3=% | codigos antes=% despues=% | promos_antes=%',
    case when fallas = '' then 'TODO OK' else 'FALLAS: ' || fallas end, c1, c2, c3,
    cardinality(codigos_antes), cardinality(codigos_despues), promos_antes;
end $$;
