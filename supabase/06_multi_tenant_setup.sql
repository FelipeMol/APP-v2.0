-- ============================================================
-- MIGRACAO 06: Multi-tenant com dominios unicos
-- Execute no Supabase Dashboard -> SQL Editor
-- ============================================================

-- ============================================================
-- TABELA: grupos (pode ja existir com schema parcial)
-- ============================================================
CREATE TABLE IF NOT EXISTS grupos (
  id             BIGSERIAL PRIMARY KEY,
  nome           VARCHAR(255) NOT NULL,
  slug           VARCHAR(100) UNIQUE,
  dominio        VARCHAR(255),
  logo_url       VARCHAR(500),
  cor_primaria   VARCHAR(7) DEFAULT '#3b82f6',
  cor_secundaria VARCHAR(7) DEFAULT '#1e293b',
  cor_accent     VARCHAR(7) DEFAULT '#f59e0b',
  favicon_url    VARCHAR(500),
  nome_exibicao  VARCHAR(255),
  subtitulo      VARCHAR(255) DEFAULT 'Sistema de gestao',
  rodape_texto   VARCHAR(255) DEFAULT '',
  ativo          BOOLEAN NOT NULL DEFAULT true,
  criado_em      TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas que possam faltar (idempotente)
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS slug           VARCHAR(100);
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS cor_primaria   VARCHAR(7) DEFAULT '#3b82f6';
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS cor_secundaria VARCHAR(7) DEFAULT '#1e293b';
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS cor_accent     VARCHAR(7) DEFAULT '#f59e0b';
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS favicon_url    VARCHAR(500);
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS nome_exibicao  VARCHAR(255);
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS subtitulo      VARCHAR(255) DEFAULT 'Sistema de gestao';
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS rodape_texto   VARCHAR(255) DEFAULT '';
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS criado_em      TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS atualizado_em  TIMESTAMPTZ DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_grupos_slug    ON grupos(slug);
CREATE INDEX  IF NOT EXISTS idx_grupos_dominio ON grupos(dominio);
CREATE INDEX  IF NOT EXISTS idx_grupos_ativo   ON grupos(ativo);

-- Trigger: usa trigger_set_updated_at() que seta atualizado_em (NAO o alias que seta updated_at)
DROP TRIGGER IF EXISTS trg_grupos_updated_at ON grupos;
CREATE TRIGGER trg_grupos_updated_at
  BEFORE UPDATE ON grupos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TABELA: tenants (pode ja existir com schema parcial)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id             VARCHAR(50) PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  short_name     VARCHAR(100),
  grupo_id       BIGINT REFERENCES grupos(id) ON DELETE SET NULL,
  logo_url       VARCHAR(500),
  cor_primaria   VARCHAR(7),
  dominio_custom VARCHAR(255),
  active         BOOLEAN NOT NULL DEFAULT true,
  criado_em      TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS short_name     VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS grupo_id       BIGINT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url       VARCHAR(500);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS cor_primaria   VARCHAR(7);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS dominio_custom VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS criado_em      TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS atualizado_em  TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenants_grupo_id_fkey' AND table_name = 'tenants'
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_grupo_id_fkey
      FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenants_grupo_id ON tenants(grupo_id);
CREATE INDEX IF NOT EXISTS idx_tenants_active   ON tenants(active);
CREATE INDEX IF NOT EXISTS idx_tenants_dominio  ON tenants(dominio_custom);

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;
CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TABELA: tenant_modules (tabela nova)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenant_modules (
  id         BIGSERIAL PRIMARY KEY,
  tenant_id  VARCHAR(50) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_id  VARCHAR(50) NOT NULL,
  enabled    BOOLEAN NOT NULL DEFAULT true,
  criado_em  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_tm_tenant  ON tenant_modules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tm_module  ON tenant_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_tm_enabled ON tenant_modules(enabled);

-- ============================================================
-- RPC: resolver grupo + tenants pelo hostname
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_domain(p_hostname TEXT)
RETURNS JSONB AS $$
DECLARE
  v_grupo   RECORD;
  v_tenants JSONB;
BEGIN
  SELECT id, nome, slug, dominio, logo_url, cor_primaria, cor_secundaria, cor_accent,
         favicon_url, nome_exibicao, subtitulo, rodape_texto
  INTO v_grupo
  FROM grupos
  WHERE dominio = p_hostname
    AND ativo = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'short_name', t.short_name,
    'grupo_id', t.grupo_id,
    'logo_url', t.logo_url,
    'cor_primaria', t.cor_primaria,
    'dominio_custom', t.dominio_custom,
    'active', t.active
  ) ORDER BY t.name)
  INTO v_tenants
  FROM tenants t
  WHERE t.grupo_id = v_grupo.id AND t.active = true;

  RETURN jsonb_build_object(
    'found', true,
    'grupo', jsonb_build_object(
      'id', v_grupo.id,
      'nome', v_grupo.nome,
      'slug', v_grupo.slug,
      'dominio', v_grupo.dominio,
      'logo_url', v_grupo.logo_url,
      'cor_primaria', v_grupo.cor_primaria,
      'cor_secundaria', v_grupo.cor_secundaria,
      'cor_accent', v_grupo.cor_accent,
      'favicon_url', v_grupo.favicon_url,
      'nome_exibicao', v_grupo.nome_exibicao,
      'subtitulo', v_grupo.subtitulo,
      'rodape_texto', v_grupo.rodape_texto
    ),
    'tenants', COALESCE(v_tenants, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION resolve_domain(TEXT) TO service_role, anon, authenticated;

-- ============================================================
-- DADOS INICIAIS: Construtora RR
-- ============================================================
INSERT INTO grupos (nome, slug, dominio, logo_url, cor_primaria, cor_secundaria, cor_accent, nome_exibicao, subtitulo, rodape_texto, ativo)
VALUES ('Construtora RR', 'construtora-rr', 'construtorarr.online', '/logo.png', '#3b82f6', '#1e293b', '#f59e0b', 'Ramdy Raydan', 'Sistema de gestao', '', true)
ON CONFLICT (dominio) DO UPDATE SET
  slug = EXCLUDED.slug,
  nome_exibicao = EXCLUDED.nome_exibicao,
  cor_primaria = EXCLUDED.cor_primaria,
  cor_secundaria = EXCLUDED.cor_secundaria,
  cor_accent = EXCLUDED.cor_accent,
  subtitulo = EXCLUDED.subtitulo,
  rodape_texto = EXCLUDED.rodape_texto,
  atualizado_em = NOW();

-- Atualizar slug no registro existente caso esteja NULL
UPDATE grupos SET slug = 'construtora-rr' WHERE dominio = 'construtorarr.online' AND slug IS NULL;

INSERT INTO tenants (id, name, short_name, grupo_id, logo_url, cor_primaria, active)
VALUES ('construtora', 'Construtora RR', 'Construtora RR', (SELECT id FROM grupos WHERE dominio = 'construtorarr.online'), '/logo.png', '#3b82f6', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  short_name = EXCLUDED.short_name,
  grupo_id = EXCLUDED.grupo_id,
  atualizado_em = NOW();

INSERT INTO tenant_modules (tenant_id, module_id, enabled)
VALUES
  ('construtora', 'dashboard', true),
  ('construtora', 'lancamentos', true),
  ('construtora', 'funcionarios', true),
  ('construtora', 'obras', true),
  ('construtora', 'empresas', true),
  ('construtora', 'tarefas', true),
  ('construtora', 'relatorios', true),
  ('construtora', 'rh', true),
  ('construtora', 'financeiro', true),
  ('construtora', 'base', true)
ON CONFLICT (tenant_id, module_id) DO NOTHING;

-- ============================================================
-- FIM DA MIGRACAO
-- ============================================================
