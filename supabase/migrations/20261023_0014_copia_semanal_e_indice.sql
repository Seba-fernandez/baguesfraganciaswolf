-- 0014: copia semanal de la base y un indice que faltaba (23/10/2026,
-- autorizado por Sebas)
--
-- Copia semanal: el plan gratis de Supabase no guarda copias que se puedan
-- restaurar a un momento dado. Todos los lunes a las 9 UTC (6 de la mañana en
-- Argentina) pg_cron corre respaldo.copia_semanal(), que guarda cada tabla
-- entera como JSON en respaldo.copias (una fila por tabla y por semana). Se
-- conservan las ultimas cinco semanas. El esquema respaldo no esta expuesto
-- por la API: desde la tienda no se ve ni se toca.
--
-- No sale de Supabase a proposito: el repo es publico y una copia con
-- telefonos de clientas no puede terminar en GitHub. Protege de un borrado o
-- una carga mal hecha (lo comun); no de que se caiga Supabase entero.
--
-- Restaurar una tabla de una fecha (ejemplo, products):
--   select jsonb_populate_recordset(null::public.products, datos)
--   from respaldo.copias where tabla = 'products' order by fecha desc limit 1;
-- (devuelve las filas tal como estaban; despues se decide que reponer).

create table if not exists respaldo.copias (
  id bigint generated always as identity primary key,
  fecha timestamptz not null default now(),
  tabla text not null,
  filas integer not null,
  datos jsonb not null
);
alter table respaldo.copias enable row level security;
revoke all on respaldo.copias from anon, authenticated;

create or replace function respaldo.podar_copias()
returns void
language sql
security definer
set search_path = respaldo
as $$
  delete from respaldo.copias where fecha < now() - interval '36 days';
$$;
revoke execute on function respaldo.podar_copias() from public, anon, authenticated;

create or replace function respaldo.copia_semanal()
returns void
language plpgsql
security definer
set search_path = public, respaldo
as $$
declare
  t text;
  n integer;
  d jsonb;
begin
  foreach t in array array['products', 'settings', 'promos', 'customers', 'orders', 'order_items'] loop
    execute format('select count(*), coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x', t) into n, d;
    insert into respaldo.copias (tabla, filas, datos) values (t, n, d);
  end loop;
  perform respaldo.podar_copias();
end;
$$;
revoke execute on function respaldo.copia_semanal() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('copia-semanal', '0 9 * * 1', 'select respaldo.copia_semanal()');

-- El asesor de Supabase marcaba la clave foranea order_items.product_id sin
-- indice: al ver los pedidos de un perfume se recorria la tabla entera.
create index if not exists order_items_product_id_idx on public.order_items (product_id);
