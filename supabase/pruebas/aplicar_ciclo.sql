-- Pruebas de aplicar_ciclo() (migracion 0015). Se corren en el editor SQL de
-- Supabase o por el conector. Cada bloque termina con RAISE EXCEPTION a
-- proposito: el mensaje trae el resultado y la excepcion deshace todo, asi que
-- no cambia nada real.

-- 1. Lo que tiene que hacer: precio, desactivar, Type, caja, perfume nuevo y ciclo.
do $$
declare r jsonb; v_p jsonb; v_k jsonb; v_n jsonb; v_s jsonb;
begin
  perform set_config('request.jwt.claims', '{"email":"sebixtar@gmail.com","role":"authenticated"}', true);
  r := public.aplicar_ciclo(null,
    '[{"tipo":"precio","codigo":"20282011","precio":35999,"precio_anterior":42599},
      {"tipo":"desactivar","codigo":"20281050"},
      {"tipo":"type","codigo":"10282038","type":"Sauvage"},
      {"tipo":"caja","codigo":"10282081","nombre_proveedor":"York Why not?"}]'::jsonb,
    '[{"codigo":"20289999","linea":"unlock","ml":100,"precio":31000,"precio_anterior":45000,"aroma":{"nombre":"Prueba Nueva","genero":"femenino"}}]'::jsonb,
    '{"nombre":"Ciclo 11/26","hasta":"2026-11-13"}'::jsonb);
  select e into v_p from public.products p, jsonb_array_elements(p.presentaciones) e where e->>'codigo'='20282011';
  select jsonb_build_object('pres', e, 'aroma_activo', p.activo) into v_k from public.products p, jsonb_array_elements(p.presentaciones) e where e->>'codigo'='20281050';
  select jsonb_build_object('slug', slug, 'activo', activo) into v_n from public.products where presentaciones @> '[{"codigo":"20289999"}]';
  select jsonb_build_object('nombre', ciclo_nombre, 'hasta', ciclo_hasta) into v_s from public.settings where id=1;
  raise exception 'PRUEBA (se deshace): resultado=% | sauvage=% | kenzo=% | nuevo=% | ciclo=%', r, v_p, v_k, v_n, v_s;
end $$;

-- 2. Lo que tiene que frenar (el mensaje dice "frena" en los siete casos).
do $$
declare casos text[] := array['sin cuenta', 'codigo raro', 'lista menor', 'codigo nuevo que ya existe', 'linea equivocada', 'precio absurdo', 'operacion inventada'];
  resultados text := ''; c text;
begin
  foreach c in array casos loop
    begin
      if c = 'sin cuenta' then
        perform set_config('request.jwt.claims', '{"email":"otro@gmail.com"}', true);
        perform public.aplicar_ciclo(null, '[]'::jsonb);
      else
        perform set_config('request.jwt.claims', '{"email":"sebixtar@gmail.com"}', true);
        if c = 'codigo raro' then perform public.aplicar_ciclo(null, '[{"tipo":"precio","codigo":"12345","precio":20000}]'::jsonb);
        elsif c = 'lista menor' then perform public.aplicar_ciclo(null, '[{"tipo":"precio","codigo":"20282011","precio":30000,"precio_anterior":20000}]'::jsonb);
        elsif c = 'codigo nuevo que ya existe' then perform public.aplicar_ciclo(null, '[]'::jsonb, '[{"codigo":"20282011","linea":"unlock","ml":100,"precio":30000,"aroma":{"nombre":"Repetido"}}]'::jsonb);
        elsif c = 'linea equivocada' then perform public.aplicar_ciclo(null, '[]'::jsonb, '[{"codigo":"10289999","linea":"unlock","ml":50,"precio":30000,"aroma":{"nombre":"Mal"}}]'::jsonb);
        elsif c = 'precio absurdo' then perform public.aplicar_ciclo(null, '[{"tipo":"precio","codigo":"20282011","precio":5}]'::jsonb);
        elsif c = 'operacion inventada' then perform public.aplicar_ciclo(null, '[{"tipo":"borrar","codigo":"20282011"}]'::jsonb);
        end if;
      end if;
      resultados := resultados || c || ': NO FRENO | ';
    exception when others then
      resultados := resultados || c || ': frena (' || sqlerrm || ') | ';
    end;
  end loop;
  raise exception 'PRUEBA (se deshace): %', resultados;
end $$;
