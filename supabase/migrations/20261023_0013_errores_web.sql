-- 0013: registro de errores de la tienda (23/10/2026, autorizado por Sebas)
--
-- Si a una clienta se le rompe algo en el telefono (un error de JavaScript, o
-- el pedido que no se pudo guardar), antes nadie se enteraba. Ahora la tienda
-- lo anota aca y Sebas lo ve en el panel, en Ajustes.
--
-- Seguridad:
--  - La tabla no se puede leer ni escribir desde la tienda (anon). La unica
--    puerta de escritura es registrar_error_web(), que recorta cada campo.
--  - Tope global: si en el ultimo minuto ya hay 30 errores, no se guarda mas
--    (un error en bucle o alguien insistiendo no llena la base).
--  - Se guardan los ultimos 30 dias; lo anterior se borra solo.
--  - No se anotan nombres ni telefonos: la tienda manda solo el mensaje
--    tecnico, la pagina y el navegador.
--  - Leer y borrar: solo el admin (es_admin()).

create table if not exists public.errores_web (
  id bigint generated always as identity primary key,
  creado timestamptz not null default now(),
  tipo text not null,
  mensaje text not null,
  donde text,
  ruta text,
  navegador text,
  version text
);

create index if not exists errores_web_creado_idx on public.errores_web (creado desc);

alter table public.errores_web enable row level security;

revoke all on public.errores_web from anon, authenticated;
grant select, delete on public.errores_web to authenticated;

drop policy if exists errores_web_admin_lee on public.errores_web;
create policy errores_web_admin_lee on public.errores_web
  for select to authenticated using (public.es_admin());

drop policy if exists errores_web_admin_borra on public.errores_web;
create policy errores_web_admin_borra on public.errores_web
  for delete to authenticated using (public.es_admin());

create or replace function public.registrar_error_web(p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if jsonb_typeof(p) is distinct from 'object' then
    return;
  end if;
  if (select count(*) from public.errores_web where creado > now() - interval '1 minute') >= 30 then
    return;
  end if;
  insert into public.errores_web (tipo, mensaje, donde, ruta, navegador, version)
  values (
    left(coalesce(nullif(p->>'tipo', ''), 'js'), 20),
    left(coalesce(nullif(p->>'mensaje', ''), '(sin mensaje)'), 500),
    left(p->>'donde', 300),
    left(p->>'ruta', 200),
    left(p->>'navegador', 200),
    left(p->>'version', 40)
  );
  perform public.limpiar_errores_web();
end;
$$;

-- La poda va en su propia funcion, que nadie de afuera puede llamar.
create or replace function public.limpiar_errores_web()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.errores_web where creado < now() - interval '30 days';
$$;
revoke execute on function public.limpiar_errores_web() from public, anon, authenticated;

revoke all on function public.registrar_error_web(jsonb) from public;
grant execute on function public.registrar_error_web(jsonb) to anon, authenticated;
