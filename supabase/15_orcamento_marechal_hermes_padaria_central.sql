-- ============================================================
-- ORÇAMENTO PREVISTO: PADARIA CENTRAL
-- Obra   : Marechal Hermes
-- Tenant : planejar ambientes (tenant_id buscado automaticamente pela obra)
-- Proposta Rev00 | 05/06/2025 | 320 m² | R$ 1.690.000,00
-- Total sem BDI : R$ 1.469.777,19
-- BDI 15%       : R$ 220.466,58
-- TOTAL C/ BDI  : R$ 1.690.243,76
-- VALOR FECHADO : R$ 1.690.000,00
-- Valores abaixo já incluem BDI de 15% (fator 1,15)
--
-- Execute no Supabase Dashboard → SQL Editor
-- ============================================================

DO $$
DECLARE
  v_obra_id   BIGINT;
  v_tenant_id VARCHAR(50);

  -- IDs das categorias
  c01 BIGINT; c02 BIGINT; c03 BIGINT; c05 BIGINT; c06 BIGINT;
  c08 BIGINT; c09 BIGINT; c10 BIGINT; c11 BIGINT; c12 BIGINT;
  c13 BIGINT; c14 BIGINT; c15 BIGINT; c16 BIGINT; c17 BIGINT;
  c18 BIGINT; c19 BIGINT; c20 BIGINT;
