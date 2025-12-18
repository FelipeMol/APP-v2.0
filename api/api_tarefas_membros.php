<?php
/**
 * API REST: Tarefas <-> Membros (Múltiplos responsáveis)
 *
 * Gerencia atribuição de múltiplos usuários a tarefas com papéis diferentes
 * Endpoints: GET, POST, PUT, DELETE
 */

require_once __DIR__ . '/config.php';

// Middleware de autenticação
requer_autenticacao();

/**
 * Reuso de verificação de acesso: admin, responsável direto ou membro
 */
function usuario_tem_acesso_tarefa($pdo, $usuario, $tarefa_id) {
    if ($usuario['tipo'] === 'admin') return true;

    $stmt = $pdo->prepare("SELECT funcionario_id, usuario_responsavel_id FROM tarefas WHERE id = ?");
    $stmt->execute([$tarefa_id]);
    $tarefa = $stmt->fetch();
    if (!$tarefa) {
        resposta_json(false, null, 'Tarefa não encontrada');
    }

    if ($tarefa['funcionario_id'] == $usuario['id'] || $tarefa['usuario_responsavel_id'] == $usuario['id']) {
        return true;
    }

    $stmt = $pdo->prepare("SELECT 1 FROM tarefas_membros WHERE tarefa_id = ? AND usuario_id = ? LIMIT 1");
    $stmt->execute([$tarefa_id, $usuario['id']]);
    return (bool) $stmt->fetchColumn();
}

