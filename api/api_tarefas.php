<?php
/**
 * API de Tarefas (Kanban Board)
 * CRUD completo com autenticação JWT e controle de permissões
 */

require_once 'config.php';

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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

// Verificar permissões
$permissoes = obter_permissoes_usuario($pdo, $usuario['id']);
$ehAdmin = $usuario['tipo'] === 'admin';

$metodo = $_SERVER['REQUEST_METHOD'];

try {
    switch ($metodo) {
        case 'GET':
            // Verificar permissão de visualizar
            if (!$ehAdmin && !tem_permissao($permissoes, 'tarefas', 'pode_visualizar')) {
                http_response_code(403);
                resposta_json(false, null, 'Sem permissão para visualizar tarefas');
                exit;
            }
            listarTarefas($pdo, $usuario, $ehAdmin);
            break;

        case 'POST':
            // Verificar permissão de criar
            if (!$ehAdmin && !tem_permissao($permissoes, 'tarefas', 'pode_criar')) {
                http_response_code(403);
                resposta_json(false, null, 'Sem permissão para criar tarefas');
                exit;
            }
            criarTarefa($pdo, $usuario);
            break;

        case 'PUT':
            // Verificar permissão de editar
            if (!$ehAdmin && !tem_permissao($permissoes, 'tarefas', 'pode_editar')) {
                http_response_code(403);
                resposta_json(false, null, 'Sem permissão para editar tarefas');
                exit;
            }
            atualizarTarefa($pdo, $usuario, $ehAdmin);
            break;

        case 'DELETE':
            // Verificar permissão de excluir
            if (!$ehAdmin && !tem_permissao($permissoes, 'tarefas', 'pode_excluir')) {
                http_response_code(403);
                resposta_json(false, null, 'Sem permissão para excluir tarefas');
                exit;
            }
            excluirTarefa($pdo, $usuario, $ehAdmin);
            break;

        default:
            http_response_code(405);
            resposta_json(false, null, 'Método não suportado');
    }
} catch (PDOException $e) {
    error_log("Erro no banco de dados (api_tarefas): " . $e->getMessage());
    http_response_code(500);
    resposta_json(false, null, 'Erro no servidor: ' . $e->getMessage());
}

/**
 * Listar tarefas com filtros
 */
function listarTarefas($pdo, $usuario, $ehAdmin) {
    $sql = "
        SELECT
            t.*,
            f.nome as funcionario_nome,
            o.nome as obra_nome,
            e.nome as empresa_nome,
            uc.nome as criado_por_nome,
            ur.nome as usuario_responsavel_nome,
            ur.email as usuario_responsavel_email,
            ur.tipo as usuario_responsavel_tipo,
            (SELECT COUNT(*) FROM tarefas_comentarios tc WHERE tc.tarefa_id = t.id) as comentarios_count
        FROM tarefas t
        LEFT JOIN funcionarios f ON t.funcionario_id = f.id
        LEFT JOIN obras o ON t.obra_id = o.id
        LEFT JOIN empresas e ON t.empresa_id = e.id
        LEFT JOIN usuarios uc ON t.criado_por = uc.id
        LEFT JOIN usuarios ur ON t.usuario_responsavel_id = ur.id
    ";

    $where = [];
    $params = [];

    // Non-admin: ver apenas tarefas onde é responsável, criador ou membro
    if (!$ehAdmin) {
        $where[] = "(
            t.usuario_responsavel_id = :usuario_id_resp
            OR t.criado_por = :usuario_id_criador
            OR EXISTS (SELECT 1 FROM tarefas_membros tm WHERE tm.tarefa_id = t.id AND tm.usuario_id = :usuario_id_membro)
        )";
        $params[':usuario_id_resp'] = $usuario['id'];
        $params[':usuario_id_criador'] = $usuario['id'];
        $params[':usuario_id_membro'] = $usuario['id'];
    }

    // Filtro por funcionário (query param) - mantido para compatibilidade
    if (isset($_GET['funcionario_id']) && $_GET['funcionario_id'] !== '') {
        $where[] = "t.funcionario_id = :funcionario_id";
        $params[':funcionario_id'] = $_GET['funcionario_id'];
    }

    // Filtro por usuário responsável
    if (isset($_GET['usuario_responsavel_id']) && $_GET['usuario_responsavel_id'] !== '') {
        $where[] = "t.usuario_responsavel_id = :usuario_responsavel_id_filter";
        $params[':usuario_responsavel_id_filter'] = $_GET['usuario_responsavel_id'];
    }

    // Filtro por status
    if (isset($_GET['status']) && $_GET['status'] !== '') {
        $where[] = "t.status = :status";
        $params[':status'] = $_GET['status'];
    }

    // Filtro por prioridade
    if (isset($_GET['prioridade']) && $_GET['prioridade'] !== '') {
        $where[] = "t.prioridade = :prioridade";
        $params[':prioridade'] = $_GET['prioridade'];
    }

    // Filtro por obra
    if (isset($_GET['obra_id']) && $_GET['obra_id'] !== '') {
        $where[] = "t.obra_id = :obra_id";
        $params[':obra_id'] = $_GET['obra_id'];
    }

    // Filtro por empresa
    if (isset($_GET['empresa_id']) && $_GET['empresa_id'] !== '') {
        $where[] = "t.empresa_id = :empresa_id";
        $params[':empresa_id'] = $_GET['empresa_id'];
    }

    // Aplicar filtros WHERE
    if (count($where) > 0) {
        $sql .= " WHERE " . implode(' AND ', $where);
    }

    // Ordenação: prioridade (urgente primeiro) + prazo (mais próximo primeiro)
    $sql .= " ORDER BY
        CASE t.prioridade
            WHEN 'urgente' THEN 1
            WHEN 'alta' THEN 2
            WHEN 'media' THEN 3
            WHEN 'baixa' THEN 4
        END,
        t.data_prazo IS NULL ASC,
        t.data_prazo ASC,
        t.criado_em DESC
    ";

    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $tarefas = $stmt->fetchAll(PDO::FETCH_ASSOC);

        resposta_json(true, $tarefas, 'Tarefas listadas com sucesso');
    } catch (PDOException $e) {
        error_log('Erro ao listar tarefas: ' . $e->getMessage());
        resposta_json(false, null, 'Erro ao listar tarefas: ' . $e->getMessage());
    }
}

