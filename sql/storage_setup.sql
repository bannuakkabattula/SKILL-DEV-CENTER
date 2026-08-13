-- ============================================================================
-- STORAGE BUCKETS
-- Run in Supabase SQL Editor. Creates buckets + policies for authenticated
-- read/write. Files stay private (public = false) — the app fetches them
-- with signed URLs.
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('center-documents','center-documents', false),
  ('center-images','center-images', false),
  ('employee-documents','employee-documents', false),
  ('student-documents','student-documents', false),
  ('training-documents','training-documents', false)
on conflict (id) do nothing;

do $$
declare
  b text;
begin
  for b in select unnest(array[
    'center-documents','center-images','employee-documents',
    'student-documents','training-documents'
  ])
  loop
    execute format(
      'create policy "auth_read_%1$s" on storage.objects for select using (bucket_id = %2$L and auth.role() = ''authenticated'');',
      replace(b,'-','_'), b
    );
    execute format(
      'create policy "auth_write_%1$s" on storage.objects for insert with check (bucket_id = %2$L and auth.role() = ''authenticated'');',
      replace(b,'-','_'), b
    );
    execute format(
      'create policy "auth_update_%1$s" on storage.objects for update using (bucket_id = %2$L and auth.role() = ''authenticated'');',
      replace(b,'-','_'), b
    );
    execute format(
      'create policy "auth_delete_%1$s" on storage.objects for delete using (bucket_id = %2$L and auth.role() = ''authenticated'');',
      replace(b,'-','_'), b
    );
  end loop;
end $$;
