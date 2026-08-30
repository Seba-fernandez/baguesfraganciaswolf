-- ============================================================================
-- 0005 · STORAGE — buckets de imágenes
-- `productos`  → fotos de frascos (900x1200 webp)
-- `promos`     → banners de hero / secciones
-- Lectura pública (las fotos se ven en la web). Escritura solo admin.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('productos', 'productos', true), ('promos', 'promos', true)
on conflict (id) do nothing;

-- Lectura pública
create policy "imagenes lectura publica"
  on storage.objects for select to anon, authenticated
  using (bucket_id in ('productos', 'promos'));

-- Alta / cambio / borrado: solo admin
create policy "imagenes escritura admin"
  on storage.objects for insert to authenticated
  with check (bucket_id in ('productos', 'promos') and public.es_admin());

create policy "imagenes update admin"
  on storage.objects for update to authenticated
  using (bucket_id in ('productos', 'promos') and public.es_admin());

create policy "imagenes delete admin"
  on storage.objects for delete to authenticated
  using (bucket_id in ('productos', 'promos') and public.es_admin());
