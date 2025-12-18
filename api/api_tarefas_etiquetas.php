<?php
/**
 * API REST: Tarefas <-> Etiquetas (Relacionamento N:N)
 *
 * Gerencia associação de etiquetas com tarefas
 * Endpoints: GET, POST, DELETE
 */

require_once __DIR__ . '/config.php';

// Middleware de autenticação
requer_autenticacao();

$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    case 'GET':
        // Listar etiquetas de uma tarefa
        requer_permissao('tarefas', 'visualizar');

        if (empty($_GET['tarefa_id'])) {
            resposta_json(false, null, 'ID da tarefa é obrigatório');
        }

        $tarefa_id = intval($_GET['tarefa_id']);

        try {
            // Verificar se tarefa existe e se usuário tem permissão
            $usuario = obter_usuario_autenticado();
            $stmt = $pdo->prepare("SELECT id FROM tarefas WHERE id = ?");
            $stmt->execute([$tarefa_id]);

            if (!$stmt->fetch()) {
                resposta_json(false, null, 'Tarefa não encontrada');
            }

            // Buscar etiquetas da tarefa
            $stmt = $pdo->prepare("
                SELECT
                    te.id as associacao_id,
                    e.id,
                    e.nome,
                    e.cor,
                    te.criado_em as adicionado_em
                FROM tarefas_etiquetas te
                INNER JOIN etiquetas e ON te.etiqueta_id = e.id
                WHERE te.tarefa_id = ?
                ORDER BY e.nome ASC
            ");
            $stmt->execute([$tarefa_id]);
            $etiquetas = $stmt->fetchAll();

            resposta_json(true, $etiquetas);

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao buscar etiquetas da tarefa: ' . $e->getMessage());
        }
        break;

    case 'POST':
        // Adicionar etiqueta a uma tarefa
        requer_permissao('tarefas', 'editar');
        $dados = obter_dados_post();

        // Validações
        if (empty($dados['tarefa_id'])) {
            resposta_json(false, null, 'ID da tarefa é obrigatório');
        }

        if (empty($dados['etiqueta_id'])) {
            resposta_json(false, null, 'ID da etiqueta é obrigatório');
        }

        $tarefa_id = intval($dados['tarefa_id']);
        $etiqueta_id = intval($dados['etiqueta_id']);

        try {
            // Verificar se tarefa existe
            $stmt = $pdo->prepare("SELECT id FROM tarefas WHERE id = ?");
            $stmt->execute([$tarefa_id]);

            if (!$stmt->fetch()) {
                resposta_json(false, null, 'Tarefa não encontrada');
            }

            // Verificar se etiqueta existe
            $stmt = $pdo->prepare("SELECT id, nome, cor FROM etiquetas WHERE id = ?");
            $stmt->execute([$etiqueta_id]);
            $etiqueta = $stmt->fetch();

            if (!$etiqueta) {
                resposta_json(false, null, 'Etiqueta não encontrada');
            }

            // Verificar se associação já existe
            $stmt = $pdo->prepare("
                SELECT id FROM tarefas_etiquetas
                WHERE tarefa_id = ? AND etiqueta_id = ?
            ");
            $stmt->execute([$tarefa_id, $etiqueta_id]);

            if ($stmt->fetch()) {
                resposta_json(false, null, 'Esta etiqueta já está associada à tarefa');
            }

            // Criar associação
            $stmt = $pdo->prepare("
                INSERT INTO tarefas_etiquetas (tarefa_id, etiqueta_id, criado_em)
                VALUES (?, ?, NOW())
            ");
            $stmt->execute([$tarefa_id, $etiqueta_id]);

            $id = $pdo->lastInsertId();

            // Registrar atividade
            $usuario = obter_usuario_autenticado();
            $stmt = $pdo->prepare("
                INSERT INTO tarefas_atividades (tarefa_id, usuario_id, acao, descricao, criado_em)
                VALUES (?, ?, 'etiqueta_adicionada', ?, NOW())
            ");
            $stmt->execute([
                $tarefa_id,
                $usuario['id'],
                "Adicionou a etiqueta '{$etiqueta['nome']}'"
            ]);

            resposta_json(true, [
                'id' => $id,
                'etiqueta' => $etiqueta
            ], 'Etiqueta adicionada à tarefa com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao adicionar etiqueta à tarefa: ' . $e->getMessage());
        }
        break;

    case 'DELETE':
        // Remover etiqueta de uma tarefa
        requer_permissao('tarefas', 'editar');

        if (empty($_GET['id'])) {
            resposta_json(false, null, 'ID da associação é obrigatório');
        }

        $id = intval($_GET['id']);

        try {
            // Buscar associação antes de excluir (para registro de atividade)
            $stmt = $pdo->prepare("
                SELECT te.tarefa_id, e.nome as etiqueta_nome
                FROM tarefas_etiquetas te
                INNER JOIN etiquetas e ON te.etiqueta_id = e.id
                WHERE te.id = ?
            ");
            $stmt->execute([$id]);
            $associacao = $stmt->fetch();

            if (!$associacao) {
                resposta_json(false, null, 'Associação não encontrada');
            }

            // Excluir associação
            $stmt = $pdo->prepare("DELETE FROM tarefas_etiquetas WHERE id = ?");
            $stmt->execute([$id]);

            // Registrar atividade
            $usuario = obter_usuario_autenticado();
            $stmt = $pdo->prepare("
                INSERT INTO tarefas_atividades (tarefa_id, usuario_id, acao, descricao, criado_em)
                VALUES (?, ?, 'etiqueta_removida', ?, NOW())
            ");
            $stmt->execute([
                $associacao['tarefa_id'],
                $usuario['id'],
                "Removeu a etiqueta '{$associacao['etiqueta_nome']}'"
            ]);

            resposta_json(true, ['id' => $id], 'Etiqueta removida da tarefa com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao remover etiqueta da tarefa: ' . $e->getMessage());
        }
        break;

    default:
        resposta_json(false, null, 'Método HTTP não suportado');
        break;
}
