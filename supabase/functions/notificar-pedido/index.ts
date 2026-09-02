// ============================================================================
// notificar-pedido — avisa por WhatsApp (CallMeBot) cuando entra un pedido
// nuevo desde la web. Se invoca desde un trigger de Postgres (pg_net) en
// INSERT de public.orders, ver supabase/migrations/20260901_0007_webhook_pedido.sql
//
// Seguridad: la función es pública (verify_jwt=false) porque la llama un
// trigger de la base, no un usuario logueado. Se autentica con un secreto
// compartido en el header x-webhook-secret (no con JWT).
//
// Secrets necesarios (Dashboard → Project Settings → Edge Functions → Secrets):
//   WEBHOOK_SECRET     → el mismo valor que quedó en el trigger SQL
//   CALLMEBOT_PHONE    → tu WhatsApp con código de país, sin "+" (ej 5493511234567)
//   CALLMEBOT_APIKEY   → el que te manda el bot de CallMeBot al activarlo
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya vienen inyectados por Supabase.
// ============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const money = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);

Deno.serve(async (req) => {
  try {
    const expected = Deno.env.get('WEBHOOK_SECRET');
    const got = req.headers.get('x-webhook-secret');
    if (!expected || got !== expected) {
      return new Response('unauthorized', { status: 401 });
    }

    const { order_id } = await req.json();
    if (!order_id) return new Response('falta order_id', { status: 400 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: order, error } = await supabase
      .from('orders')
      .select('numero, total_estimado, canal, customer:customers(nombre, telefono), items:order_items(nombre_snapshot, ml, cantidad)')
      .eq('id', order_id)
      .single();

    if (error || !order) {
      console.error('pedido no encontrado', error);
      return new Response('pedido no encontrado', { status: 404 });
    }

    const cliente = Array.isArray(order.customer) ? order.customer[0] : order.customer;
    const items = order.items || [];
    const detalle = items
      .map((it: { nombre_snapshot: string; ml: number | null; cantidad: number }) =>
        `• ${it.nombre_snapshot}${it.ml ? ` ${it.ml}ml` : ''} x${it.cantidad}`)
      .join('\n');

    const texto = [
      `🆕 Pedido #${order.numero} — Bagues Grupo Wolf`,
      `${cliente?.nombre || 'Sin nombre'} · wa.me/${cliente?.telefono || ''}`,
      '',
      detalle,
      '',
      `Total estimado: ${money(order.total_estimado)}`,
    ].join('\n');

    const phone = Deno.env.get('CALLMEBOT_PHONE');
    const apikey = Deno.env.get('CALLMEBOT_APIKEY');
    if (!phone || !apikey) {
      console.error('faltan secrets de CallMeBot (CALLMEBOT_PHONE / CALLMEBOT_APIKEY)');
      return new Response('faltan credenciales de whatsapp', { status: 500 });
    }

    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(apikey)}`;
    const res = await fetch(url);
    const body = await res.text();

    if (!res.ok) {
      console.error('CallMeBot respondió con error', res.status, body);
      return new Response('error enviando whatsapp', { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true, callmebot: body }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('notificar-pedido error', err);
    return new Response('error interno', { status: 500 });
  }
});