BEGIN

  -- ─── 1. Localizar obra ───────────────────────────────────────
  SELECT id, tenant_id
    INTO v_obra_id, v_tenant_id
    FROM obras
   WHERE nome ILIKE '%Marechal Hermes%'
   LIMIT 1;

  IF v_obra_id IS NULL THEN
    RAISE EXCEPTION 'Obra "Marechal Hermes" não encontrada. Verifique o nome cadastrado.';
  END IF;

  RAISE NOTICE 'Obra encontrada — id: %, tenant_id: %', v_obra_id, v_tenant_id;

  -- ─── 2. Upsert categorias de orçamento ───────────────────────
  -- Agrupa todas sob grupo 'Orçamento Obra' para fácil filtro na tela Previsto×Realizado

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Serviços Preliminares',                    'despesa', 'Orçamento Obra', '#6366f1', '📋')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c01 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Serviços Preliminares';

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Demolições',                               'despesa', 'Orçamento Obra', '#ef4444', '🔨')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c02 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Demolições';

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Estruturas e Alvenaria',                   'despesa', 'Orçamento Obra', '#b45309', '🧱')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c03 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Estruturas e Alvenaria';

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Instalação de Ar Condicionado',            'despesa', 'Orçamento Obra', '#0ea5e9', '❄️')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c05 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Instalação de Ar Condicionado';

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Instalação de Rede, Telefonia e CFTV',     'despesa', 'Orçamento Obra', '#7c3aed', '📡')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c06 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Instalação de Rede, Telefonia e CFTV';

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Instalação Elétrica',                      'despesa', 'Orçamento Obra', '#f59e0b', '⚡')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c08 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Instalação Elétrica';

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Instalação Hidráulica e Sanitária',        'despesa', 'Orçamento Obra', '#06b6d4', '🚿')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c09 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Instalação Hidráulica e Sanitária';

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Pisos e Revestimentos Cerâmicos',          'despesa', 'Orçamento Obra', '#84cc16', '🟫')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c10 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Pisos e Revestimentos Cerâmicos';

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Fechamentos e Forros',                     'despesa', 'Orçamento Obra', '#a3a3a3', '🏠')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c11 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Fechamentos e Forros';

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Impermeabilização',                        'despesa', 'Orçamento Obra', '#0284c7', '🛡️')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c12 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Impermeabilização';

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Montagem Comercial e Refrigeração',        'despesa', 'Orçamento Obra', '#dc2626', '🏪')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c13 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Montagem Comercial e Refrigeração';

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Mármore, Granito e Arenito',               'despesa', 'Orçamento Obra', '#78716c', '🪨')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c14 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Mármore, Granito e Arenito';

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Pinturas',                                 'despesa', 'Orçamento Obra', '#ec4899', '🎨')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c15 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Pinturas';

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Vidros e Espelhos',                        'despesa', 'Orçamento Obra', '#67e8f9', '🪟')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c16 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Vidros e Espelhos';

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Serralheria Fina e Mobiliário',            'despesa', 'Orçamento Obra', '#92400e', '🪑')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c17 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Serralheria Fina e Mobiliário';

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Paisagismo e Comunicação Visual',          'despesa', 'Orçamento Obra', '#22c55e', '🌿')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c18 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Paisagismo e Comunicação Visual';

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Locação de Equipamentos',                  'despesa', 'Orçamento Obra', '#f97316', '🏗️')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c19 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Locação de Equipamentos';

  INSERT INTO financeiro_categorias (tenant_id, nome, tipo, grupo, cor, icone)
  VALUES (v_tenant_id, 'Despesas Indiretas e Administração',       'despesa', 'Orçamento Obra', '#64748b', '🏢')
  ON CONFLICT (tenant_id, nome) DO NOTHING;
  SELECT id INTO c20 FROM financeiro_categorias
   WHERE tenant_id = v_tenant_id AND nome = 'Despesas Indiretas e Administração';

  -- ─── 3. Inserir orçamento previsto (ref. junho/2025) ─────────
  -- ON CONFLICT atualiza o valor caso o script seja rodado novamente

  INSERT INTO financeiro_orcamentos (tenant_id, obra_id, categoria_id, ano, mes, valor)
  VALUES
    -- Valores com BDI de 15% aplicado (original × 1,15)
    (v_tenant_id, v_obra_id, c01, 2025, 6,    6463.23),  -- 01 Serviços Preliminares   (5.620,20 × 1,15)
    (v_tenant_id, v_obra_id, c02, 2025, 6,   18314.90),  -- 02 Demolições              (15.926,00 × 1,15)
    (v_tenant_id, v_obra_id, c03, 2025, 6,   29719.35),  -- 03 Estruturas e Alvenaria  (25.842,91 × 1,15)
    (v_tenant_id, v_obra_id, c05, 2025, 6,   86646.09),  -- 05 Ar Condicionado         (75.344,43 × 1,15)
    (v_tenant_id, v_obra_id, c06, 2025, 6,   50807.00),  -- 06 Rede / CFTV             (44.180,00 × 1,15)
    (v_tenant_id, v_obra_id, c08, 2025, 6,  126787.50),  -- 08 Instalação Elétrica     (110.250,00 × 1,15)
    (v_tenant_id, v_obra_id, c09, 2025, 6,   78545.00),  -- 09 Hidráulica e Sanitária  (68.300,00 × 1,15)
    (v_tenant_id, v_obra_id, c10, 2025, 6,  210952.32),  -- 10 Pisos e Revestimentos   (183.436,80 × 1,15)
    (v_tenant_id, v_obra_id, c11, 2025, 6,   34410.30),  -- 11 Fechamentos e Forros    (29.922,00 × 1,15)
    (v_tenant_id, v_obra_id, c12, 2025, 6,    3036.00),  -- 12 Impermeabilização       (2.640,00 × 1,15)
    (v_tenant_id, v_obra_id, c13, 2025, 6,  697226.84),  -- 13 Montagem Comercial/Ref. (606.284,21 × 1,15)
    (v_tenant_id, v_obra_id, c14, 2025, 6,   36204.30),  -- 14 Mármore e Granito       (31.482,00 × 1,15)
    (v_tenant_id, v_obra_id, c15, 2025, 6,   67256.92),  -- 15 Pinturas                (58.484,28 × 1,15)
    (v_tenant_id, v_obra_id, c16, 2025, 6,   17896.88),  -- 16 Vidros e Espelhos       (15.562,50 × 1,15)
    (v_tenant_id, v_obra_id, c17, 2025, 6,   76994.64),  -- 17 Serralheria e Mobiliário(66.951,86 × 1,15)
    (v_tenant_id, v_obra_id, c18, 2025, 6,   32602.50),  -- 18 Paisagismo e Comunicação(28.350,00 × 1,15)
    (v_tenant_id, v_obra_id, c19, 2025, 6,   11040.00),  -- 19 Locação de Equipamentos (9.600,00 × 1,15)
    (v_tenant_id, v_obra_id, c20, 2025, 6,  105340.00)   -- 20 Despesas Indiretas/Admin(91.600,00 × 1,15)
  ON CONFLICT (tenant_id, obra_id, categoria_id, ano, mes)
    DO UPDATE SET valor = EXCLUDED.valor, atualizado_em = NOW();

  RAISE NOTICE 'Orçamento inserido com sucesso! Total c/ BDI 15%%: R$ 1.690.243,77 | Valor fechado: R$ 1.690.000,00';
  RAISE NOTICE 'Itens não contemplados no orçamento (zerados): 04-Incêndio, 07-Gás, 21-Impostos';

END $$;
