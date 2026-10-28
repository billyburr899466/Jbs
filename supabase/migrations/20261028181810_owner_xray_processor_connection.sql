create table public.xray_processor_connections (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  token_encrypted text not null check (char_length(token_encrypted) between 60 and 2000),
  connected_at timestamptz not null default now()
);
alter table public.xray_processor_connections enable row level security;
revoke all on public.xray_processor_connections from public, anon, authenticated;
grant select, insert, update on public.xray_processor_connections to service_role;
comment on table public.xray_processor_connections is 'Server-only owner WebODM credentials, encrypted with AES-256-GCM and bound to the owner ID. No browser access.';
