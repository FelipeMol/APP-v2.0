-- ============================================================
-- SCHEMA POSTGRESQL - CONTROLE DE OBRAS (Supabase)
-- Migração de MySQL (HostGator) → PostgreSQL (Supabase)
-- 
-- COMO USAR:
--   1. Acesse: https://supabase.com/dashboard/project/zkjrghjwnalfhzprsrpc
--   2. Vá em SQL Editor → New Query
--   3. Cole e execute este arquivo COMPLETO
-- ============================================================

-- ============================================================
-- FUNÇÃO AUXILIAR: auto-atualiza updated_at / atualizado_em
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Alias usado nas tabelas mais novas
CREATE OR REPLACE FUNCTION trigger_set_updated_at_alias()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- UMBRELLA: usuarios (autenticação central)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id          BIGSERIAL PRIMARY KEY,
  nome        VARCHAR(255) NOT NULL,
  usuario     VARCHAR(100) NOT NULL,
  email       VARCHAR(255) DEFAULT NULL,
  avatar      VARCHAR(255) DEFAULT NULL,
  senha       VARCHAR(255) NOT NULL,
  tipo        VARCHAR(20)  NOT NULL DEFAULT 'usuario' CHECK (tipo IN ('admin','usuario')),
  ativo       VARCHAR(10)  NOT NULL DEFAULT 'Sim'     CHECK (ativo IN ('Sim','Não','Nao')),
  primeiro_acesso SMALLINT NOT NULL DEFAULT 1,
  ultimo_login    TIMESTAMPTZ DEFAULT NULL,
  token_versao    INTEGER NOT NULL DEFAULT 1,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (usuario),
  UNIQUE (email)
);
CREATE INDEX IF NOT EXISTS idx_usuarios_usuario ON usuarios(usuario);
CREATE INDEX IF NOT EXISTS idx_usuarios_email   ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo   ON usuarios(ativo);

CREATE OR REPLACE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- UMBRELLA: modulos
-- ============================================================
CREATE TABLE IF NOT EXISTS modulos (
  id           BIGSERIAL PRIMARY KEY,
  nome         VARCHAR(100) NOT NULL,
  titulo       VARCHAR(255) NOT NULL DEFAULT '',
  descricao    TEXT,
  icone        VARCHAR(50)  DEFAULT NULL,
  ordem        INTEGER      NOT NULL DEFAULT 0,
  ativo        SMALLINT     NOT NULL DEFAULT 1,
  requer_admin SMALLINT     NOT NULL DEFAULT 0,
  criado_em    TIMESTAMPTZ  DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (nome)
);
CREATE INDEX IF NOT EXISTS idx_modulos_ativo ON modulos(ativo);
CREATE INDEX IF NOT EXISTS idx_modulos_ordem ON modulos(ordem);

CREATE OR REPLACE TRIGGER trg_modulos_updated_at
  BEFORE UPDATE ON modulos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- UMBRELLA: permissoes
-- ============================================================
CREATE TABLE IF NOT EXISTS permissoes (
  id               BIGSERIAL PRIMARY KEY,
  usuario_id       BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  modulo_id        BIGINT NOT NULL REFERENCES modulos(id)  ON DELETE CASCADE,
  pode_visualizar  SMALLINT NOT NULL DEFAULT 0,
  pode_criar       SMALLINT NOT NULL DEFAULT 0,
  pode_editar      SMALLINT NOT NULL DEFAULT 0,
  pode_excluir     SMALLINT NOT NULL DEFAULT 0,
  criado_em        TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (usuario_id, modulo_id)
);
CREATE INDEX IF NOT EXISTS idx_permissoes_usuario ON permissoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_modulo  ON permissoes(modulo_id);

