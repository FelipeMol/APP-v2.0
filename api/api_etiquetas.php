<?php
/**
 * API REST: Etiquetas (Tags)
 *
 * Gerencia etiquetas coloridas para organização de tarefas
 * Endpoints: GET, POST, PUT, DELETE
 */

require_once __DIR__ . '/config.php';

// Middleware de autenticação
requer_autenticacao();

$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    case 'GET':
        // Listar todas as etiquetas
        requer_permissao('tarefas', 'visualizar');

        try {
            $stmt = $pdo->query("
                SELECT
                    e.*,
                    (SELECT COUNT(*) FROM tarefas_etiquetas te WHERE te.etiqueta_id = e.id) as total_usos
                FROM etiquetas e
                ORDER BY e.nome ASC
            ");
            $etiquetas = $stmt->fetchAll();
            resposta_json(true, $etiquetas);
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao buscar etiquetas: ' . $e->getMessage());
        }
        break;

    case 'POST':
        // Criar nova etiqueta
        requer_permissao('tarefas', 'criar');
        $dados = obter_dados_post();

        // Validações
        if (empty($dados['nome'])) {
            resposta_json(false, null, 'Nome da etiqueta é obrigatório');
        }

        if (empty($dados['cor'])) {
            resposta_json(false, null, 'Cor da etiqueta é obrigatória');
        }

        // Validar formato de cor hex
        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $dados['cor'])) {
            resposta_json(false, null, 'Cor inválida. Use formato hexadecimal (#RRGGBB)');
        }

        try {
            $nome = sanitizar($dados['nome']);
            $cor = sanitizar($dados['cor']);

            // Verificar se já existe etiqueta com mesmo nome
            $stmt = $pdo->prepare("SELECT id FROM etiquetas WHERE nome = ?");
            $stmt->execute([$nome]);

            if ($stmt->fetch()) {
                resposta_json(false, null, 'Já existe uma etiqueta com este nome');
            }

            // Inserir etiqueta
            $stmt = $pdo->prepare("
                INSERT INTO etiquetas (nome, cor, criado_em)
                VALUES (?, ?, NOW())
            ");
            $stmt->execute([$nome, $cor]);

            $id = $pdo->lastInsertId();

            // Retornar etiqueta criada
            $stmt = $pdo->prepare("SELECT * FROM etiquetas WHERE id = ?");
            $stmt->execute([$id]);
            $etiqueta = $stmt->fetch();

            resposta_json(true, $etiqueta, 'Etiqueta criada com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao criar etiqueta: ' . $e->getMessage());
        }
        break;

    case 'PUT':
        // Atualizar etiqueta existente
        requer_permissao('tarefas', 'editar');
        $dados = obter_dados_post();

        if (empty($_GET['id'])) {
            resposta_json(false, null, 'ID da etiqueta é obrigatório');
        }

        $id = intval($_GET['id']);

        // Validações
        if (empty($dados['nome'])) {
            resposta_json(false, null, 'Nome da etiqueta é obrigatório');
        }

        if (empty($dados['cor'])) {
            resposta_json(false, null, 'Cor da etiqueta é obrigatória');
        }

        // Validar formato de cor hex
        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $dados['cor'])) {
            resposta_json(false, null, 'Cor inválida. Use formato hexadecimal (#RRGGBB)');
        }

        try {
            $nome = sanitizar($dados['nome']);
            $cor = sanitizar($dados['cor']);

            // Verificar se etiqueta existe
            $stmt = $pdo->prepare("SELECT id FROM etiquetas WHERE id = ?");
            $stmt->execute([$id]);

            if (!$stmt->fetch()) {
                resposta_json(false, null, 'Etiqueta não encontrada');
            }

            // Verificar se já existe outra etiqueta com mesmo nome
            $stmt = $pdo->prepare("SELECT id FROM etiquetas WHERE nome = ? AND id != ?");
            $stmt->execute([$nome, $id]);

            if ($stmt->fetch()) {
                resposta_json(false, null, 'Já existe outra etiqueta com este nome');
            }

            // Atualizar etiqueta
            $stmt = $pdo->prepare("
                UPDATE etiquetas
                SET nome = ?, cor = ?
                WHERE id = ?
            ");
            $stmt->execute([$nome, $cor, $id]);

            // Retornar etiqueta atualizada
            $stmt = $pdo->prepare("SELECT * FROM etiquetas WHERE id = ?");
            $stmt->execute([$id]);
            $etiqueta = $stmt->fetch();

            resposta_json(true, $etiqueta, 'Etiqueta atualizada com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao atualizar etiqueta: ' . $e->getMessage());
        }
        break;

    case 'DELETE':
        // Excluir etiqueta
        requer_permissao('tarefas', 'excluir');

        if (empty($_GET['id'])) {
            resposta_json(false, null, 'ID da etiqueta é obrigatório');
        }

        $id = intval($_GET['id']);

        try {
            // Verificar se etiqueta existe
            $stmt = $pdo->prepare("SELECT id, nome FROM etiquetas WHERE id = ?");
            $stmt->execute([$id]);
            $etiqueta = $stmt->fetch();

            if (!$etiqueta) {
                resposta_json(false, null, 'Etiqueta não encontrada');
            }

            // Verificar quantas tarefas usam essa etiqueta
            $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM tarefas_etiquetas WHERE etiqueta_id = ?");
            $stmt->execute([$id]);
            $resultado = $stmt->fetch();
            $total_usos = $resultado['total'];

            // Excluir etiqueta (CASCADE vai remover associações automaticamente)
            $stmt = $pdo->prepare("DELETE FROM etiquetas WHERE id = ?");
            $stmt->execute([$id]);

            resposta_json(true, [
                'id' => $id,
                'total_tarefas_afetadas' => $total_usos
            ], 'Etiqueta excluída com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao excluir etiqueta: ' . $e->getMessage());
        }
        break;

    default:
        resposta_json(false, null, 'Método HTTP não suportado');
        break;
}
