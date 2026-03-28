-- Run this in Supabase: SQL Editor → New query → Run
-- https://supabase.com/dashboard/project/_/sql

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null,
  role text not null,
  status text not null,
  date_applied date not null,
  importance text not null default 'MEDIUM',
  cover_letter text not null default '',
  resume text not null default '',
  applied_via text not null default '',
  referrals text not null default '',
  interview_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user_id_idx on public.applications (user_id);
create index if not exists applications_date_applied_idx on public.applications (date_applied desc);

alter table public.applications enable row level security;

create policy "applications_select_own"
  on public.applications for select
  using (auth.uid() = user_id);

create policy "applications_insert_own"
  on public.applications for insert
  with check (auth.uid() = user_id);

create policy "applications_update_own"
  on public.applications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "applications_delete_own"
  on public.applications for delete
  using (auth.uid() = user_id);