CREATE OR REPLACE TRIGGER trg_permissoes_updated_at
  BEFORE UPDATE ON permissoes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- UMBRELLA: usuarios_tenants (quais empresas cada usuário acessa)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios_tenants (
  id         BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tenant_id  VARCHAR(50) NOT NULL,
  ativo      SMALLINT    NOT NULL DEFAULT 1,
  criado_em  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (usuario_id, tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_ut_tenant_id ON usuarios_tenants(tenant_id);

-- ============================================================
-- EMPRESAS
-- ============================================================
CREATE TABLE IF NOT EXISTS empresas (
  id            BIGSERIAL PRIMARY KEY,
  nome          VARCHAR(255) NOT NULL,
  cnpj          VARCHAR(20)  DEFAULT NULL,
  tipo          VARCHAR(30)  DEFAULT 'Construtora' CHECK (tipo IN ('Construtora','Serviços','SPE')),
  tenant_id     VARCHAR(50)  NOT NULL DEFAULT 'construtora',
  criado_em     TIMESTAMPTZ  DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_empresas_nome      ON empresas(nome);
CREATE INDEX IF NOT EXISTS idx_empresas_tenant_id ON empresas(tenant_id);

CREATE OR REPLACE TRIGGER trg_empresas_updated_at
  BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- OBRAS
-- ============================================================
CREATE TABLE IF NOT EXISTS obras (
  id              BIGSERIAL    PRIMARY KEY,
  nome            VARCHAR(255) NOT NULL,
  responsavel     VARCHAR(255) DEFAULT NULL,
  cidade          VARCHAR(255) DEFAULT NULL,
  status          VARCHAR(20)  DEFAULT 'ativa' CHECK (status IN ('ativa','pausada','concluida','atrasada')),
  progresso       NUMERIC(5,2) DEFAULT 0,
  data_inicio     DATE         DEFAULT NULL,
  data_prevista   DATE         DEFAULT NULL,
  data_conclusao  DATE         DEFAULT NULL,
  orcamento       NUMERIC(15,2) DEFAULT 0,
  custo_atual     NUMERIC(15,2) DEFAULT 0,
  meta_mensal     NUMERIC(5,2)  DEFAULT 0,
  empresa         VARCHAR(255)  DEFAULT NULL,
  descricao       TEXT          DEFAULT NULL,
  tenant_id       VARCHAR(50)   NOT NULL DEFAULT 'construtora',
  criado_em       TIMESTAMPTZ   DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_obras_nome      ON obras(nome);
CREATE INDEX IF NOT EXISTS idx_obras_cidade    ON obras(cidade);
CREATE INDEX IF NOT EXISTS idx_obras_tenant_id ON obras(tenant_id);

CREATE OR REPLACE TRIGGER trg_obras_updated_at
  BEFORE UPDATE ON obras
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- FUNCOES (cargos/funções)
-- ============================================================
CREATE TABLE IF NOT EXISTS funcoes (
  id            BIGSERIAL    PRIMARY KEY,
  nome          VARCHAR(255) NOT NULL,
  descricao     TEXT,
  salario_base  NUMERIC(10,2) DEFAULT NULL,
  cbo           VARCHAR(20)   DEFAULT NULL,
  ativo         SMALLINT      NOT NULL DEFAULT 1,
  tenant_id     VARCHAR(50)   NOT NULL DEFAULT 'construtora',
  criado_em     TIMESTAMPTZ   DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ   DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_funcoes_nome      ON funcoes(nome);
CREATE INDEX IF NOT EXISTS idx_funcoes_tenant_id ON funcoes(tenant_id);

CREATE OR REPLACE TRIGGER trg_funcoes_updated_at
  BEFORE UPDATE ON funcoes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- FUNCIONARIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS funcionarios (
  id            BIGSERIAL    PRIMARY KEY,
  nome          VARCHAR(255) NOT NULL,
  funcao        VARCHAR(255) DEFAULT NULL,
  empresa       VARCHAR(255) DEFAULT NULL,
  situacao      VARCHAR(20)  DEFAULT 'Ativo' CHECK (situacao IN ('Ativo','Inativo')),
  tenant_id     VARCHAR(50)  NOT NULL DEFAULT 'construtora',
  criado_em     TIMESTAMPTZ  DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_funcionarios_nome      ON funcionarios(nome);
CREATE INDEX IF NOT EXISTS idx_funcionarios_empresa   ON funcionarios(empresa);
CREATE INDEX IF NOT EXISTS idx_funcionarios_situacao  ON funcionarios(situacao);
CREATE INDEX IF NOT EXISTS idx_funcionarios_tenant_id ON funcionarios(tenant_id);

CREATE OR REPLACE TRIGGER trg_funcionarios_updated_at
  BEFORE UPDATE ON funcionarios
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- LANCAMENTOS (tabela principal, 6k+ registros)
-- ============================================================
CREATE TABLE IF NOT EXISTS lancamentos (
  id            BIGSERIAL    PRIMARY KEY,
  data          DATE         NOT NULL,
  funcionario   VARCHAR(255) NOT NULL,
  funcao        VARCHAR(255) DEFAULT NULL,
  empresa       VARCHAR(255) DEFAULT NULL,
  obra          VARCHAR(255) DEFAULT NULL,
  horas         TIME         DEFAULT '08:00:00',
  diarias       NUMERIC(3,1) DEFAULT 1.0,
  observacao    TEXT,
  tenant_id     VARCHAR(50)  NOT NULL DEFAULT 'construtora',
  criado_em     TIMESTAMPTZ  DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data          ON lancamentos(data);
CREATE INDEX IF NOT EXISTS idx_lancamentos_funcionario   ON lancamentos(funcionario);
CREATE INDEX IF NOT EXISTS idx_lancamentos_obra          ON lancamentos(obra);
CREATE INDEX IF NOT EXISTS idx_lancamentos_empresa       ON lancamentos(empresa);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data_func     ON lancamentos(data, funcionario);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tenant_id     ON lancamentos(tenant_id);

CREATE OR REPLACE TRIGGER trg_lancamentos_updated_at
  BEFORE UPDATE ON lancamentos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- ETIQUETAS
-- ============================================================
CREATE TABLE IF NOT EXISTS etiquetas (
  id        BIGSERIAL    PRIMARY KEY,
  nome      VARCHAR(50)  NOT NULL,
  cor       VARCHAR(7)   NOT NULL DEFAULT '#6b7280',
  tenant_id VARCHAR(50)  NOT NULL DEFAULT 'construtora',
  criado_em TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_etiquetas_nome      ON etiquetas(nome);
CREATE INDEX IF NOT EXISTS idx_etiquetas_tenant_id ON etiquetas(tenant_id);

-- ============================================================
-- AVALIACOES
-- ============================================================
CREATE TABLE IF NOT EXISTS avaliacoes (
  id                     BIGSERIAL PRIMARY KEY,
  funcionario_id         BIGINT    NOT NULL,
  funcionario_nome       VARCHAR(255) NOT NULL,
  data_avaliacao         DATE      NOT NULL,
  pontualidade           INTEGER   DEFAULT 0,
  qualidade              INTEGER   DEFAULT 0,
  trabalho_equipe        INTEGER   DEFAULT 0,
  iniciativa             INTEGER   DEFAULT 0,
  conhecimento_tecnico   INTEGER   DEFAULT 0,
  capacidade_aprendizado INTEGER   DEFAULT 0,
  observacoes            TEXT,
  tenant_id              VARCHAR(50) NOT NULL DEFAULT 'construtora',
  criado_em              TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_funcionario ON avaliacoes(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_data        ON avaliacoes(data_avaliacao);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_tenant_id   ON avaliacoes(tenant_id);

CREATE OR REPLACE TRIGGER trg_avaliacoes_updated_at
  BEFORE UPDATE ON avaliacoes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TAREFAS
-- ============================================================
CREATE TABLE IF NOT EXISTS tarefas (
  id                    BIGSERIAL    PRIMARY KEY,
  titulo                VARCHAR(255) NOT NULL,
  descricao             TEXT,
  status                VARCHAR(20)  DEFAULT 'novo' CHECK (status IN ('novo','em_andamento','concluido','cancelado')),
  posicao_coluna        INTEGER      DEFAULT 0,
  prioridade            VARCHAR(20)  DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta','urgente')),
  funcionario_id        BIGINT       DEFAULT NULL REFERENCES funcionarios(id) ON DELETE SET NULL,
  usuario_responsavel_id BIGINT      DEFAULT NULL REFERENCES usuarios(id)    ON DELETE SET NULL,
  obra_id               BIGINT       DEFAULT NULL REFERENCES obras(id)       ON DELETE SET NULL,
  empresa_id            BIGINT       DEFAULT NULL REFERENCES empresas(id)    ON DELETE SET NULL,
  criado_por            BIGINT       NOT NULL     REFERENCES usuarios(id)    ON DELETE CASCADE,
  data_prazo            DATE         DEFAULT NULL,
  data_conclusao        TIMESTAMPTZ  DEFAULT NULL,
  tenant_id             VARCHAR(50)  NOT NULL DEFAULT 'construtora',
  criado_em             TIMESTAMPTZ  DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tarefas_status        ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_tarefas_prioridade    ON tarefas(prioridade);
CREATE INDEX IF NOT EXISTS idx_tarefas_funcionario   ON tarefas(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_obra          ON tarefas(obra_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_empresa       ON tarefas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_criado_por    ON tarefas(criado_por);
CREATE INDEX IF NOT EXISTS idx_tarefas_prazo         ON tarefas(data_prazo);
CREATE INDEX IF NOT EXISTS idx_tarefas_posicao       ON tarefas(status, posicao_coluna);
CREATE INDEX IF NOT EXISTS idx_tarefas_tenant_id     ON tarefas(tenant_id);

CREATE OR REPLACE TRIGGER trg_tarefas_updated_at
  BEFORE UPDATE ON tarefas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TAREFAS_ANEXOS
-- ============================================================
CREATE TABLE IF NOT EXISTS tarefas_anexos (
  id             BIGSERIAL    PRIMARY KEY,
  tarefa_id      BIGINT       NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  nome_original  VARCHAR(255) NOT NULL,
  nome_arquivo   VARCHAR(255) NOT NULL,
  caminho        VARCHAR(500) NOT NULL,
  tamanho        INTEGER      NOT NULL,
  tipo_mime      VARCHAR(100) DEFAULT NULL,
  usuario_id     BIGINT       NOT NULL REFERENCES usuarios(id),
  criado_em      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tanexos_tarefa   ON tarefas_anexos(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_tanexos_usuario  ON tarefas_anexos(usuario_id);

-- ============================================================
-- TAREFAS_ATIVIDADES (histórico)
-- ============================================================
CREATE TABLE IF NOT EXISTS tarefas_atividades (
  id              BIGSERIAL    PRIMARY KEY,
  tarefa_id       BIGINT       NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  usuario_id      BIGINT       NOT NULL REFERENCES usuarios(id),
  acao            VARCHAR(50)  NOT NULL,
  descricao       TEXT,
  campo_alterado  VARCHAR(100) DEFAULT NULL,
  valor_anterior  TEXT,
  valor_novo      TEXT,
  criado_em       TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tatv_tarefa   ON tarefas_atividades(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_tatv_usuario  ON tarefas_atividades(usuario_id);
CREATE INDEX IF NOT EXISTS idx_tatv_criado   ON tarefas_atividades(criado_em DESC);

-- ============================================================
-- TAREFAS_CHECKLISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tarefas_checklists (
  id            BIGSERIAL    PRIMARY KEY,
  tarefa_id     BIGINT       NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  titulo        VARCHAR(255) NOT NULL,
  concluido     SMALLINT     NOT NULL DEFAULT 0,
  ordem         INTEGER      DEFAULT 0,
  criado_em     TIMESTAMPTZ  DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tchk_tarefa ON tarefas_checklists(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_tchk_ordem  ON tarefas_checklists(tarefa_id, ordem);

CREATE OR REPLACE TRIGGER trg_tchk_updated_at
  BEFORE UPDATE ON tarefas_checklists
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TAREFAS_COMENTARIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS tarefas_comentarios (
  id            BIGSERIAL   PRIMARY KEY,
  tarefa_id     BIGINT      NOT NULL REFERENCES tarefas(id)  ON DELETE CASCADE,
  usuario_id    BIGINT      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  comentario    TEXT        NOT NULL,
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tcom_tarefa   ON tarefas_comentarios(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_tcom_usuario  ON tarefas_comentarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_tcom_criado   ON tarefas_comentarios(criado_em);

CREATE OR REPLACE TRIGGER trg_tcom_updated_at
  BEFORE UPDATE ON tarefas_comentarios
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TAREFAS_ETIQUETAS (pivot)
-- ============================================================
CREATE TABLE IF NOT EXISTS tarefas_etiquetas (
  id          BIGSERIAL   PRIMARY KEY,
  tarefa_id   BIGINT      NOT NULL REFERENCES tarefas(id)   ON DELETE CASCADE,
  etiqueta_id BIGINT      NOT NULL REFERENCES etiquetas(id) ON DELETE CASCADE,
  criado_em   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tarefa_id, etiqueta_id)
);
CREATE INDEX IF NOT EXISTS idx_tetq_tarefa   ON tarefas_etiquetas(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_tetq_etiqueta ON tarefas_etiquetas(etiqueta_id);

-- ============================================================
-- TAREFAS_MEMBROS (responsáveis / observadores)
-- ============================================================
CREATE TABLE IF NOT EXISTS tarefas_membros (
  id          BIGSERIAL   PRIMARY KEY,
  tarefa_id   BIGINT      NOT NULL REFERENCES tarefas(id)  ON DELETE CASCADE,
  usuario_id  BIGINT      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  papel       VARCHAR(20) DEFAULT 'responsavel' CHECK (papel IN ('responsavel','observador','revisor')),
  criado_em   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tarefa_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_tmem_tarefa  ON tarefas_membros(tarefa_id);
CREATE INDEX IF NOT EXISTS idx_tmem_usuario ON tarefas_membros(usuario_id);

-- ============================================================
-- RESPONSAVEIS (base de responsáveis de obras)
-- ============================================================
CREATE TABLE IF NOT EXISTS responsaveis (
  id            BIGSERIAL    PRIMARY KEY,
  nome          VARCHAR(255) NOT NULL,
  cargo         VARCHAR(100) DEFAULT NULL,
  telefone      VARCHAR(20)  DEFAULT NULL,
  email         VARCHAR(255) DEFAULT NULL,
  ativo         SMALLINT     NOT NULL DEFAULT 1,
  tenant_id     VARCHAR(50)  NOT NULL DEFAULT 'construtora',
  criado_em     TIMESTAMPTZ  DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_responsaveis_tenant_id ON responsaveis(tenant_id);

CREATE OR REPLACE TRIGGER trg_responsaveis_updated_at
  BEFORE UPDATE ON responsaveis
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- OBRAS_CRONOGRAMA (Gantt)
-- ============================================================
CREATE TABLE IF NOT EXISTS obras_cronograma (
  id                   BIGSERIAL    PRIMARY KEY,
  obra_id              BIGINT       NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  fase                 VARCHAR(255) NOT NULL,
  descricao            TEXT,
  ordem                INTEGER      DEFAULT 0,
  data_inicio_planejada DATE,
  data_fim_planejada    DATE,
  data_inicio_real      DATE,
  data_fim_real         DATE,
  progresso             NUMERIC(5,2) DEFAULT 0,
  status                VARCHAR(20)  DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','concluida','atrasada')),
  cor                   VARCHAR(20)  DEFAULT '#4F46E5',
  tenant_id             VARCHAR(50)  NOT NULL DEFAULT 'construtora',
  criado_em             TIMESTAMPTZ  DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cronograma_obra_id   ON obras_cronograma(obra_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_status    ON obras_cronograma(status);
CREATE INDEX IF NOT EXISTS idx_cronograma_tenant_id ON obras_cronograma(tenant_id);

CREATE OR REPLACE TRIGGER trg_cronograma_updated_at
  BEFORE UPDATE ON obras_cronograma
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- OBRAS_ALERTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS obras_alertas (
  id           BIGSERIAL    PRIMARY KEY,
  obra_id      BIGINT       NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  tipo         VARCHAR(50)  NOT NULL,
  mensagem     TEXT         NOT NULL,
  nivel        VARCHAR(20)  DEFAULT 'info' CHECK (nivel IN ('info','aviso','critico')),
  lido         SMALLINT     NOT NULL DEFAULT 0,
  tenant_id    VARCHAR(50)  NOT NULL DEFAULT 'construtora',
  criado_em    TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alertas_obra_id   ON obras_alertas(obra_id);
CREATE INDEX IF NOT EXISTS idx_alertas_tenant_id ON obras_alertas(tenant_id);

-- ============================================================
-- OBRAS_METAS
-- ============================================================
CREATE TABLE IF NOT EXISTS obras_metas (
  id            BIGSERIAL    PRIMARY KEY,
  obra_id       BIGINT       NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  tipo          VARCHAR(50)  NOT NULL,
  valor_meta    NUMERIC(15,2) NOT NULL,
  valor_atual   NUMERIC(15,2) DEFAULT 0,
  periodo       VARCHAR(20)  DEFAULT NULL,
  tenant_id     VARCHAR(50)  NOT NULL DEFAULT 'construtora',
  criado_em     TIMESTAMPTZ  DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_metas_obra_id   ON obras_metas(obra_id);
CREATE INDEX IF NOT EXISTS idx_metas_tenant_id ON obras_metas(tenant_id);

CREATE OR REPLACE TRIGGER trg_metas_updated_at
  BEFORE UPDATE ON obras_metas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- RELATORIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS relatorios (
  id                 BIGSERIAL    PRIMARY KEY,
  obra_id            BIGINT       NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  tipo               VARCHAR(20)  NOT NULL CHECK (tipo IN ('diario','semanal','mensal')),
  titulo             VARCHAR(255),
  periodo_inicio     DATE         NOT NULL,
  periodo_fim        DATE         NOT NULL,
  status             VARCHAR(20)  DEFAULT 'aberto' CHECK (status IN ('rascunho','aberto','fechado','revisao')),
  resumo_executivo   TEXT,
  conclusoes         TEXT,
  proximos_passos    TEXT,
  progresso          NUMERIC(5,2),
  progresso_anterior NUMERIC(5,2),
  custo              NUMERIC(15,2),
  custo_anterior     NUMERIC(15,2),
  tenant_id          VARCHAR(50)  NOT NULL DEFAULT 'construtora',
  criado_por         BIGINT       REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em          TIMESTAMPTZ  DEFAULT NOW(),
  atualizado_em      TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_relatorios_obra_id   ON relatorios(obra_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_tenant_id ON relatorios(tenant_id);

CREATE OR REPLACE TRIGGER trg_relatorios_updated_at
  BEFORE UPDATE ON relatorios
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- RELATORIOS_FOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS relatorios_fotos (
  id            BIGSERIAL    PRIMARY KEY,
  relatorio_id  BIGINT       REFERENCES relatorios(id) ON DELETE CASCADE,
  obra_id       BIGINT       REFERENCES obras(id) ON DELETE CASCADE,
  legenda       VARCHAR(500),
  caminho       VARCHAR(500) NOT NULL,
  nome_arquivo  VARCHAR(255),
  tamanho       INTEGER,
  tipo_mime     VARCHAR(100),
  tenant_id     VARCHAR(50)  NOT NULL DEFAULT 'construtora',
  criado_em     TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rfoto_relatorio ON relatorios_fotos(relatorio_id);
CREATE INDEX IF NOT EXISTS idx_rfoto_tenant_id ON relatorios_fotos(tenant_id);

-- ============================================================
-- RELATORIOS_ATIVIDADES
-- ============================================================
CREATE TABLE IF NOT EXISTS relatorios_atividades (
  id            BIGSERIAL    PRIMARY KEY,
  relatorio_id  BIGINT       NOT NULL REFERENCES relatorios(id) ON DELETE CASCADE,
  descricao     TEXT         NOT NULL,
  responsavel   VARCHAR(255),
  status        VARCHAR(30)  DEFAULT 'em_andamento',
  concluido     SMALLINT     NOT NULL DEFAULT 0,
  criado_em     TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ratv_relatorio ON relatorios_atividades(relatorio_id);

-- ============================================================
-- RELATORIOS_OCORRENCIAS
-- ============================================================
CREATE TABLE IF NOT EXISTS relatorios_ocorrencias (
  id            BIGSERIAL    PRIMARY KEY,
  relatorio_id  BIGINT       NOT NULL REFERENCES relatorios(id) ON DELETE CASCADE,
  tipo          VARCHAR(50),
  descricao     TEXT         NOT NULL,
  impacto       VARCHAR(20)  DEFAULT 'medio',
  resolvido     SMALLINT     NOT NULL DEFAULT 0,
  criado_em     TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rocr_relatorio ON relatorios_ocorrencias(relatorio_id);

-- ============================================================
-- RH: REQUISICOES_VAGAS
-- ============================================================
CREATE TABLE IF NOT EXISTS requisicoes_vagas (
  id                      SERIAL       PRIMARY KEY,
  obra_id                 INTEGER      NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  funcao_id               INTEGER      NOT NULL REFERENCES funcoes(id) ON DELETE CASCADE,
  requisitante_id         INTEGER      NOT NULL REFERENCES usuarios(id),
  quantidade              INTEGER      DEFAULT 1,
  justificativa           TEXT         NOT NULL,
  urgencia                VARCHAR(20)  DEFAULT 'media' CHECK (urgencia IN ('baixa','media','alta','critica')),
  data_abertura           TIMESTAMPTZ  DEFAULT NOW(),
  data_limite             DATE,
  status                  VARCHAR(20)  DEFAULT 'aberta' CHECK (status IN ('aberta','em_selecao','contratada','cancelada')),
  aprovador_gestor_id     INTEGER      REFERENCES usuarios(id),
  data_aprovacao_gestor   TIMESTAMPTZ,
  aprovador_rh_id         INTEGER      REFERENCES usuarios(id),
  data_aprovacao_rh       TIMESTAMPTZ,
  aprovador_diretoria_id  INTEGER      REFERENCES usuarios(id),
  data_aprovacao_diretoria TIMESTAMPTZ,
  observacoes             TEXT,
  tenant_id               VARCHAR(50)  NOT NULL DEFAULT 'construtora',
  created_at              TIMESTAMPTZ  DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reqvagas_status    ON requisicoes_vagas(status);
CREATE INDEX IF NOT EXISTS idx_reqvagas_obra      ON requisicoes_vagas(obra_id);
CREATE INDEX IF NOT EXISTS idx_reqvagas_tenant_id ON requisicoes_vagas(tenant_id);

CREATE OR REPLACE TRIGGER trg_reqvagas_updated_at
  BEFORE UPDATE ON requisicoes_vagas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at_alias();

-- ============================================================
-- RH: CANDIDATOS
-- ============================================================
CREATE TABLE IF NOT EXISTS candidatos (
  id                      SERIAL       PRIMARY KEY,
  requisicao_id           INTEGER      REFERENCES requisicoes_vagas(id) ON DELETE SET NULL,
  nome                    VARCHAR(255) NOT NULL,
  cpf                     VARCHAR(14)  UNIQUE,
  telefone                VARCHAR(20),
  email                   VARCHAR(255),
  data_nascimento         DATE,
  endereco                TEXT,
  cidade                  VARCHAR(100),
  estado                  VARCHAR(2),
  curriculo_pdf           VARCHAR(500),
  foto                    VARCHAR(500),
  pretensao_salarial      NUMERIC(10,2),
  disponibilidade_imediata SMALLINT    DEFAULT 1,
  origem                  VARCHAR(30)  DEFAULT 'outros' CHECK (origem IN ('indicacao','site','redes_sociais','outros')),
  indicado_por            VARCHAR(255),
  status                  VARCHAR(30)  DEFAULT 'cadastrado' CHECK (status IN ('cadastrado','em_analise','entrevista_agendada','aprovado','reprovado','contratado')),
  observacoes             TEXT,
  tenant_id               VARCHAR(50)  NOT NULL DEFAULT 'construtora',
  created_at              TIMESTAMPTZ  DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_candidatos_status    ON candidatos(status);
CREATE INDEX IF NOT EXISTS idx_candidatos_nome      ON candidatos(nome);
CREATE INDEX IF NOT EXISTS idx_candidatos_tenant_id ON candidatos(tenant_id);

CREATE OR REPLACE TRIGGER trg_candidatos_updated_at
  BEFORE UPDATE ON candidatos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at_alias();

-- ============================================================
-- RH: ENTREVISTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS entrevistas (
  id                  SERIAL       PRIMARY KEY,
  candidato_id        INTEGER      NOT NULL REFERENCES candidatos(id) ON DELETE CASCADE,
  requisicao_id       INTEGER      REFERENCES requisicoes_vagas(id) ON DELETE SET NULL,
  avaliador_id        INTEGER      NOT NULL REFERENCES usuarios(id),
  tipo                VARCHAR(30)  DEFAULT 'triagem' CHECK (tipo IN ('triagem','tecnica','comportamental','final')),
  data_entrevista     TIMESTAMPTZ  NOT NULL,
  local               VARCHAR(255),
  duracao_minutos     INTEGER,
  criterios_avaliacao JSONB,
  nota_final          NUMERIC(3,2),
  resultado           VARCHAR(20)  DEFAULT 'em_analise' CHECK (resultado IN ('aprovado','reprovado','em_analise')),
  observacoes         TEXT,
  recomendacao        TEXT,
  tenant_id           VARCHAR(50)  NOT NULL DEFAULT 'construtora',
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_entrevistas_candidato  ON entrevistas(candidato_id);
CREATE INDEX IF NOT EXISTS idx_entrevistas_data        ON entrevistas(data_entrevista);
CREATE INDEX IF NOT EXISTS idx_entrevistas_tenant_id   ON entrevistas(tenant_id);

CREATE OR REPLACE TRIGGER trg_entrevistas_updated_at
  BEFORE UPDATE ON entrevistas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at_alias();

-- ============================================================
-- RH: ADMISSOES
-- ============================================================
CREATE TABLE IF NOT EXISTS admissoes (
  id                           SERIAL       PRIMARY KEY,
  candidato_id                 INTEGER      NOT NULL REFERENCES candidatos(id) ON DELETE CASCADE,
  funcionario_id               INTEGER      REFERENCES funcionarios(id) ON DELETE SET NULL,
  requisicao_id                INTEGER      REFERENCES requisicoes_vagas(id) ON DELETE SET NULL,
  data_admissao                DATE         NOT NULL,
  funcao_id                    INTEGER      NOT NULL REFERENCES funcoes(id),
  obra_id                      INTEGER      NOT NULL REFERENCES obras(id),
  salario                      NUMERIC(10,2),
  tipo_contrato                VARCHAR(20)  DEFAULT 'clt' CHECK (tipo_contrato IN ('clt','temporario','estagio','terceirizado')),
  doc_rg                       SMALLINT     DEFAULT 0,
  doc_cpf                      SMALLINT     DEFAULT 0,
  doc_ctps                     SMALLINT     DEFAULT 0,
  doc_comprovante_residencia    SMALLINT     DEFAULT 0,
  doc_titulo_eleitor            SMALLINT     DEFAULT 0,
  doc_certidao_nascimento       SMALLINT     DEFAULT 0,
  doc_certificado_reservista    SMALLINT     DEFAULT 0,
  doc_foto_3x4                 SMALLINT     DEFAULT 0,
  exame_admissional            SMALLINT     DEFAULT 0,
  exame_arquivo                VARCHAR(500),
  exame_resultado              VARCHAR(20)  DEFAULT 'pendente' CHECK (exame_resultado IN ('apto','inapto','pendente')),
  exame_data                   DATE,
  contrato_assinado            SMALLINT     DEFAULT 0,
  contrato_arquivo             VARCHAR(500),
  contrato_data_assinatura     DATE,
  epi_entregue                 SMALLINT     DEFAULT 0,
  epi_lista                    TEXT,
  epi_data_entrega             DATE,
  uniforme_entregue            SMALLINT     DEFAULT 0,
  uniforme_tamanho             VARCHAR(10),
  uniforme_data_entrega        DATE,
  treinamento_integracao       SMALLINT     DEFAULT 0,
  treinamento_data             DATE,
  cracha_entregue              SMALLINT     DEFAULT 0,
  cracha_numero                VARCHAR(50),
  status                       VARCHAR(20)  DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','concluido','cancelado')),
  responsavel_rh_id            INTEGER      REFERENCES usuarios(id),
  observacoes                  TEXT,
  tenant_id                    VARCHAR(50)  NOT NULL DEFAULT 'construtora',
  created_at                   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admissoes_tenant_id ON admissoes(tenant_id);

CREATE OR REPLACE TRIGGER trg_admissoes_updated_at
  BEFORE UPDATE ON admissoes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at_alias();

-- ============================================================
-- VIEW: view_tarefas_resumo (equivalente à view MySQL)
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
-- FIM DO SCHEMA
-- ============================================================