/**
 * Criar nova tarefa
 */
function criarTarefa($pdo, $usuario) {
    $dados = json_decode(file_get_contents('php://input'), true);

    // Validações
    if (empty($dados['titulo'])) {
        http_response_code(400);
        resposta_json(false, null, 'Título é obrigatório');
        return;
    }

    if (strlen($dados['titulo']) < 3) {
        http_response_code(400);
        resposta_json(false, null, 'Título deve ter no mínimo 3 caracteres');
        return;
    }

    $sql = "INSERT INTO tarefas (
        titulo,
        descricao,
        status,
        prioridade,
        funcionario_id,
        usuario_responsavel_id,
        obra_id,
        empresa_id,
        data_prazo,
        criado_por,
        posicao_coluna
    ) VALUES (
        :titulo,
        :descricao,
        :status,
        :prioridade,
        :funcionario_id,
        :usuario_responsavel_id,
        :obra_id,
        :empresa_id,
        :data_prazo,
        :criado_por,
        :posicao_coluna
    )";

    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute([
        ':titulo' => sanitizar($dados['titulo']),
        ':descricao' => sanitizar($dados['descricao'] ?? ''),
        ':status' => $dados['status'] ?? 'novo',
        ':prioridade' => $dados['prioridade'] ?? 'media',
        ':funcionario_id' => !empty($dados['funcionario_id']) ? $dados['funcionario_id'] : null,
        ':usuario_responsavel_id' => !empty($dados['usuario_responsavel_id']) ? $dados['usuario_responsavel_id'] : null,
        ':obra_id' => !empty($dados['obra_id']) ? $dados['obra_id'] : null,
        ':empresa_id' => !empty($dados['empresa_id']) ? $dados['empresa_id'] : null,
        ':data_prazo' => !empty($dados['data_prazo']) ? $dados['data_prazo'] : null,
        ':criado_por' => $usuario['id'],
        ':posicao_coluna' => isset($dados['posicao_coluna']) ? $dados['posicao_coluna'] : 0
    ]);

    if ($result) {
        $tarefaId = $pdo->lastInsertId();
        resposta_json(true, ['id' => $tarefaId], 'Tarefa criada com sucesso');
    } else {
        http_response_code(500);
        resposta_json(false, null, 'Erro ao criar tarefa');
    }
}

/**
 * Atualizar tarefa existente
 */
