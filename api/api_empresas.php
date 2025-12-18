<?php
require_once __DIR__ . '/config.php';

// Middleware de autenticação
requer_autenticacao();

$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    case 'GET':
        requer_permissao('empresas', 'visualizar');

        try {
            $stmt = $pdo->query("SELECT * FROM empresas ORDER BY nome ASC");
            $empresas = $stmt->fetchAll();
            resposta_json(true, $empresas);
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao buscar empresas: ' . $e->getMessage());
        }
        break;

    case 'POST':
        requer_permissao('empresas', 'criar');
        $dados = obter_dados_post();

        if (empty($dados['nome'])) {
            resposta_json(false, null, 'Nome da empresa é obrigatório');
        }

        try {
            $nome = sanitizar($dados['nome']);
            $cnpj = sanitizar($dados['cnpj'] ?? '');
            $tipo = sanitizar($dados['tipo'] ?? 'Construtora');

            $stmt = $pdo->prepare("SELECT id FROM empresas WHERE nome = ?");
            $stmt->execute([$nome]);

            if ($stmt->fetch()) {
                resposta_json(false, null, 'Empresa com este nome já existe');
            }

            $stmt = $pdo->prepare("INSERT INTO empresas (nome, cnpj, tipo, criado_em) VALUES (?, ?, ?, NOW())");
            $stmt->execute([$nome, $cnpj, $tipo]);

            $id = $pdo->lastInsertId();
            resposta_json(true, ['id' => $id], 'Empresa adicionada com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao salvar empresa: ' . $e->getMessage());
        }
        break;

    case 'PUT':
        requer_permissao('empresas', 'editar');

        $id = $_GET['id'] ?? null;

        if (!$id) {
            resposta_json(false, null, 'ID da empresa é obrigatório');
        }

        $dados = obter_dados_post();

        if (empty($dados['nome'])) {
            resposta_json(false, null, 'Nome da empresa é obrigatório');
        }

        try {
            // Verificar se empresa existe
            $stmt = $pdo->prepare("SELECT nome FROM empresas WHERE id = ?");
            $stmt->execute([$id]);
            $empresaAtual = $stmt->fetch();

            if (!$empresaAtual) {
                resposta_json(false, null, 'Empresa não encontrada');
            }

            $nome = sanitizar($dados['nome']);
            $cnpj = sanitizar($dados['cnpj'] ?? '');
            $tipo = sanitizar($dados['tipo'] ?? 'Construtora');

            // Verificar se novo nome já existe (exceto se for o mesmo)
            if ($nome !== $empresaAtual['nome']) {
                $stmt = $pdo->prepare("SELECT id FROM empresas WHERE nome = ? AND id != ?");
                $stmt->execute([$nome, $id]);

                if ($stmt->fetch()) {
                    resposta_json(false, null, 'Já existe outra empresa com este nome');
                }
            }

            // Atualizar empresa
            $stmt = $pdo->prepare("UPDATE empresas SET nome = ?, cnpj = ?, tipo = ? WHERE id = ?");
            $stmt->execute([$nome, $cnpj, $tipo, $id]);

            // Se nome mudou, atualizar referências em funcionários
            if ($nome !== $empresaAtual['nome']) {
                $stmt = $pdo->prepare("UPDATE funcionarios SET empresa = ? WHERE empresa = ?");
                $stmt->execute([$nome, $empresaAtual['nome']]);

                $stmt = $pdo->prepare("UPDATE lancamentos SET empresa = ? WHERE empresa = ?");
                $stmt->execute([$nome, $empresaAtual['nome']]);
            }

            resposta_json(true, null, 'Empresa atualizada com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao atualizar empresa: ' . $e->getMessage());
        }
        break;

    case 'DELETE':
        requer_permissao('empresas', 'excluir');

        $id = $_GET['id'] ?? null;

        if (!$id) {
            resposta_json(false, null, 'ID da empresa é obrigatório');
        }

        try {
            $stmt = $pdo->prepare("SELECT nome FROM empresas WHERE id = ?");
            $stmt->execute([$id]);
            $empresa = $stmt->fetch();

            if (!$empresa) {
                resposta_json(false, null, 'Empresa não encontrada');
            }

            $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM funcionarios WHERE empresa = ?");
            $stmt->execute([$empresa['nome']]);
            $count = $stmt->fetch()['total'];

            if ($count > 0) {
                resposta_json(false, null, 'Não é possível excluir empresa com funcionários vinculados');
            }

            $stmt = $pdo->prepare("DELETE FROM empresas WHERE id = ?");
            $stmt->execute([$id]);

            resposta_json(true, null, 'Empresa excluída com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao excluir empresa: ' . $e->getMessage());
        }
        break;

    default:
        resposta_json(false, null, 'Método não permitido');
}
// Sem tag de fechamento para evitar espaços/BOM que quebram JSON/headers
