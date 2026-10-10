-- AgriSense AI: profiles, prediction history, and private image storage
-- Apply in the Supabase SQL editor or with the CLI:
--   supabase db query --file supabase/migrations/20261009_profiles_prediction_history.sql
-- This script is additive. It does not drop tables or delete existing rows.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Keep profile rows in sync with new auth users without wiping existing data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- prediction_history
-- ---------------------------------------------------------------------------
create table if not exists public.prediction_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  predicted_class text not null,
  confidence numeric not null,
  probabilities jsonb not null default '{}'::jsonb,
  image_path text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint prediction_history_confidence_range check (confidence >= 0)
);

create index if not exists prediction_history_user_created_idx
  on public.prediction_history (user_id, created_at desc);

create index if not exists prediction_history_user_class_idx
  on public.prediction_history (user_id, predicted_class);

alter table public.prediction_history enable row level security;

drop policy if exists "history_select_own" on public.prediction_history;
create policy "history_select_own"
  on public.prediction_history
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "history_insert_own" on public.prediction_history;
create policy "history_insert_own"
  on public.prediction_history
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "history_delete_own" on public.prediction_history;
create policy "history_delete_own"
  on public.prediction_history
  for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "history_update_own" on public.prediction_history;
create policy "history_update_own"
  on public.prediction_history
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- private storage for uploaded leaf images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('prediction-images', 'prediction-images', false)
on conflict (id) do nothing;

drop policy if exists "prediction_images_select_own" on storage.objects;
create policy "prediction_images_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'prediction-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "prediction_images_insert_own" on storage.objects;
create policy "prediction_images_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'prediction-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "prediction_images_delete_own" on storage.objects;
create policy "prediction_images_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'prediction-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