$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    case 'GET':
        // Listar membros de uma tarefa
        requer_permissao('tarefas', 'visualizar');

        if (empty($_GET['tarefa_id'])) {
            resposta_json(false, null, 'ID da tarefa é obrigatório');
        }

        $tarefa_id = intval($_GET['tarefa_id']);

        try {
            // Verificar se tarefa existe e se usuário tem acesso (admin, responsável ou membro)
            if (!usuario_tem_acesso_tarefa($pdo, obter_usuario_autenticado(), $tarefa_id)) {
                resposta_json(false, null, 'Você não tem permissão para ver estes membros');
            }

            // Buscar membros da tarefa
            $stmt = $pdo->prepare("
                SELECT
                    tm.id,
                    tm.tarefa_id,
                    tm.usuario_id,
                    tm.papel,
                    tm.criado_em,
                    u.nome AS usuario_nome,
                    u.email AS usuario_email
                FROM tarefas_membros tm
                INNER JOIN usuarios u ON tm.usuario_id = u.id
                WHERE tm.tarefa_id = ?
                ORDER BY
                    CASE tm.papel
                        WHEN 'responsavel' THEN 1
                        WHEN 'revisor' THEN 2
                        WHEN 'observador' THEN 3
                    END,
                    u.nome ASC
            ");
            $stmt->execute([$tarefa_id]);
            $membros = $stmt->fetchAll();

            resposta_json(true, $membros);

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao buscar membros da tarefa: ' . $e->getMessage());
        }
        break;

    case 'POST':
        // Adicionar membro a uma tarefa
        requer_permissao('tarefas', 'editar');
        $dados = obter_dados_post();

        // Validações
        if (empty($dados['tarefa_id'])) {
            resposta_json(false, null, 'ID da tarefa é obrigatório');
        }

        if (empty($dados['usuario_id'])) {
            resposta_json(false, null, 'ID do usuário é obrigatório');
        }

        $tarefa_id = intval($dados['tarefa_id']);
        $usuario_id = intval($dados['usuario_id']);
        $papel = isset($dados['papel']) ? sanitizar($dados['papel']) : 'responsavel';

        // Validar papel
        $papeis_validos = ['responsavel', 'observador', 'revisor'];
        if (!in_array($papel, $papeis_validos)) {
            resposta_json(false, null, 'Papel inválido. Use: responsavel, observador ou revisor');
        }

        try {
            // Verificar se tarefa existe
            $stmt = $pdo->prepare("SELECT titulo FROM tarefas WHERE id = ?");
            $stmt->execute([$tarefa_id]);
            $tarefa = $stmt->fetch();

            if (!$tarefa) {
                resposta_json(false, null, 'Tarefa não encontrada');
            }

            // Verificar se usuário existe
            $stmt = $pdo->prepare("SELECT id, nome, email FROM usuarios WHERE id = ?");
            $stmt->execute([$usuario_id]);
            $usuario = $stmt->fetch();

            if (!$usuario) {
                resposta_json(false, null, 'Usuário não encontrado');
            }

            // Verificar se membro já está associado
            $stmt = $pdo->prepare("
                SELECT id, papel FROM tarefas_membros
                WHERE tarefa_id = ? AND usuario_id = ?
            ");
            $stmt->execute([$tarefa_id, $usuario_id]);
            $membro_existente = $stmt->fetch();

            if ($membro_existente) {
                resposta_json(false, null, 'Este usuário já é membro desta tarefa como ' . $membro_existente['papel']);
            }

            // Adicionar membro
            $stmt = $pdo->prepare("
                INSERT INTO tarefas_membros (tarefa_id, usuario_id, papel, criado_em)
                VALUES (?, ?, ?, NOW())
            ");
            $stmt->execute([$tarefa_id, $usuario_id, $papel]);

            $id = $pdo->lastInsertId();

            // Registrar atividade
            $usuario_autenticado = obter_usuario_autenticado();

            $papel_label = [
                'responsavel' => 'responsável',
                'observador' => 'observador',
                'revisor' => 'revisor'
            ];

            $stmt = $pdo->prepare("
                INSERT INTO tarefas_atividades (tarefa_id, usuario_id, acao, descricao, criado_em)
                VALUES (?, ?, 'membro_adicionado', ?, NOW())
            ");
            $stmt->execute([
                $tarefa_id,
                $usuario_autenticado['id'],
                "Adicionou {$usuario['nome']} como {$papel_label[$papel]}"
            ]);

            // Retornar membro adicionado com dados completos
            $stmt = $pdo->prepare("
                SELECT
                    tm.*,
                    u.nome AS usuario_nome,
                    u.email AS usuario_email
                FROM tarefas_membros tm
                INNER JOIN usuarios u ON tm.usuario_id = u.id
                WHERE tm.id = ?
            ");
            $stmt->execute([$id]);
            $membro = $stmt->fetch();

            resposta_json(true, $membro, 'Membro adicionado à tarefa com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao adicionar membro à tarefa: ' . $e->getMessage());
        }
        break;

    case 'PUT':
        // Atualizar papel de um membro
        requer_permissao('tarefas', 'editar');
        $dados = obter_dados_post();

        if (empty($_GET['id'])) {
            resposta_json(false, null, 'ID da associação é obrigatório');
        }

        if (empty($dados['papel'])) {
            resposta_json(false, null, 'Papel é obrigatório');
        }

        $id = intval($_GET['id']);
        $papel = sanitizar($dados['papel']);

        // Validar papel
        $papeis_validos = ['responsavel', 'observador', 'revisor'];
        if (!in_array($papel, $papeis_validos)) {
            resposta_json(false, null, 'Papel inválido. Use: responsavel, observador ou revisor');
        }

        try {
            // Buscar membro atual
            $stmt = $pdo->prepare("
                SELECT tm.*, u.nome AS usuario_nome
                FROM tarefas_membros tm
                INNER JOIN usuarios u ON tm.usuario_id = u.id
                WHERE tm.id = ?
            ");
            $stmt->execute([$id]);
            $membro_atual = $stmt->fetch();

            if (!$membro_atual) {
                resposta_json(false, null, 'Membro não encontrado');
            }

            // Não atualizar se o papel for o mesmo
            if ($membro_atual['papel'] === $papel) {
                resposta_json(false, null, 'O usuário já possui este papel');
            }

            // Atualizar papel
            $stmt = $pdo->prepare("
                UPDATE tarefas_membros
                SET papel = ?
                WHERE id = ?
            ");
            $stmt->execute([$papel, $id]);

            // Registrar atividade
            $usuario_autenticado = obter_usuario_autenticado();

            $papel_label = [
                'responsavel' => 'responsável',
                'observador' => 'observador',
                'revisor' => 'revisor'
            ];

            $stmt = $pdo->prepare("
                INSERT INTO tarefas_atividades (tarefa_id, usuario_id, acao, descricao, criado_em)
                VALUES (?, ?, 'membro_papel_alterado', ?, NOW())
            ");
            $stmt->execute([
                $membro_atual['tarefa_id'],
                $usuario_autenticado['id'],
                "Alterou o papel de {$membro_atual['usuario_nome']} para {$papel_label[$papel]}"
            ]);

            // Buscar membro atualizado
            $stmt = $pdo->prepare("
                SELECT
                    tm.*,
                    u.nome AS usuario_nome,
                    u.email AS usuario_email
                FROM tarefas_membros tm
                INNER JOIN usuarios u ON tm.usuario_id = u.id
                WHERE tm.id = ?
            ");
            $stmt->execute([$id]);
            $membro = $stmt->fetch();

            resposta_json(true, $membro, 'Papel do membro atualizado com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao atualizar papel do membro: ' . $e->getMessage());
        }
        break;

    case 'DELETE':
        // Remover membro de uma tarefa
        requer_permissao('tarefas', 'editar');

        if (empty($_GET['id'])) {
            resposta_json(false, null, 'ID da associação é obrigatório');
        }

        $id = intval($_GET['id']);

        try {
            // Buscar membro antes de excluir (para registro de atividade)
            $stmt = $pdo->prepare("
                SELECT tm.tarefa_id, tm.papel, u.nome AS usuario_nome
                FROM tarefas_membros tm
                INNER JOIN usuarios u ON tm.usuario_id = u.id
                WHERE tm.id = ?
            ");
            $stmt->execute([$id]);
            $membro = $stmt->fetch();

            if (!$membro) {
                resposta_json(false, null, 'Membro não encontrado');
            }

            // Excluir membro
            $stmt = $pdo->prepare("DELETE FROM tarefas_membros WHERE id = ?");
            $stmt->execute([$id]);

            // Registrar atividade
            $usuario_autenticado = obter_usuario_autenticado();

            $papel_label = [
                'responsavel' => 'responsável',
                'observador' => 'observador',
                'revisor' => 'revisor'
            ];

            $stmt = $pdo->prepare("
                INSERT INTO tarefas_atividades (tarefa_id, usuario_id, acao, descricao, criado_em)
                VALUES (?, ?, 'membro_removido', ?, NOW())
            ");
            $stmt->execute([
                $membro['tarefa_id'],
                $usuario_autenticado['id'],
                "Removeu {$membro['usuario_nome']} ({$papel_label[$membro['papel']]})"
            ]);

            resposta_json(true, ['id' => $id], 'Membro removido da tarefa com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao remover membro da tarefa: ' . $e->getMessage());
        }
        break;

    default:
        resposta_json(false, null, 'Método HTTP não suportado');
        break;
}
