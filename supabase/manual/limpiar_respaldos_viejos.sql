-- Para correr a mano (Supabase > SQL Editor), cuando Sebas quiera.
--
-- Borra las copias viejas que quedaron de cargas de ciclo anteriores. El
-- conector que uso Claude pide confirmacion para borrar tablas y no se pudo
-- hacer solo. Antes de borrarlas ya hay una copia completa nueva en
-- respaldo.copias (23/10/2026) y la copia semanal corre todos los lunes.
--
-- Las del 22/10 (pre_b9) se dejan: son de esta semana.

drop table if exists respaldo.products_c09_20260923;
drop table if exists respaldo.settings_c09_20260923;
drop table if exists respaldo.products_20261001_pre_c10;
