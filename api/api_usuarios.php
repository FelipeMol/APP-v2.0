<?php
require_once __DIR__ . '/config.php';

$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    // ========================================
    // LISTAR USUÁRIOS
    // ========================================
    case 'GET':
        requer_admin(); // Só admin pode gerenciar usuários

        try {
            $stmt = $pdo->query("
                SELECT
                    id, nome, usuario, email, tipo, ativo,
                    primeiro_acesso, ultimo_login,
                    criado_em, atualizado_em
                FROM usuarios
                ORDER BY nome ASC
            ");
            $usuarios = $stmt->fetchAll();

            resposta_json(true, $usuarios);
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao buscar usuários: ' . $e->getMessage());
        }
        break;

    // ========================================
    // CRIAR USUÁRIO
    // ========================================
    case 'POST':
        requer_admin();

        $dados = obter_dados_post();

        // Validações
        if (empty($dados['nome']) || empty($dados['email']) || empty($dados['senha'])) {
            resposta_json(false, null, 'Nome, email e senha são obrigatórios');
        }

        if (!filter_var($dados['email'], FILTER_VALIDATE_EMAIL)) {
            resposta_json(false, null, 'Email inválido');
        }

        if (strlen($dados['senha']) < 6) {
            resposta_json(false, null, 'Senha deve ter no mínimo 6 caracteres');
        }

        try {
            $nome = sanitizar($dados['nome']);
            $usuario = sanitizar($dados['usuario'] ?? strtolower(str_replace(' ', '.', $nome)));
            $email = sanitizar($dados['email']);
            $senha_hash = password_hash($dados['senha'], PASSWORD_BCRYPT);
            $tipo = sanitizar($dados['tipo'] ?? 'usuario');
            $ativo = sanitizar($dados['ativo'] ?? 'Sim');

            // Verificar duplicatas
            $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE usuario = ? OR email = ?");
            $stmt->execute([$usuario, $email]);
            if ($stmt->fetch()) {
                resposta_json(false, null, 'Usuário ou email já existe');
            }

            // Inserir
            $stmt = $pdo->prepare("
                INSERT INTO usuarios
                (nome, usuario, email, senha, tipo, ativo, primeiro_acesso, token_versao)
                VALUES (?, ?, ?, ?, ?, ?, 1, 1)
            ");
            $stmt->execute([$nome, $usuario, $email, $senha_hash, $tipo, $ativo]);

            $id = $pdo->lastInsertId();
            resposta_json(true, ['id' => $id], 'Usuário criado com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao criar usuário: ' . $e->getMessage());
        }
        break;

    // ========================================
    // ATUALIZAR USUÁRIO
    // ========================================
    case 'PUT':
        requer_admin();

        $id = $_GET['id'] ?? null;
        if (!$id) {
            resposta_json(false, null, 'ID do usuário é obrigatório');
        }

        $dados = obter_dados_post();

        try {
            // Verificar se existe
            $stmt = $pdo->prepare("SELECT id, usuario, email FROM usuarios WHERE id = ?");
            $stmt->execute([$id]);
            $usuario_atual = $stmt->fetch();

            if (!$usuario_atual) {
                resposta_json(false, null, 'Usuário não encontrado');
            }

            // Campos atualizáveis
            $nome = sanitizar($dados['nome']);
            $usuario = sanitizar($dados['usuario']);
            $email = sanitizar($dados['email']);
            $tipo = sanitizar($dados['tipo'] ?? 'usuario');
            $ativo = sanitizar($dados['ativo'] ?? 'Sim');

            // Verificar duplicatas (exceto próprio)
            if ($usuario !== $usuario_atual['usuario'] || $email !== $usuario_atual['email']) {
                $stmt = $pdo->prepare("
                    SELECT id FROM usuarios
                    WHERE (usuario = ? OR email = ?) AND id != ?
                ");
                $stmt->execute([$usuario, $email, $id]);
                if ($stmt->fetch()) {
                    resposta_json(false, null, 'Usuário ou email já existe');
                }
            }

            // Atualizar
            $sql = "UPDATE usuarios SET nome=?, usuario=?, email=?, tipo=?, ativo=?";
            $params = [$nome, $usuario, $email, $tipo, $ativo];

            // Se enviou senha nova, atualizar também
            if (!empty($dados['senha'])) {
                if (strlen($dados['senha']) < 6) {
                    resposta_json(false, null, 'Senha deve ter no mínimo 6 caracteres');
                }
                $senha_hash = password_hash($dados['senha'], PASSWORD_BCRYPT);
                $sql .= ", senha=?, token_versao=token_versao+1";
                $params[] = $senha_hash;
            }

            $sql .= " WHERE id=?";
            $params[] = $id;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            resposta_json(true, ['id' => $id], 'Usuário atualizado com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao atualizar usuário: ' . $e->getMessage());
        }
        break;

    // ========================================
    // DELETAR USUÁRIO
    // ========================================
    case 'DELETE':
        requer_admin();

        $id = $_GET['id'] ?? null;
        if (!$id) {
            resposta_json(false, null, 'ID do usuário é obrigatório');
        }

        try {
            // Verificar se existe
            $stmt = $pdo->prepare("SELECT tipo FROM usuarios WHERE id = ?");
            $stmt->execute([$id]);
            $usuario = $stmt->fetch();

            if (!$usuario) {
                resposta_json(false, null, 'Usuário não encontrado');
            }

            // Não permitir deletar admin principal (id=1)
            if ($id == 1) {
                resposta_json(false, null, 'Não é possível deletar o administrador principal');
            }

            // Deletar (CASCADE remove permissões automaticamente)
            $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id = ?");
            $stmt->execute([$id]);

            resposta_json(true, null, 'Usuário excluído com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao excluir usuário: ' . $e->getMessage());
        }
        break;

    default:
        resposta_json(false, null, 'Método não permitido');
}
