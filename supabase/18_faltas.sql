-- ─────────────────────────────────────────────────────────────────────────────
-- 18 — Faltas de colaboradores
-- Tabela: faltas
-- Espelha o padrão de atestados (RLS por tenant)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.faltas (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      text not null,
  funcionario_id bigint not null references public.funcionarios(id) on delete cascade,
  data_inicio    date not null,
  data_fim       date,
  dias           int generated always as (
                   coalesce(data_fim - data_inicio, 0) + 1
                 ) stored,
  motivo         text,           -- ex: 'injustificada', 'justificada', 'pessoal', 'transporte'
  abonada        boolean not null default false,
  justificativa  text,
  observacoes    text,
  criado_em      timestamptz not null default now(),
  criado_por     uuid references auth.users(id) on delete set null
);

create index if not exists faltas_tenant_func_idx
  on public.faltas (tenant_id, funcionario_id, data_inicio desc);

create index if not exists faltas_tenant_data_idx
  on public.faltas (tenant_id, data_inicio desc);

alter table public.faltas enable row level security;

create policy "faltas_select" on public.faltas
  for select using (tenant_id = current_tenant() or is_superadmin());

create policy "faltas_insert" on public.faltas
  for insert with check (tenant_id = current_tenant() or is_superadmin());

create policy "faltas_update" on public.faltas
  for update using (tenant_id = current_tenant() or is_superadmin());

create policy "faltas_delete" on public.faltas
  for delete using (tenant_id = current_tenant() or is_superadmin());

create policy "faltas_superadmin_bypass" on public.faltas
  using (is_superadmin()) with check (is_superadmin());
