<?php
/**
 * API REST: Checklist de Tarefas (Subtarefas)
 *
 * Gerencia items de checklist dentro de tarefas
 * Endpoints: GET, POST, PUT, DELETE
 */

require_once __DIR__ . '/config.php';

// Middleware de autenticação
requer_autenticacao();

$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    case 'GET':
        // Listar items de checklist de uma tarefa
        requer_permissao('tarefas', 'visualizar');

        if (empty($_GET['tarefa_id'])) {
            resposta_json(false, null, 'ID da tarefa é obrigatório');
        }

        $tarefa_id = intval($_GET['tarefa_id']);

        try {
            // Verificar se tarefa existe
            $stmt = $pdo->prepare("SELECT id FROM tarefas WHERE id = ?");
            $stmt->execute([$tarefa_id]);

            if (!$stmt->fetch()) {
                resposta_json(false, null, 'Tarefa não encontrada');
            }

            // Buscar checklist items
            $stmt = $pdo->prepare("
                SELECT
                    id,
                    tarefa_id,
                    titulo,
                    concluido,
                    ordem,
                    criado_em,
                    atualizado_em
                FROM tarefas_checklists
                WHERE tarefa_id = ?
                ORDER BY ordem ASC, id ASC
            ");
            $stmt->execute([$tarefa_id]);
            $items = $stmt->fetchAll();

            // Calcular estatísticas
            $total = count($items);
            $concluidos = count(array_filter($items, function($item) {
                return $item['concluido'] == 1;
            }));

            resposta_json(true, [
                'items' => $items,
                'total' => $total,
                'concluidos' => $concluidos,
                'progresso' => $total > 0 ? round(($concluidos / $total) * 100) : 0
            ]);

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao buscar checklist: ' . $e->getMessage());
        }
        break;

    case 'POST':
        // Criar novo item de checklist
        requer_permissao('tarefas', 'editar');
        $dados = obter_dados_post();

        // Validações
        if (empty($dados['tarefa_id'])) {
            resposta_json(false, null, 'ID da tarefa é obrigatório');
        }

        if (empty($dados['titulo'])) {
            resposta_json(false, null, 'Título do item é obrigatório');
        }

        $tarefa_id = intval($dados['tarefa_id']);
        $titulo = sanitizar($dados['titulo']);
        $ordem = isset($dados['ordem']) ? intval($dados['ordem']) : 0;

        try {
            // Verificar se tarefa existe
            $stmt = $pdo->prepare("SELECT id FROM tarefas WHERE id = ?");
            $stmt->execute([$tarefa_id]);

            if (!$stmt->fetch()) {
                resposta_json(false, null, 'Tarefa não encontrada');
            }

            // Se ordem não foi especificada, pegar a próxima posição
            if ($ordem === 0) {
                $stmt = $pdo->prepare("SELECT COALESCE(MAX(ordem), 0) + 1 as proxima_ordem FROM tarefas_checklists WHERE tarefa_id = ?");
                $stmt->execute([$tarefa_id]);
                $resultado = $stmt->fetch();
                $ordem = $resultado['proxima_ordem'];
            }

            // Inserir item
            $stmt = $pdo->prepare("
                INSERT INTO tarefas_checklists (tarefa_id, titulo, concluido, ordem, criado_em)
                VALUES (?, ?, FALSE, ?, NOW())
            ");
            $stmt->execute([$tarefa_id, $titulo, $ordem]);

            $id = $pdo->lastInsertId();

            // Buscar item criado
            $stmt = $pdo->prepare("SELECT * FROM tarefas_checklists WHERE id = ?");
            $stmt->execute([$id]);
            $item = $stmt->fetch();

            // Registrar atividade
            $usuario = obter_usuario_autenticado();
            $stmt = $pdo->prepare("
                INSERT INTO tarefas_atividades (tarefa_id, usuario_id, acao, descricao, criado_em)
                VALUES (?, ?, 'checklist_item_adicionado', ?, NOW())
            ");
            $stmt->execute([
                $tarefa_id,
                $usuario['id'],
                "Adicionou item ao checklist: '{$titulo}'"
            ]);

            resposta_json(true, $item, 'Item adicionado ao checklist com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao adicionar item: ' . $e->getMessage());
        }
        break;

    case 'PUT':
        // Atualizar item de checklist (toggle concluído, renomear, reordenar)
        requer_permissao('tarefas', 'editar');
        $dados = obter_dados_post();

        if (empty($_GET['id'])) {
            resposta_json(false, null, 'ID do item é obrigatório');
        }

        $id = intval($_GET['id']);

        try {
            // Buscar item atual
            $stmt = $pdo->prepare("SELECT * FROM tarefas_checklists WHERE id = ?");
            $stmt->execute([$id]);
            $item_atual = $stmt->fetch();

            if (!$item_atual) {
                resposta_json(false, null, 'Item não encontrado');
            }

            // Construir query de atualização dinamicamente
            $campos_atualizar = [];
            $valores = [];

            if (isset($dados['titulo'])) {
                $campos_atualizar[] = "titulo = ?";
                $valores[] = sanitizar($dados['titulo']);
            }

            if (isset($dados['concluido'])) {
                $campos_atualizar[] = "concluido = ?";
                $valores[] = $dados['concluido'] ? 1 : 0;
            }

            if (isset($dados['ordem'])) {
                $campos_atualizar[] = "ordem = ?";
                $valores[] = intval($dados['ordem']);
            }

            if (empty($campos_atualizar)) {
                resposta_json(false, null, 'Nenhum campo para atualizar');
            }

            // Adicionar ID no final
            $valores[] = $id;

            // Atualizar item
            $sql = "UPDATE tarefas_checklists SET " . implode(', ', $campos_atualizar) . " WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($valores);

            // Buscar item atualizado
            $stmt = $pdo->prepare("SELECT * FROM tarefas_checklists WHERE id = ?");
            $stmt->execute([$id]);
            $item = $stmt->fetch();

            // Registrar atividade se mudou status de concluído
            if (isset($dados['concluido'])) {
                $usuario = obter_usuario_autenticado();
                $acao = $dados['concluido'] ? 'checklist_item_concluido' : 'checklist_item_reaberto';
                $descricao = $dados['concluido']
                    ? "Marcou como concluído: '{$item['titulo']}'"
                    : "Reabriu item: '{$item['titulo']}'";

                $stmt = $pdo->prepare("
                    INSERT INTO tarefas_atividades (tarefa_id, usuario_id, acao, descricao, criado_em)
                    VALUES (?, ?, ?, ?, NOW())
                ");
                $stmt->execute([
                    $item_atual['tarefa_id'],
                    $usuario['id'],
                    $acao,
                    $descricao
                ]);
            }

            resposta_json(true, $item, 'Item atualizado com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao atualizar item: ' . $e->getMessage());
        }
        break;

    case 'DELETE':
        // Excluir item de checklist
        requer_permissao('tarefas', 'editar');

        if (empty($_GET['id'])) {
            resposta_json(false, null, 'ID do item é obrigatório');
        }

        $id = intval($_GET['id']);

        try {
            // Buscar item antes de excluir
            $stmt = $pdo->prepare("SELECT * FROM tarefas_checklists WHERE id = ?");
            $stmt->execute([$id]);
            $item = $stmt->fetch();

            if (!$item) {
                resposta_json(false, null, 'Item não encontrado');
            }

            // Excluir item
            $stmt = $pdo->prepare("DELETE FROM tarefas_checklists WHERE id = ?");
            $stmt->execute([$id]);

            // Registrar atividade
            $usuario = obter_usuario_autenticado();
            $stmt = $pdo->prepare("
                INSERT INTO tarefas_atividades (tarefa_id, usuario_id, acao, descricao, criado_em)
                VALUES (?, ?, 'checklist_item_removido', ?, NOW())
            ");
            $stmt->execute([
                $item['tarefa_id'],
                $usuario['id'],
                "Removeu item do checklist: '{$item['titulo']}'"
            ]);

            resposta_json(true, ['id' => $id], 'Item removido do checklist com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao excluir item: ' . $e->getMessage());
        }
        break;

    default:
        resposta_json(false, null, 'Método HTTP não suportado');
        break;
}
