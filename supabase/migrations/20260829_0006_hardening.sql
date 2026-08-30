-- ============================================================================
-- 0006 · HARDENING — cierra los avisos del linter de Supabase
-- ============================================================================

-- search_path fijo en nuestras funciones (evita secuestro de search_path)
alter function public.touch_updated_at() set search_path = '';
alter function public.es_admin()        set search_path = '';

-- es_admin usa auth.jwt(): con search_path vacío hay que calificar el esquema.
create or replace function public.es_admin()
returns boolean language sql stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'email', '') in ('sebixtar@gmail.com');
$$;

-- rls_auto_enable es un event trigger de plataforma; no tiene sentido exponerlo
-- como RPC. Se le quita EXECUTE a los roles de la API.
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;

-- NOTA: el aviso sobre crear_pedido_web() ejecutable por anon es INTENCIONAL:
-- es el único punto de entrada del checkout público. La función valida nombre,
-- teléfono y cantidad de ítems, toma los precios de la DB (no del cliente) y solo
-- inserta. No se toca.
