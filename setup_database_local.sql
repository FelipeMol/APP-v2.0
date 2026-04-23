-- ========================================
-- SETUP COMPLETO BANCO DE DADOS LOCAL
-- Sistema Controle de Obras v2.0
-- Data: 2025-12-18
-- ========================================

-- 1. CRIAR BANCO DE DADOS LOCAL
CREATE DATABASE IF NOT EXISTS controle_obras_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE controle_obras_dev;

-- ========================================
-- 2. TABELAS PRINCIPAIS
-- ========================================

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    usuario VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    senha VARCHAR(255) NOT NULL,
    tipo ENUM('admin', 'usuario') DEFAULT 'usuario',
    ativo ENUM('Sim', 'Não') DEFAULT 'Sim',
    token_versao INT DEFAULT 1,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_usuario (usuario),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de empresas
CREATE TABLE IF NOT EXISTS empresas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20),
    tipo ENUM('Construtora', 'Serviços', 'SPE') DEFAULT 'Construtora',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nome_empresa (nome),
    INDEX idx_cnpj (cnpj)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de obras
CREATE TABLE IF NOT EXISTS obras (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    responsavel VARCHAR(255),
    cidade VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nome_obra (nome),
    INDEX idx_cidade (cidade)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de funcionários
CREATE TABLE IF NOT EXISTS funcionarios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    funcao VARCHAR(255),
    empresa VARCHAR(255),
    situacao ENUM('Ativo', 'Inativo') DEFAULT 'Ativo',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nome_funcionario (nome),
    INDEX idx_empresa_funcionario (empresa),
    INDEX idx_situacao (situacao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de lançamentos
CREATE TABLE IF NOT EXISTS lancamentos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    data DATE NOT NULL,
    funcionario VARCHAR(255) NOT NULL,
    funcao VARCHAR(255),
    empresa VARCHAR(255),
    obra VARCHAR(255),
    horas TIME DEFAULT '08:00:00',
    diarias DECIMAL(3,1) DEFAULT 1.0,
    observacao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_data (data),
    INDEX idx_funcionario_lancamento (funcionario),
    INDEX idx_obra_lancamento (obra),
    INDEX idx_empresa_lancamento (empresa),
    INDEX idx_data_funcionario (data, funcionario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de avaliações
CREATE TABLE IF NOT EXISTS avaliacoes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    funcionario_id BIGINT NOT NULL,
    funcionario_nome VARCHAR(255) NOT NULL,
    data_avaliacao DATE NOT NULL,
    pontualidade INT DEFAULT 0,
    qualidade INT DEFAULT 0,
    trabalho_equipe INT DEFAULT 0,
    iniciativa INT DEFAULT 0,
    conhecimento_tecnico INT DEFAULT 0,
    capacidade_aprendizado INT DEFAULT 0,
    observacoes TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_funcionario_avaliacao (funcionario_id),
    INDEX idx_data_avaliacao (data_avaliacao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de funções (cargos padrão)
CREATE TABLE IF NOT EXISTS funcoes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE,
    descricao TEXT,
    ativo ENUM('Sim', 'Não') DEFAULT 'Sim',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nome_funcao (nome),
    INDEX idx_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de responsáveis (gestores de obras)
CREATE TABLE IF NOT EXISTS responsaveis (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cargo VARCHAR(255),
    telefone VARCHAR(20),
    email VARCHAR(255),
    ativo ENUM('Sim', 'Não') DEFAULT 'Sim',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nome_responsavel (nome),
    INDEX idx_ativo_responsavel (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 3. TABELAS DO SISTEMA DE AUTENTICAÇÃO
-- ========================================

-- Tabela de módulos (para sistema de permissões)
CREATE TABLE IF NOT EXISTS modulos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    titulo VARCHAR(100),
    titulo_menu VARCHAR(100),
    descricao VARCHAR(255),
    icone VARCHAR(50),
    ordem INT DEFAULT 0,
    ativo TINYINT(1) DEFAULT 1,
    requer_admin TINYINT(1) DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nome_modulo (nome),
    INDEX idx_ordem (ordem),
    INDEX idx_ativo_modulo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir módulos iniciais do sistema
INSERT INTO modulos (nome, titulo, titulo_menu, descricao, icone, ordem, ativo, requer_admin) VALUES
-- Dashboard (todos podem ter)
('dashboard', 'Dashboard', 'Dashboard', 'Painel principal com visão geral do sistema', 'LayoutDashboard', 1, 1, 0),

-- Lançamentos (módulo principal)
('lancamentos', 'Lançamentos', 'Lançamentos', 'Controle de lançamentos financeiros e operacionais', 'FileText', 2, 1, 0),

-- Cadastros
('funcionarios', 'Funcionários', 'Funcionários', 'Cadastro e gestão de funcionários', 'Users', 10, 1, 0),
('funcoes', 'Funções', 'Funções', 'Cadastro de funções e cargos', 'Briefcase', 11, 1, 0),
('obras', 'Obras', 'Obras', 'Cadastro e controle de obras', 'Building2', 12, 1, 0),
('empresas', 'Empresas', 'Empresas', 'Cadastro de empresas', 'Building', 13, 1, 0),

-- Avaliações
('avaliacoes', 'Avaliações', 'Avaliações', 'Sistema de avaliações e feedback', 'ClipboardCheck', 20, 1, 0),

-- BASE (Banco de Atividades e Sistema de Eventos)
('base', 'BASE', 'BASE', 'Banco de Atividades e Sistema de Eventos', 'Database', 30, 1, 0),

-- Tarefas (Kanban)
('tarefas', 'Tarefas', 'Tarefas', 'Gerenciamento de tarefas em formato Kanban', 'CheckSquare', 40, 1, 0),

-- Relatórios
('relatorios', 'Relatórios', 'Relatórios', 'Relatórios gerenciais e operacionais', 'BarChart3', 50, 1, 0),

-- Administração (apenas admin)
('usuarios', 'Usuários', 'Usuários', 'Gerenciamento de usuários do sistema', 'UserCog', 100, 1, 1),
('permissoes', 'Matriz de Permissões', 'Permissões', 'Controle de permissões por usuário e módulo', 'Shield', 101, 1, 1)
ON DUPLICATE KEY UPDATE
    titulo = VALUES(titulo),
    titulo_menu = VALUES(titulo_menu),
    descricao = VALUES(descricao),
    icone = VALUES(icone),
    ordem = VALUES(ordem),
    ativo = VALUES(ativo),
    requer_admin = VALUES(requer_admin);

-- Tabela de permissões
CREATE TABLE IF NOT EXISTS permissoes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    modulo_id BIGINT NOT NULL,
    pode_visualizar TINYINT(1) DEFAULT 0,
    pode_criar TINYINT(1) DEFAULT 0,
    pode_editar TINYINT(1) DEFAULT 0,
    pode_excluir TINYINT(1) DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_usuario_modulo (usuario_id, modulo_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (modulo_id) REFERENCES modulos(id) ON DELETE CASCADE,
    INDEX idx_usuario_permissao (usuario_id),
    INDEX idx_modulo_permissao (modulo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 4. TABELAS DO SISTEMA DE TAREFAS (KANBAN)
-- ========================================

-- Tabela de tarefas
CREATE TABLE IF NOT EXISTS tarefas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    status ENUM('A Fazer', 'Em Progresso', 'Concluído', 'Cancelado') DEFAULT 'A Fazer',
    prioridade ENUM('Baixa', 'Média', 'Alta', 'Urgente') DEFAULT 'Média',
    data_inicio DATE,
    data_fim DATE,
    usuario_responsavel_id BIGINT,
    criado_por_id BIGINT,
    ordem INT DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_responsavel_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (criado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_prioridade (prioridade),
    INDEX idx_responsavel (usuario_responsavel_id),
    INDEX idx_criado_por (criado_por_id),
    INDEX idx_ordem (ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de etiquetas (labels/tags)
CREATE TABLE IF NOT EXISTS tarefa_etiquetas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE,
    cor VARCHAR(20) DEFAULT '#3B82F6',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nome_etiqueta (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Relacionamento tarefa-etiqueta
CREATE TABLE IF NOT EXISTS tarefa_etiqueta_rel (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tarefa_id BIGINT NOT NULL,
    etiqueta_id BIGINT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE,
    FOREIGN KEY (etiqueta_id) REFERENCES tarefa_etiquetas(id) ON DELETE CASCADE,
    UNIQUE KEY unique_tarefa_etiqueta (tarefa_id, etiqueta_id),
    INDEX idx_tarefa_etiqueta (tarefa_id),
    INDEX idx_etiqueta (etiqueta_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de membros da tarefa
CREATE TABLE IF NOT EXISTS tarefa_membros (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tarefa_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    papel VARCHAR(50) DEFAULT 'Membro',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_tarefa_usuario (tarefa_id, usuario_id),
    INDEX idx_tarefa_membro (tarefa_id),
    INDEX idx_usuario_membro (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de comentários
CREATE TABLE IF NOT EXISTS tarefa_comentarios (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tarefa_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    comentario TEXT NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    INDEX idx_tarefa_comentario (tarefa_id),
    INDEX idx_usuario_comentario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de checklists
CREATE TABLE IF NOT EXISTS tarefa_checklists (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tarefa_id BIGINT NOT NULL,
    texto VARCHAR(255) NOT NULL,
    concluido TINYINT(1) DEFAULT 0,
    ordem INT DEFAULT 0,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE,
    INDEX idx_tarefa_checklist (tarefa_id),
    INDEX idx_ordem_checklist (ordem)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de anexos
CREATE TABLE IF NOT EXISTS tarefa_anexos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tarefa_id BIGINT NOT NULL,
    usuario_id BIGINT,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo VARCHAR(500) NOT NULL,
    tamanho_bytes BIGINT,
    tipo_mime VARCHAR(100),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tarefa_anexo (tarefa_id),
    INDEX idx_usuario_anexo (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de atividades (timeline)
CREATE TABLE IF NOT EXISTS tarefa_atividades (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tarefa_id BIGINT NOT NULL,
    usuario_id BIGINT,
    tipo_atividade VARCHAR(50) NOT NULL,
    descricao TEXT,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX idx_tarefa_atividade (tarefa_id),
    INDEX idx_tipo_atividade (tipo_atividade)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 5. DADOS INICIAIS
-- ========================================

-- Usuário administrador (senha hash BCrypt de "admin123")
-- NOTA: Em produção, a senha será hasheada com password_hash()
INSERT IGNORE INTO usuarios (nome, usuario, email, senha, tipo, ativo, token_versao) VALUES
('Administrador', 'admin', 'admin@controleobras.local', 'admin123', 'admin', 'Sim', 1);

-- Usuário de teste comum
INSERT IGNORE INTO usuarios (nome, usuario, email, senha, tipo, ativo, token_versao) VALUES
('Usuário Teste', 'usuario', 'usuario@controleobras.local', 'usuario123', 'usuario', 'Sim', 1);

-- Módulos do sistema
INSERT IGNORE INTO modulos (nome, descricao, icone, ordem, ativo) VALUES
('dashboard', 'Dashboard', 'LayoutDashboard', 1, 1),
('lancamentos', 'Lançamentos', 'FileText', 2, 1),
('funcionarios', 'Funcionários', 'Users', 3, 1),
('obras', 'Obras', 'Building', 4, 1),
('empresas', 'Empresas', 'Briefcase', 5, 1),
('avaliacoes', 'Avaliações', 'Star', 6, 1),
('projetos', 'Projetos', 'FolderKanban', 7, 1),
('usuarios', 'Usuários', 'UserCog', 8, 1),
('base', 'BASE', 'Database', 9, 1),
('tarefas', 'Tarefas', 'CheckSquare', 10, 1),
('relatorios', 'Relatórios', 'BarChart3', 11, 1),
('permissoes', 'Permissões', 'Shield', 12, 1);

-- Funções padrão da construção civil
INSERT IGNORE INTO funcoes (nome, descricao, ativo) VALUES
('Pedreiro', 'Profissional especializado em alvenaria e construção', 'Sim'),
('Servente', 'Auxiliar de obras e serviços gerais', 'Sim'),
('Armador', 'Especialista em montagem de ferragens', 'Sim'),
('Carpinteiro', 'Profissional de formas e estruturas de madeira', 'Sim'),
('Eletricista', 'Instalações elétricas prediais', 'Sim'),
('Encanador', 'Instalações hidráulicas e sanitárias', 'Sim'),
('Pintor', 'Acabamentos e pintura predial', 'Sim'),
('Mestre de Obras', 'Coordenador de equipes e serviços', 'Sim'),
('Engenheiro', 'Responsável técnico pela obra', 'Sim'),
('Motorista', 'Transporte e logística', 'Sim'),
('Operador de Máquinas', 'Operação de equipamentos pesados', 'Sim'),
('Ajudante Geral', 'Auxiliar em diversas funções', 'Sim');

-- Etiquetas padrão para tarefas
INSERT IGNORE INTO tarefa_etiquetas (nome, cor) VALUES
('Bug', '#EF4444'),
('Feature', '#3B82F6'),
('Urgente', '#F59E0B'),
('Documentação', '#8B5CF6'),
('Manutenção', '#10B981');

-- Permissões totais para o admin (usuário id=1) em todos os módulos
INSERT IGNORE INTO permissoes (usuario_id, modulo_id, pode_visualizar, pode_criar, pode_editar, pode_excluir)
SELECT 1, id, 1, 1, 1, 1 FROM modulos;

-- Permissões limitadas para usuário comum (id=2) - apenas visualizar alguns módulos
INSERT IGNORE INTO permissoes (usuario_id, modulo_id, pode_visualizar, pode_criar, pode_editar, pode_excluir)
SELECT 2, id, 1, 0, 0, 0 FROM modulos WHERE nome IN ('dashboard', 'lancamentos', 'tarefas');

-- ========================================
-- ADICIONAR FOREIGN KEYS (APÓS TODAS AS TABELAS)
-- ========================================

-- Foreign keys da tabela tarefa_anexos
ALTER TABLE tarefa_anexos
ADD CONSTRAINT fk_tarefa_anexos_tarefa
    FOREIGN KEY (tarefa_id) REFERENCES tarefas(id) ON DELETE CASCADE;

ALTER TABLE tarefa_anexos
ADD CONSTRAINT fk_tarefa_anexos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- ========================================
-- 6. DADOS DE EXEMPLO (OPCIONAL)
-- ========================================

-- Empresas exemplo
INSERT IGNORE INTO empresas (nome, cnpj, tipo) VALUES
('Construtora Silva LTDA', '12.345.678/0001-90', 'Construtora'),
('Serviços de Engenharia Costa', '98.765.432/0001-10', 'Serviços'),
('SPE Residencial Jardim', '11.222.333/0001-44', 'SPE');

-- Obras exemplo
INSERT IGNORE INTO obras (nome, responsavel, cidade) VALUES
('Edifício Residencial Jardins', 'João Silva', 'São Paulo'),
('Reforma Shopping Center', 'Maria Santos', 'Rio de Janeiro'),
('Condomínio Parque das Flores', 'Pedro Costa', 'Belo Horizonte');

-- Funcionários exemplo
INSERT IGNORE INTO funcionarios (nome, funcao, empresa, situacao) VALUES
('Carlos Pereira', 'Pedreiro', 'Construtora Silva LTDA', 'Ativo'),
('José Santos', 'Servente', 'Construtora Silva LTDA', 'Ativo'),
('Ana Costa', 'Engenheiro', 'Serviços de Engenharia Costa', 'Ativo'),
('Paulo Oliveira', 'Mestre de Obras', 'Construtora Silva LTDA', 'Ativo');

-- ========================================
-- 7. VERIFICAÇÃO FINAL
-- ========================================

SELECT 'Setup completo! Banco de dados criado com sucesso.' as Status;

SELECT
    TABLE_NAME as 'Tabelas Criadas',
    TABLE_ROWS as 'Registros'
FROM
    INFORMATION_SCHEMA.TABLES
WHERE
    TABLE_SCHEMA = 'controle_obras_dev'
ORDER BY TABLE_NAME;
