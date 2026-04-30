-- ============================================================
-- SEED: Categorias financeiras baseadas no Controle Financeiro
-- Tenant: transformar
-- Execute no Supabase Dashboard -> SQL Editor
-- ============================================================

DO $$
DECLARE
  tid TEXT := 'transformar';

  -- IDs das categorias pai
  id_serv_prelim              BIGINT;
  id_demolicoes               BIGINT;
  id_estruturas               BIGINT;
  id_incendio                 BIGINT;
  id_ar_condicionado          BIGINT;
  id_eletrica                 BIGINT;
  id_hidraulica               BIGINT;
  id_pisos                    BIGINT;
  id_fechamentos              BIGINT;
  id_impermeabilizacao        BIGINT;
  id_montagens                BIGINT;
  id_marcenaria               BIGINT;
  id_marmore                  BIGINT;
  id_pinturas                 BIGINT;
  id_vidros                   BIGINT;
  id_serralheria              BIGINT;
  id_mobiliarios              BIGINT;
  id_locacoes                 BIGINT;
  id_limpezas                 BIGINT;
  id_despesas_indir           BIGINT;
BEGIN

  -- ── Categorias PAI ──────────────────────────────────────

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Serviços Preliminares', 'despesa', 'Custos operacionais', '#64748b', tid)
    RETURNING id INTO id_serv_prelim;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Demolições', 'despesa', 'Custos operacionais', '#78716c', tid)
    RETURNING id INTO id_demolicoes;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Estruturas de Concreto e Metálicas - Alvenaria', 'despesa', 'Custos operacionais', '#b45309', tid)
    RETURNING id INTO id_estruturas;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Instalação Prevenção e Combate a Incêndio', 'despesa', 'Custos operacionais', '#dc2626', tid)
    RETURNING id INTO id_incendio;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Instalação de Ar Condicionado', 'despesa', 'Custos operacionais', '#0891b2', tid)
    RETURNING id INTO id_ar_condicionado;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Instalação Elétrica', 'despesa', 'Custos operacionais', '#d97706', tid)
    RETURNING id INTO id_eletrica;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Instalação Hidráulica e Sanitária', 'despesa', 'Custos operacionais', '#0284c7', tid)
    RETURNING id INTO id_hidraulica;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Pisos e Revestimentos Cerâmicos', 'despesa', 'Custos operacionais', '#7c3aed', tid)
    RETURNING id INTO id_pisos;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Fechamentos e Forros (Gesso)', 'despesa', 'Custos operacionais', '#6d28d9', tid)
    RETURNING id INTO id_fechamentos;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Impermeabilização', 'despesa', 'Custos operacionais', '#059669', tid)
    RETURNING id INTO id_impermeabilizacao;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Montagens Comerciais', 'despesa', 'Custos operacionais', '#0f766e', tid)
    RETURNING id INTO id_montagens;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Marcenaria', 'despesa', 'Custos operacionais', '#92400e', tid)
    RETURNING id INTO id_marcenaria;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Mármore, Granito e Arenito', 'despesa', 'Custos operacionais', '#475569', tid)
    RETURNING id INTO id_marmore;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Pinturas', 'despesa', 'Custos operacionais', '#be185d', tid)
    RETURNING id INTO id_pinturas;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Vidros, Espelhos e Adesivos', 'despesa', 'Custos operacionais', '#0369a1', tid)
    RETURNING id INTO id_vidros;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Serralheria Fina', 'despesa', 'Custos operacionais', '#1d4ed8', tid)
    RETURNING id INTO id_serralheria;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Mobiliários, Eletrodomésticos e Equipamentos', 'despesa', 'Custos operacionais', '#7e22ce', tid)
    RETURNING id INTO id_mobiliarios;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Locações de Equip., Máquinas e Caçambas', 'despesa', 'Custos operacionais', '#b91c1c', tid)
    RETURNING id INTO id_locacoes;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Limpezas', 'despesa', 'Custos operacionais', '#4b5563', tid)
    RETURNING id INTO id_limpezas;

  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, tenant_id)
    VALUES ('Despesas Indiretas e Administração', 'despesa', 'Custos operacionais', '#374151', tid)
    RETURNING id INTO id_despesas_indir;

  -- ── Subcategorias ────────────────────────────────────────

  -- Serviços Preliminares
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('Plotagens e Cópias',           'despesa', 'Custos operacionais', '#64748b', id_serv_prelim, tid),
    ('ART e Fiscalização',           'despesa', 'Custos operacionais', '#64748b', id_serv_prelim, tid);

  -- Demolições
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('M.O. Demolição',               'despesa', 'Custos operacionais', '#78716c', id_demolicoes, tid),
    ('Mat. Demolição',               'despesa', 'Custos operacionais', '#78716c', id_demolicoes, tid);

  -- Estruturas
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('M.O.',                         'despesa', 'Custos operacionais', '#b45309', id_estruturas, tid),
    ('Materiais',                    'despesa', 'Custos operacionais', '#b45309', id_estruturas, tid);

  -- Incêndio
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('M.O.',                         'despesa', 'Custos operacionais', '#dc2626', id_incendio, tid),
    ('Materiais',                    'despesa', 'Custos operacionais', '#dc2626', id_incendio, tid);

  -- Ar Condicionado
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('Material',                     'despesa', 'Custos operacionais', '#0891b2', id_ar_condicionado, tid),
    ('Dutos',                        'despesa', 'Custos operacionais', '#0891b2', id_ar_condicionado, tid),
    ('Aparelhos',                    'despesa', 'Custos operacionais', '#0891b2', id_ar_condicionado, tid),
    ('M.O.',                         'despesa', 'Custos operacionais', '#0891b2', id_ar_condicionado, tid);

  -- Elétrica
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('M.O.',                         'despesa', 'Custos operacionais', '#d97706', id_eletrica, tid),
    ('Quadros',                      'despesa', 'Custos operacionais', '#d97706', id_eletrica, tid),
    ('Luminotécnico',                'despesa', 'Custos operacionais', '#d97706', id_eletrica, tid),
    ('Materiais',                    'despesa', 'Custos operacionais', '#d97706', id_eletrica, tid);

  -- Hidráulica
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('M.O.',                         'despesa', 'Custos operacionais', '#0284c7', id_hidraulica, tid),
    ('Materiais',                    'despesa', 'Custos operacionais', '#0284c7', id_hidraulica, tid);

  -- Pisos
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('M.O.',                         'despesa', 'Custos operacionais', '#7c3aed', id_pisos, tid),
    ('Pisos',                        'despesa', 'Custos operacionais', '#7c3aed', id_pisos, tid),
    ('Revestimentos',                'despesa', 'Custos operacionais', '#7c3aed', id_pisos, tid),
    ('Materiais',                    'despesa', 'Custos operacionais', '#7c3aed', id_pisos, tid);

  -- Fechamentos
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('Materiais',                    'despesa', 'Custos operacionais', '#6d28d9', id_fechamentos, tid),
    ('M.O.',                         'despesa', 'Custos operacionais', '#6d28d9', id_fechamentos, tid);

  -- Impermeabilização
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('Materiais',                    'despesa', 'Custos operacionais', '#059669', id_impermeabilizacao, tid),
    ('M.O.',                         'despesa', 'Custos operacionais', '#059669', id_impermeabilizacao, tid);

  -- Montagens Comerciais
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('Rofril',                       'despesa', 'Custos operacionais', '#0f766e', id_montagens, tid),
    ('Cofap (Inox)',                  'despesa', 'Custos operacionais', '#0f766e', id_montagens, tid),
    ('Expositores Refrigerados',     'despesa', 'Custos operacionais', '#0f766e', id_montagens, tid);

  -- Marcenaria
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('Materiais',                    'despesa', 'Custos operacionais', '#92400e', id_marcenaria, tid),
    ('M.O.',                         'despesa', 'Custos operacionais', '#92400e', id_marcenaria, tid);

  -- Mármore
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('Matéria Prima',                'despesa', 'Custos operacionais', '#475569', id_marmore, tid),
    ('Instalação',                   'despesa', 'Custos operacionais', '#475569', id_marmore, tid),
    ('Materiais',                    'despesa', 'Custos operacionais', '#475569', id_marmore, tid);

  -- Pinturas
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('Materiais',                    'despesa', 'Custos operacionais', '#be185d', id_pinturas, tid),
    ('M.O.',                         'despesa', 'Custos operacionais', '#be185d', id_pinturas, tid);

  -- Vidros
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('Matéria Prima',                'despesa', 'Custos operacionais', '#0369a1', id_vidros, tid),
    ('Instalação',                   'despesa', 'Custos operacionais', '#0369a1', id_vidros, tid),
    ('Completa',                     'despesa', 'Custos operacionais', '#0369a1', id_vidros, tid);

  -- Serralheria
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('Fachada',                      'despesa', 'Custos operacionais', '#1d4ed8', id_serralheria, tid),
    ('Portas Automáticas',           'despesa', 'Custos operacionais', '#1d4ed8', id_serralheria, tid),
    ('Guarda Corpo',                 'despesa', 'Custos operacionais', '#1d4ed8', id_serralheria, tid),
    ('Exaustão',                     'despesa', 'Custos operacionais', '#1d4ed8', id_serralheria, tid),
    ('M.O.',                         'despesa', 'Custos operacionais', '#1d4ed8', id_serralheria, tid),
    ('Materiais',                    'despesa', 'Custos operacionais', '#1d4ed8', id_serralheria, tid);

  -- Mobiliários
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('Móveis',                       'despesa', 'Custos operacionais', '#7e22ce', id_mobiliarios, tid),
    ('Decorativo',                   'despesa', 'Custos operacionais', '#7e22ce', id_mobiliarios, tid),
    ('Paisagismo',                   'despesa', 'Custos operacionais', '#7e22ce', id_mobiliarios, tid),
    ('Eletrodomésticos',             'despesa', 'Custos operacionais', '#7e22ce', id_mobiliarios, tid);

  -- Locações
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('Caçambas',                     'despesa', 'Custos operacionais', '#b91c1c', id_locacoes, tid),
    ('Andaimes e Equip.',            'despesa', 'Custos operacionais', '#b91c1c', id_locacoes, tid),
    ('Máquinas',                     'despesa', 'Custos operacionais', '#b91c1c', id_locacoes, tid);

  -- Limpezas
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('Limpeza Grossa e Fina',        'despesa', 'Custos operacionais', '#4b5563', id_limpezas, tid);

  -- Despesas Indiretas
  INSERT INTO financeiro_categorias (nome, tipo, grupo, cor, parent_id, tenant_id) VALUES
    ('Engenharia',                   'despesa', 'Custos operacionais', '#374151', id_despesas_indir, tid),
    ('Arquitetura',                  'despesa', 'Custos operacionais', '#374151', id_despesas_indir, tid),
    ('Adm. e Finanças',              'despesa', 'Custos operacionais', '#374151', id_despesas_indir, tid),
    ('Coordenador',                  'despesa', 'Custos operacionais', '#374151', id_despesas_indir, tid),
    ('Ajudante',                     'despesa', 'Custos operacionais', '#374151', id_despesas_indir, tid),
    ('Passagens e Alojamento',       'despesa', 'Custos operacionais', '#374151', id_despesas_indir, tid);

END $$;
