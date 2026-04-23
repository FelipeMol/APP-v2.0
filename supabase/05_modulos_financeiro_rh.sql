-- ============================================================
-- PATCH 05 — Adicionar módulos Financeiro e RH
-- Execute no Supabase SQL Editor
-- ============================================================

-- Corrige a sequence caso esteja dessincronizada com os dados existentes
SELECT setval(
  pg_get_serial_sequence('modulos', 'id'),
  COALESCE((SELECT MAX(id) FROM modulos), 0) + 1,
  false
);

INSERT INTO modulos (nome, titulo, descricao, icone, ordem, ativo, requer_admin)
VALUES
  ('rh',         'RH',         'Módulo de Recursos Humanos — dados de pessoal e contratos',   'UserCheck', 45, 1, 0),
  ('financeiro', 'Financeiro', 'Contas, lançamentos financeiros e extrato bancário',           'Wallet',    55, 1, 0)
ON CONFLICT (nome) DO UPDATE SET
  titulo       = EXCLUDED.titulo,
  descricao    = EXCLUDED.descricao,
  icone        = EXCLUDED.icone,
  ordem        = EXCLUDED.ordem,
  ativo        = EXCLUDED.ativo,
  requer_admin = EXCLUDED.requer_admin;
