-- ============================================================
-- MIGRACAO 08: Adicionar tenant_id nas tabelas financeiras + contatos
-- Execute no Supabase Dashboard -> SQL Editor
-- ============================================================

-- financeiro_contas
ALTER TABLE financeiro_contas ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'construtora';
CREATE INDEX IF NOT EXISTS idx_fin_contas_tenant_id ON financeiro_contas(tenant_id);

-- financeiro_categorias
ALTER TABLE financeiro_categorias ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'construtora';
CREATE INDEX IF NOT EXISTS idx_fin_categ_tenant_id ON financeiro_categorias(tenant_id);

-- financeiro_lancamentos
ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'construtora';
CREATE INDEX IF NOT EXISTS idx_fin_lanc_tenant_id ON financeiro_lancamentos(tenant_id);

-- financeiro_extrato
ALTER TABLE financeiro_extrato ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'construtora';
CREATE INDEX IF NOT EXISTS idx_fin_ext_tenant_id ON financeiro_extrato(tenant_id);

-- contatos (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contatos') THEN
    ALTER TABLE contatos ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'construtora';
    CREATE INDEX IF NOT EXISTS idx_contatos_tenant_id ON contatos(tenant_id);
  END IF;
END $$;

-- financeiro_centros_custo (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financeiro_centros_custo') THEN
    ALTER TABLE financeiro_centros_custo ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'construtora';
    CREATE INDEX IF NOT EXISTS idx_fin_cc_tenant_id ON financeiro_centros_custo(tenant_id);
  END IF;
END $$;

-- tarefas_anexos (se nao tem tenant_id)
ALTER TABLE tarefas_anexos ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'construtora';
CREATE INDEX IF NOT EXISTS idx_tarefas_anexos_tenant_id ON tarefas_anexos(tenant_id);

-- relatorios_atividades (se nao tem tenant_id)
ALTER TABLE relatorios_atividades ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'construtora';
CREATE INDEX IF NOT EXISTS idx_rel_ativ_tenant_id ON relatorios_atividades(tenant_id);

-- relatorios_ocorrencias (se nao tem tenant_id)
ALTER TABLE relatorios_ocorrencias ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) NOT NULL DEFAULT 'construtora';
CREATE INDEX IF NOT EXISTS idx_rel_ocorr_tenant_id ON relatorios_ocorrencias(tenant_id);

-- ============================================================
-- Atualizar view_tarefas_resumo para incluir tenant_id
-- ============================================================
CREATE OR REPLACE VIEW view_tarefas_resumo AS
SELECT
  t.id,
  t.titulo,
  t.descricao,
  t.status,
  t.prioridade,
  t.funcionario_id,
  t.usuario_responsavel_id,
  t.obra_id,
  t.empresa_id,
  t.criado_por,
  t.data_prazo,
  t.data_conclusao,
  t.criado_em,
  t.atualizado_em,
  t.tenant_id,
  u.nome    AS usuario_responsavel_nome,
  u.email   AS usuario_responsavel_email,
  f.nome    AS funcionario_nome,
  o.nome    AS obra_nome,
  e.nome    AS empresa_nome,
  (SELECT COUNT(*) FROM tarefas_comentarios tc WHERE tc.tarefa_id = t.id) AS total_comentarios,
  (SELECT COUNT(*) FROM tarefas_anexos      ta WHERE ta.tarefa_id = t.id) AS total_anexos,
  (SELECT COUNT(*) FROM tarefas_checklists tcl WHERE tcl.tarefa_id = t.id) AS total_checklist_items,
  (SELECT COUNT(*) FROM tarefas_checklists tcl WHERE tcl.tarefa_id = t.id AND tcl.concluido = 1) AS checklist_concluidos,
  (SELECT STRING_AGG(et.nome, '|') FROM tarefas_etiquetas te JOIN etiquetas et ON te.etiqueta_id = et.id WHERE te.tarefa_id = t.id) AS etiquetas_nomes,
  (SELECT STRING_AGG(et.cor,  '|') FROM tarefas_etiquetas te JOIN etiquetas et ON te.etiqueta_id = et.id WHERE te.tarefa_id = t.id) AS etiquetas_cores
FROM tarefas t
LEFT JOIN usuarios    u ON t.usuario_responsavel_id = u.id
LEFT JOIN funcionarios f ON t.funcionario_id = f.id
LEFT JOIN obras        o ON t.obra_id = o.id
LEFT JOIN empresas     e ON t.empresa_id = e.id;

-- ============================================================
-- FIM DA MIGRACAO
-- ============================================================