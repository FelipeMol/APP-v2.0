-- ============================================================
-- MIGRACAO 07: Grupo MFK (grupoempresarialmfk.com)
-- Empresas: Transformar e Voltuz
-- Execute no Supabase Dashboard -> SQL Editor
-- ============================================================

-- ============================================================
-- 1. Criar grupo MFK
-- ============================================================
INSERT INTO grupos (nome, slug, dominio, logo_url, cor_primaria, cor_secundaria, cor_accent, nome_exibicao, subtitulo, rodape_texto, ativo)
VALUES (
  'Grupo MFK',
  'grupo-mfk',
  'grupoempresarialmfk.com',
  '/logo.png',
  '#3b82f6',
  '#1e293b',
  '#f59e0b',
  'Grupo MFK',
  'Sistema de gestao',
  '',
  true
)
ON CONFLICT (dominio) DO UPDATE SET
  slug          = EXCLUDED.slug,
  nome          = EXCLUDED.nome,
  nome_exibicao = EXCLUDED.nome_exibicao,
  cor_primaria  = EXCLUDED.cor_primaria,
  cor_secundaria = EXCLUDED.cor_secundaria,
  cor_accent    = EXCLUDED.cor_accent,
  subtitulo     = EXCLUDED.subtitulo,
  rodape_texto  = EXCLUDED.rodape_texto,
  atualizado_em = NOW();

-- ============================================================
-- 2. Criar tenants: Transformar e Voltuz
-- ============================================================
INSERT INTO tenants (id, name, short_name, grupo_id, logo_url, cor_primaria, active)
VALUES (
  'transformar',
  'Transformar',
  'Transformar',
  (SELECT id FROM grupos WHERE dominio = 'grupoempresarialmfk.com'),
  '/logo.png',
  '#3b82f6',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  short_name  = EXCLUDED.short_name,
  grupo_id    = EXCLUDED.grupo_id,
  atualizado_em = NOW();

INSERT INTO tenants (id, name, short_name, grupo_id, logo_url, cor_primaria, active)
VALUES (
  'voltuz',
  'Voltuz',
  'Voltuz',
  (SELECT id FROM grupos WHERE dominio = 'grupoempresarialmfk.com'),
  '/logo.png',
  '#3b82f6',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  short_name  = EXCLUDED.short_name,
  grupo_id    = EXCLUDED.grupo_id,
  atualizado_em = NOW();

-- ============================================================
-- 3. Habilitar todos os modulos para Transformar
-- ============================================================
INSERT INTO tenant_modules (tenant_id, module_id, enabled)
VALUES
  ('transformar', 'dashboard', true),
  ('transformar', 'lancamentos', true),
  ('transformar', 'funcionarios', true),
  ('transformar', 'obras', true),
  ('transformar', 'empresas', true),
  ('transformar', 'tarefas', true),
  ('transformar', 'relatorios', true),
  ('transformar', 'rh', true),
  ('transformar', 'financeiro', true),
  ('transformar', 'base', true)
ON CONFLICT (tenant_id, module_id) DO NOTHING;

-- ============================================================
-- 4. Habilitar todos os modulos para Voltuz
-- ============================================================
INSERT INTO tenant_modules (tenant_id, module_id, enabled)
VALUES
  ('voltuz', 'dashboard', true),
  ('voltuz', 'lancamentos', true),
  ('voltuz', 'funcionarios', true),
  ('voltuz', 'obras', true),
  ('voltuz', 'empresas', true),
  ('voltuz', 'tarefas', true),
  ('voltuz', 'relatorios', true),
  ('voltuz', 'rh', true),
  ('voltuz', 'financeiro', true),
  ('voltuz', 'base', true)
ON CONFLICT (tenant_id, module_id) DO NOTHING;

-- ============================================================
-- FIM DA MIGRACAO
-- ============================================================