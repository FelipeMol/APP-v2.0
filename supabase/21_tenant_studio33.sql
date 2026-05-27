-- ============================================================
-- MIGRACAO 21: Grupo Studio 33 + tenant studio33
-- Novo grupo independente (alem do Grupo MFK e da Construtora Ramdy Raydan)
-- Dominio: studio33arquitetura.com
-- Execute no Supabase Dashboard -> SQL Editor
-- ============================================================

-- ============================================================
-- 1. Criar grupo Studio 33
-- ============================================================
INSERT INTO grupos (nome, slug, dominio, logo_url, cor_primaria, cor_secundaria, cor_accent, nome_exibicao, subtitulo, rodape_texto, ativo)
VALUES (
  'Studio 33 Arquitetura',
  'studio33',
  'studio33arquitetura.com',
  '/logo.png',
  '#3b82f6',
  '#1e293b',
  '#f59e0b',
  'Studio 33',
  'Sistema de gestao',
  '',
  true
)
ON CONFLICT (dominio) DO UPDATE SET
  slug           = EXCLUDED.slug,
  nome           = EXCLUDED.nome,
  nome_exibicao  = EXCLUDED.nome_exibicao,
  cor_primaria   = EXCLUDED.cor_primaria,
  cor_secundaria = EXCLUDED.cor_secundaria,
  cor_accent     = EXCLUDED.cor_accent,
  subtitulo      = EXCLUDED.subtitulo,
  rodape_texto   = EXCLUDED.rodape_texto,
  atualizado_em  = NOW();

-- ============================================================
-- 2. Criar tenant Studio 33 vinculado ao novo grupo
-- ============================================================
INSERT INTO tenants (id, name, short_name, grupo_id, logo_url, cor_primaria, active)
VALUES (
  'studio33',
  'Studio 33 Arquitetura',
  'Studio 33',
  (SELECT id FROM grupos WHERE dominio = 'studio33arquitetura.com'),
  '/logo.png',
  '#3b82f6',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name          = EXCLUDED.name,
  short_name    = EXCLUDED.short_name,
  grupo_id      = EXCLUDED.grupo_id,
  atualizado_em = NOW();

-- ============================================================
-- 3. Habilitar todos os modulos para Studio 33
-- ============================================================
INSERT INTO tenant_modules (tenant_id, module_id, enabled)
VALUES
  ('studio33', 'dashboard',    true),
  ('studio33', 'lancamentos',  true),
  ('studio33', 'funcionarios', true),
  ('studio33', 'obras',        true),
  ('studio33', 'empresas',     true),
  ('studio33', 'tarefas',      true),
  ('studio33', 'relatorios',   true),
  ('studio33', 'rh',           true),
  ('studio33', 'financeiro',   true),
  ('studio33', 'base',         true)
ON CONFLICT (tenant_id, module_id) DO NOTHING;

-- ============================================================
-- FIM DA MIGRACAO
-- ============================================================
