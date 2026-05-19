-- ─────────────────────────────────────────────────────────────────────────────
-- 17 — Atestados médicos de colaboradores
-- Tabela: atestados | Storage bucket: atestados
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tabela
create table if not exists public.atestados (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     text not null,
  funcionario_id bigint not null references public.funcionarios(id) on delete cascade,
  data_inicio   date not null,
  data_fim      date,
  dias          int generated always as (
                  coalesce(data_fim - data_inicio, 0) + 1
                ) stored,
  cid_codigo    text,
  cid_descricao text,
  foto_url      text,
  observacoes   text,
  criado_em     timestamptz not null default now(),
  criado_por    uuid references auth.users(id) on delete set null
);

-- 2. Índices
create index if not exists atestados_tenant_func_idx
  on public.atestados (tenant_id, funcionario_id, data_inicio desc);

-- 3. RLS
alter table public.atestados enable row level security;

-- Membros do tenant podem ver e criar (usa current_tenant() = JWT app_metadata.tenant_id)
create policy "atestados_select" on public.atestados
  for select using (tenant_id = current_tenant() or is_superadmin());

create policy "atestados_insert" on public.atestados
  for insert with check (tenant_id = current_tenant() or is_superadmin());

create policy "atestados_update" on public.atestados
  for update using (tenant_id = current_tenant() or is_superadmin());

create policy "atestados_delete" on public.atestados
  for delete using (tenant_id = current_tenant() or is_superadmin());

create policy "superadmin_bypass" on public.atestados
  using (is_superadmin()) with check (is_superadmin());

-- 4. Storage bucket para fotos dos atestados
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'atestados',
  'atestados',
  false,
  5242880,  -- 5 MB
  array['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
on conflict (id) do nothing;

-- Política de storage: apenas membros autenticados do tenant
create policy "atestados_storage_select" on storage.objects
  for select using (
    bucket_id = 'atestados'
    and auth.role() = 'authenticated'
  );

create policy "atestados_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'atestados'
    and auth.role() = 'authenticated'
  );

create policy "atestados_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'atestados'
    and auth.role() = 'authenticated'
  );
