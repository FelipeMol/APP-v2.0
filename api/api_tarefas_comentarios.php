<?php
/**
 * API de Comentários de Tarefas
 * CRUD de comentários com autenticação JWT
 */

require_once 'config.php';

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verificar autenticação JWT
$headers = getallheaders();
$token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;

if (!$token) {
    http_response_code(401);
    resposta_json(false, null, 'Token não fornecido');
    exit;
}

$usuario = validar_jwt($token);
if (!$usuario) {
    http_response_code(401);
    resposta_json(false, null, 'Token inválido ou expirado');
    exit;
}

$metodo = $_SERVER['REQUEST_METHOD'];

try {
    switch ($metodo) {
        case 'GET':
            listarComentarios($pdo, $usuario);
            break;

        case 'POST':
            criarComentario($pdo, $usuario);
            break;

        case 'DELETE':
            excluirComentario($pdo, $usuario);
            break;

        default:
            http_response_code(405);
            resposta_json(false, null, 'Método não suportado');
    }
} catch (PDOException $e) {
    error_log("Erro no banco de dados (api_tarefas_comentarios): " . $e->getMessage());
    http_response_code(500);
    resposta_json(false, null, 'Erro no servidor: ' . $e->getMessage());
}

/**
 * Listar comentários de uma tarefa
 */
function listarComentarios($pdo, $usuario) {
    $tarefaId = $_GET['tarefa_id'] ?? null;

    if (!$tarefaId) {
        http_response_code(400);
        resposta_json(false, null, 'ID da tarefa não fornecido');
        return;
    }

    // Verificar se tarefa existe e se usuário tem acesso (admin, responsável ou membro)
    if (!usuarioTemAcessoATarefa($pdo, $usuario, $tarefaId)) {
        http_response_code(403);
        resposta_json(false, null, 'Você não tem permissão para ver estes comentários');
        return;
    }

    $sql = "
        SELECT
            tc.*,
            u.nome as usuario_nome,
            u.email as usuario_email
        FROM tarefas_comentarios tc
        LEFT JOIN usuarios u ON tc.usuario_id = u.id
        WHERE tc.tarefa_id = :tarefa_id
        ORDER BY tc.criado_em DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':tarefa_id' => $tarefaId]);
    $comentarios = $stmt->fetchAll(PDO::FETCH_ASSOC);

    resposta_json(true, $comentarios, 'Comentários listados com sucesso');
}

/**
 * Criar novo comentário
 */
function criarComentario($pdo, $usuario) {
    $dados = json_decode(file_get_contents('php://input'), true);

    // Validações
    if (empty($dados['tarefa_id'])) {
        http_response_code(400);
        resposta_json(false, null, 'ID da tarefa é obrigatório');
        return;
    }

    if (empty($dados['comentario'])) {
        http_response_code(400);
        resposta_json(false, null, 'Comentário não pode estar vazio');
        return;
    }

    if (strlen(trim($dados['comentario'])) < 1) {
        http_response_code(400);
        resposta_json(false, null, 'Comentário não pode estar vazio');
        return;
    }

    // Verificar se tarefa existe e se usuário tem acesso (admin, responsável ou membro)
    if (!usuarioTemAcessoATarefa($pdo, $usuario, $dados['tarefa_id'])) {
        http_response_code(403);
        resposta_json(false, null, 'Você não tem permissão para comentar nesta tarefa');
        return;
    }

    $sql = "INSERT INTO tarefas_comentarios (
        tarefa_id,
        usuario_id,
        comentario
    ) VALUES (
        :tarefa_id,
        :usuario_id,
        :comentario
    )";

    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute([
        ':tarefa_id' => $dados['tarefa_id'],
        ':usuario_id' => $usuario['id'],
        ':comentario' => sanitizar($dados['comentario'])
    ]);

    if ($result) {
        $comentarioId = $pdo->lastInsertId();

        // Retornar comentário criado com dados do usuário
        $stmt = $pdo->prepare("
            SELECT
                tc.*,
                u.nome as usuario_nome,
                u.email as usuario_email
            FROM tarefas_comentarios tc
            LEFT JOIN usuarios u ON tc.usuario_id = u.id
            WHERE tc.id = :id
        ");
        $stmt->execute([':id' => $comentarioId]);
        $comentario = $stmt->fetch(PDO::FETCH_ASSOC);

        resposta_json(true, $comentario, 'Comentário adicionado com sucesso');
    } else {
        http_response_code(500);
        resposta_json(false, null, 'Erro ao adicionar comentário');
    }
}

/**
 * Verifica se usuário pode acessar a tarefa (admin, responsável direto ou membro associado)
 */
function usuarioTemAcessoATarefa($pdo, $usuario, $tarefaId) {
    if ($usuario['tipo'] === 'admin') return true;

    // Responsável direto ou criador (funcionario_id ou usuario_responsavel_id)
    $stmt = $pdo->prepare("SELECT funcionario_id, usuario_responsavel_id FROM tarefas WHERE id = :tarefa_id");
    $stmt->execute([':tarefa_id' => $tarefaId]);
    $tarefa = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$tarefa) {
        http_response_code(404);
        resposta_json(false, null, 'Tarefa não encontrada');
        return false;
    }

    if ($tarefa['funcionario_id'] == $usuario['id'] || $tarefa['usuario_responsavel_id'] == $usuario['id']) {
        return true;
    }

    // Membro associado
    $stmt = $pdo->prepare("SELECT id FROM tarefas_membros WHERE tarefa_id = :tarefa_id AND usuario_id = :usuario_id");
    $stmt->execute([':tarefa_id' => $tarefaId, ':usuario_id' => $usuario['id']]);
    if ($stmt->fetch()) {
        return true;
    }

    return false;
}

/**
 * Excluir comentário
 */
function excluirComentario($pdo, $usuario) {
    $id = $_GET['id'] ?? null;

    if (!$id) {
        http_response_code(400);
        resposta_json(false, null, 'ID do comentário não fornecido');
        return;
    }

    // Verificar se comentário existe e se usuário é o autor ou admin
    $stmt = $pdo->prepare("SELECT usuario_id FROM tarefas_comentarios WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $comentario = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$comentario) {
        http_response_code(404);
        resposta_json(false, null, 'Comentário não encontrado');
        return;
    }

    $ehAdmin = $usuario['tipo'] === 'admin';

    // Apenas admin ou autor podem excluir
    if (!$ehAdmin && $comentario['usuario_id'] != $usuario['id']) {
        http_response_code(403);
        resposta_json(false, null, 'Você só pode excluir seus próprios comentários');
        return;
    }

    $sql = "DELETE FROM tarefas_comentarios WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute([':id' => $id]);

    if ($result) {
        resposta_json(true, null, 'Comentário excluído com sucesso');
    } else {
        http_response_code(500);
        resposta_json(false, null, 'Erro ao excluir comentário');
    }
}
?>
