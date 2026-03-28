-- Storage for cover letter & resume PDFs. Run in Supabase → SQL Editor.
-- Or create bucket "application-docs" in Dashboard → Storage (mark Public), then run only the policies block.

insert into storage.buckets (id, name, public)
values ('application-docs', 'application-docs', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "application_docs_insert_own" on storage.objects;
drop policy if exists "application_docs_update_own" on storage.objects;
drop policy if exists "application_docs_delete_own" on storage.objects;

create policy "application_docs_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'application-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "application_docs_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'application-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'application-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "application_docs_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'application-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
