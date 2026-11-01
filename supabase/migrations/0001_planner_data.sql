-- Run this in the Supabase SQL editor (or `supabase db push`).
create table if not exists public.planner_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.planner_data enable row level security;

create policy "read own data" on public.planner_data
  for select using (auth.uid() = user_id);

create policy "insert own data" on public.planner_data
  for insert with check (auth.uid() = user_id);

create policy "update own data" on public.planner_data
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own data" on public.planner_data
  for delete using (auth.uid() = user_id);

-- Keep the server timestamp honest even if a client sends its own value.
create or replace function public.touch_planner_data()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists planner_data_touched on public.planner_data;
create trigger planner_data_touched
  before insert or update on public.planner_data
  for each row execute function public.touch_planner_data();

revoke all on public.planner_data from anon;
grant select, insert, update, delete on public.planner_data to authenticated;