function atualizarTarefa($pdo, $usuario, $ehAdmin) {
    $id = $_GET['id'] ?? null;

    if (!$id) {
        http_response_code(400);
        resposta_json(false, null, 'ID da tarefa não fornecido');
        return;
    }

    // Verificar se tarefa existe e se usuário tem permissão
    if (!$ehAdmin) {
        $stmt = $pdo->prepare("SELECT usuario_responsavel_id, funcionario_id FROM tarefas WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $tarefa = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$tarefa) {
            http_response_code(404);
            resposta_json(false, null, 'Tarefa não encontrada');
            return;
        }

        // Usuário comum só pode editar próprias tarefas (check both fields for compatibility)
        if ($tarefa['usuario_responsavel_id'] != $usuario['id'] && $tarefa['funcionario_id'] != $usuario['id']) {
            http_response_code(403);
            resposta_json(false, null, 'Você só pode editar suas próprias tarefas');
            return;
        }
    }

    $dados = json_decode(file_get_contents('php://input'), true);

    // Construir query dinâmica baseada nos campos enviados
    $campos = [];
    $params = [':id' => $id];

    if (isset($dados['titulo'])) {
        if (strlen($dados['titulo']) < 3) {
            http_response_code(400);
            resposta_json(false, null, 'Título deve ter no mínimo 3 caracteres');
            return;
        }
        $campos[] = "titulo = :titulo";
        $params[':titulo'] = sanitizar($dados['titulo']);
    }

    if (isset($dados['descricao'])) {
        $campos[] = "descricao = :descricao";
        $params[':descricao'] = sanitizar($dados['descricao']);
    }

    if (isset($dados['status'])) {
        $campos[] = "status = :status";
        $params[':status'] = $dados['status'];

        // Se concluir, adicionar data de conclusão
        if ($dados['status'] === 'concluido') {
            $campos[] = "data_conclusao = NOW()";
        } elseif ($dados['status'] === 'novo' || $dados['status'] === 'em_andamento') {
            // Se reabrir, limpar data de conclusão
            $campos[] = "data_conclusao = NULL";
        }
    }

    if (isset($dados['prioridade'])) {
        $campos[] = "prioridade = :prioridade";
        $params[':prioridade'] = $dados['prioridade'];
    }

    if (isset($dados['funcionario_id'])) {
        // Apenas admin pode reatribuir tarefas
        if ($ehAdmin) {
            $campos[] = "funcionario_id = :funcionario_id";
            $params[':funcionario_id'] = !empty($dados['funcionario_id']) ? $dados['funcionario_id'] : null;
        }
    }

    if (isset($dados['usuario_responsavel_id'])) {
        // Apenas admin pode reatribuir tarefas
        if ($ehAdmin) {
            $campos[] = "usuario_responsavel_id = :usuario_responsavel_id";
            $params[':usuario_responsavel_id'] = !empty($dados['usuario_responsavel_id']) ? $dados['usuario_responsavel_id'] : null;
        }
    }

    if (isset($dados['obra_id'])) {
        $campos[] = "obra_id = :obra_id";
        $params[':obra_id'] = !empty($dados['obra_id']) ? $dados['obra_id'] : null;
    }

    if (isset($dados['empresa_id'])) {
        $campos[] = "empresa_id = :empresa_id";
        $params[':empresa_id'] = !empty($dados['empresa_id']) ? $dados['empresa_id'] : null;
    }

    if (isset($dados['data_prazo'])) {
        $campos[] = "data_prazo = :data_prazo";
        $params[':data_prazo'] = !empty($dados['data_prazo']) ? $dados['data_prazo'] : null;
    }

    if (isset($dados['data_conclusao'])) {
        $campos[] = "data_conclusao = :data_conclusao";
        $params[':data_conclusao'] = !empty($dados['data_conclusao']) ? $dados['data_conclusao'] : null;
    }

    if (empty($campos)) {
        http_response_code(400);
        resposta_json(false, null, 'Nenhum campo para atualizar');
        return;
    }

    $sql = "UPDATE tarefas SET " . implode(', ', $campos) . " WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute($params);

    if ($result) {
        resposta_json(true, null, 'Tarefa atualizada com sucesso');
    } else {
        http_response_code(500);
        resposta_json(false, null, 'Erro ao atualizar tarefa');
    }
}

/**
 * Excluir tarefa
 */
function excluirTarefa($pdo, $usuario, $ehAdmin) {
    $id = $_GET['id'] ?? null;

    if (!$id) {
        http_response_code(400);
        resposta_json(false, null, 'ID da tarefa não fornecido');
        return;
    }

    // Verificar se tarefa existe e se usuário tem permissão
    if (!$ehAdmin) {
        $stmt = $pdo->prepare("SELECT usuario_responsavel_id, funcionario_id FROM tarefas WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $tarefa = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$tarefa) {
            http_response_code(404);
            resposta_json(false, null, 'Tarefa não encontrada');
            return;
        }

        // Usuário comum só pode excluir próprias tarefas (check both fields for compatibility)
        if ($tarefa['usuario_responsavel_id'] != $usuario['id'] && $tarefa['funcionario_id'] != $usuario['id']) {
            http_response_code(403);
            resposta_json(false, null, 'Você só pode excluir suas próprias tarefas');
            return;
        }
    }

    $sql = "DELETE FROM tarefas WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $result = $stmt->execute([':id' => $id]);

    if ($result) {
        resposta_json(true, null, 'Tarefa excluída com sucesso');
    } else {
        http_response_code(500);
        resposta_json(false, null, 'Erro ao excluir tarefa');
    }
}
?>
