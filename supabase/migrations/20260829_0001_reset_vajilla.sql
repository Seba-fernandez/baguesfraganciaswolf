-- ============================================================================
-- 0001 · RESET VAJILLA
-- Elimina el esquema del CRM de alquiler de vajilla. Antes de aplicar esto se
-- exporta un backup de `contacts` a docs/backups/contacts_YYYYMMDD.csv.
-- ============================================================================

-- La tabla de contactos del CRM viejo. CASCADE limpia policies, triggers, FKs.
drop table if exists public.contacts cascade;

-- Si existían tablas auxiliares del CRM viejo, se agregan acá:
-- drop table if exists public.<tabla_vieja> cascade;
