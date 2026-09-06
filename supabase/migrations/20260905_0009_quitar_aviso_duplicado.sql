-- Quita el aviso duplicado de pedido web.
--
-- Por que se va:
-- 1) Es redundante. La clienta toca "Confirmar pedido" y el mensaje sale de SU
--    WhatsApp, asi que a Sebastian le llega en la conversacion con ella, con su
--    numero y el hilo abierto. El aviso del bot llegaba en un hilo aparte y lo
--    obligaba a copiar el telefono para arrancar el chat a mano: agregaba
--    trabajo en vez de sacarlo.
-- 2) Ademas estaba roto. El trigger era AFTER INSERT ON orders, pero los
--    order_items y el total_estimado se escriben despues, dentro de
--    crear_pedido_web(). Cuando la Edge Function iba a leer el pedido, podia
--    encontrarlo sin items y en cero.
--
-- Que lo reemplaza: nada nuevo que mantener. El panel ya escucha la tabla
-- orders por Realtime (useOrders.js, canal 'orders-stream'), asi que el pedido
-- aparece solo. El valor real siempre fue que el pedido quede guardado, y eso
-- no lo tocamos.
--
-- Para revertir: la definicion original de avisar_pedido_web() esta en la
-- migracion 20260901_0008_webhook_pedido.sql.

drop trigger if exists trg_avisar_pedido_web on public.orders;
drop function if exists public.avisar_pedido_web();
