-- ============================================================================
-- 0008 · WEBHOOK DE PEDIDO NUEVO → Edge Function notificar-pedido (WhatsApp)
-- Dispara en INSERT de orders con canal='web' y llama a la función vía pg_net.
--
-- El secreto compartido vive en Supabase Vault (supabase_vault), NUNCA como
-- texto plano acá — este repo es público. Antes de aplicar esta migración en
-- un ambiente nuevo, cargar el secreto una sola vez (no versionado):
--   select vault.create_secret('<valor-random>', 'webhook_pedido_secret',
--     'Secreto compartido entre avisar_pedido_web() y notificar-pedido');
-- Y configurar el mismo valor como secret WEBHOOK_SECRET de la Edge Function
-- (Dashboard → Edge Functions → notificar-pedido → Secrets).
--
-- NOTA: el linter de Supabase marca "pg_net en schema public" como WARN —
-- es una limitación conocida de la extensión (no soporta `SET SCHEMA`) y es
-- el patrón estándar en proyectos Supabase con pg_net. Se acepta.
-- ============================================================================

create extension if not exists pg_net;

create or replace function public.avisar_pedido_web()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
begin
  if new.canal = 'web' then
    select decrypted_secret into v_secret
    from vault.decrypted_secrets
    where name = 'webhook_pedido_secret'
    limit 1;

    perform net.http_post(
      url := 'https://wynownataftnompltsok.supabase.co/functions/v1/notificar-pedido',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', coalesce(v_secret, '')
      ),
      body := jsonb_build_object('order_id', new.id)
    );
  end if;
  return new;
end;
$$;

-- No es una RPC pública: solo la invoca el trigger.
revoke execute on function public.avisar_pedido_web() from anon, authenticated, public;

drop trigger if exists trg_avisar_pedido_web on public.orders;
create trigger trg_avisar_pedido_web
  after insert on public.orders
  for each row
  execute function public.avisar_pedido_web();
