-- ============================================================================
-- 0007 · settings.link_catalogo + datos de redes reales
-- ============================================================================

alter table public.settings add column if not exists link_catalogo text default '';

update public.settings set
  instagram_user = 'bagueswolf',
  link_catalogo = 'https://linktr.ee/CosmeticosBagues'
where id = 1;
