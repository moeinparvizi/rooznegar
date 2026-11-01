-- Local proof that 0001_planner_data.sql isolates each notebook.
--
--   createdb rz_rls_test
--   psql -d postgres -qc "create role anon nologin" \
--                      -qc "create role authenticated nologin" \
--                      -qc "create role service_role nologin bypassrls"
--   psql -d rz_rls_test -v ON_ERROR_STOP=1 -f supabase/tests/rls-local.sql
--   dropdb rz_rls_test
--
-- Run it from the repository root. Every check prints OK or FAIL.
\set ON_ERROR_STOP on

-- Supabase-shaped stubs so the real migration file can be applied verbatim.
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid
  language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

\i supabase/migrations/0001_planner_data.sql

-- Supabase grants service_role through project-wide default privileges; the
-- stub has to do the same before it can act as the admin role.
grant all on public.planner_data to service_role;

insert into auth.users (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

-- Seed two rows as the owner-bypassing role.
set role service_role;
insert into public.planner_data (user_id, data) values
  ('11111111-1111-1111-1111-111111111111', '{"days":1}'),
  ('22222222-2222-2222-2222-222222222222', '{"days":9}');
reset role;

-- ===== user A =====
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

do $$
declare n int;
begin
  select count(*) into n from public.planner_data;
  if n = 1 then raise notice 'OK  select: user A sees only its own row';
  else raise notice 'FAIL select: user A saw % rows', n; end if;
end $$;

do $$
begin
  update public.planner_data set data = '{"days":2}'
    where user_id = '11111111-1111-1111-1111-111111111111';
  if found then raise notice 'OK  update own row';
  else raise notice 'FAIL update own row'; end if;
exception when others then raise notice 'FAIL update own row: %', sqlerrm; end
$$;

-- RLS hides other users' rows, so a cross-user UPDATE/DELETE affects zero
-- rows instead of raising. Assert that, then let user B confirm its data.
do $$
declare u int; d int;
begin
  update public.planner_data set data = '{"days":0}'
    where user_id = '22222222-2222-2222-2222-222222222222';
  get diagnostics u = row_count;
  delete from public.planner_data
    where user_id = '22222222-2222-2222-2222-222222222222';
  get diagnostics d = row_count;
  if u = 0 and d = 0 then raise notice 'OK  cross-user update/delete touched no rows';
  else raise notice 'FAIL cross-user write: % updated, % deleted', u, d; end if;
end $$;

do $$
begin
  insert into public.planner_data (user_id, data)
    values ('22222222-2222-2222-2222-222222222222', '{"days":0}');
  raise notice 'FAIL insert cross-user row was accepted';
exception when insufficient_privilege then raise notice 'OK  insert cross-user row blocked';
end $$;

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$
declare payload jsonb;
begin
  select data into payload from public.planner_data
    where user_id = '22222222-2222-2222-2222-222222222222';
  if payload = '{"days":9}' then raise notice 'OK  user B data intact after user A writes';
  else raise notice 'FAIL user B data: %', payload; end if;
end $$;

-- The trigger must stamp the server clock, not the client value.
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$
declare ts timestamptz;
begin
  insert into public.planner_data (user_id, data, updated_at)
    values ('11111111-1111-1111-1111-111111111111', '{"days":1}', '2000-01-01T00:00:00Z')
    on conflict (user_id) do update set data = excluded.data, updated_at = '2000-01-01T00:00:00Z';
  select updated_at into ts from public.planner_data
    where user_id = '11111111-1111-1111-1111-111111111111';
  if ts > now() - interval '1 minute' then raise notice 'OK  trigger keeps updated_at on server time';
  else raise notice 'FAIL trigger left updated_at at %', ts; end if;
end $$;

-- Cascade delete from auth.users must remove the planner row.
reset role;
delete from auth.users where id = '11111111-1111-1111-1111-111111111111';
do $$
declare n int;
begin
  select count(*) into n from public.planner_data
    where user_id = '11111111-1111-1111-1111-111111111111';
  if n = 0 then raise notice 'OK  deleting the account deletes the notebook';
  else raise notice 'FAIL cascade delete left % rows', n; end if;
end $$;

-- ===== anonymous =====
reset role;
set role anon;
do $$
begin
  perform count(*) from public.planner_data;
  raise notice 'FAIL anon can read planner_data';
exception when insufficient_privilege then raise notice 'OK  anon has no access';
end $$;
reset role;

select relrowsecurity as rls_enabled from pg_class where oid = 'public.planner_data'::regclass;
select count(*) as policies from pg_policies where tablename = 'planner_data';
