-- Run once in Supabase SQL Editor if you already created `applications` without this column.

alter table public.applications
  add column if not exists interview_date date;

comment on column public.applications.interview_date is
  'Optional: interview, OA deadline, offer response date, etc. Shown on the in-app calendar.';
