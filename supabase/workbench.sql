create table if not exists public.workbench_assessments (
  id text primary key,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workbench_assessments_updated_idx on public.workbench_assessments(updated_at desc);
alter table public.workbench_assessments enable row level security;
-- The browser never receives the service-role key. The Vercel API owns persistence access.
-- Do not create public INSERT/UPDATE/SELECT policies for this anonymous endpoint.
