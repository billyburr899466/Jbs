create table public.xray_scans (
  id uuid primary key,
  owner_id uuid not null references auth.users(id),
  name text not null check (char_length(name) between 1 and 100),
  photos jsonb not null check (jsonb_typeof(photos) = 'array' and jsonb_array_length(photos) between 12 and 240),
  status text not null default 'uploading' check (status in ('uploading','sending','queued','running','completed','failed','canceled')),
  provider_task_id uuid,
  submitted boolean not null default false,
  provider_fingerprint text,
  forwarded integer not null default 0 check (forwarded >= 0 and forwarded <= 240),
  inflight integer,
  progress real not null default 0 check (progress >= 0 and progress <= 100),
  error text,
  model_path text,
  model_bytes bigint,
  lease_id uuid,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index xray_scans_owner_created on public.xray_scans(owner_id, created_at desc);
create unique index xray_one_active_scan on public.xray_scans(owner_id)
  where status in ('uploading','sending','queued','running');
alter table public.xray_scans enable row level security;
revoke all on public.xray_scans from anon, authenticated;
grant select on public.xray_scans to authenticated;
grant all on public.xray_scans to service_role;
create policy xray_owner_read on public.xray_scans for select to authenticated
  using ((select auth.uid()) = owner_id and lower((select auth.jwt())->>'email') in ('billyburr89@gmail.com','jeremiahgrider24@gmail.com'));
comment on table public.xray_scans is 'Owner-only photo reconstruction jobs; all mutations require the authenticated server API.';
