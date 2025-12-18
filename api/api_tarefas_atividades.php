<?php
/**
 * API REST: Tarefas - Atividades (Timeline/Histórico)
 *
 * Exibe histórico completo de atividades e mudanças em uma tarefa
 * Endpoint: GET (somente leitura - atividades são criadas automaticamente por outras APIs)
 */

require_once __DIR__ . '/config.php';

// Middleware de autenticação
requer_autenticacao();

$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    case 'GET':
        // Listar atividades de uma tarefa
        requer_permissao('tarefas', 'visualizar');

        if (empty($_GET['tarefa_id'])) {
            resposta_json(false, null, 'ID da tarefa é obrigatório');
        }

        $tarefa_id = intval($_GET['tarefa_id']);

        // Parâmetros opcionais de paginação
        $limite = isset($_GET['limite']) ? intval($_GET['limite']) : 50;
        $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

        // Filtro opcional por tipo de ação
        $filtro_acao = isset($_GET['acao']) ? sanitizar($_GET['acao']) : null;

        try {
            // Verificar se tarefa existe
            $stmt = $pdo->prepare("SELECT id, titulo FROM tarefas WHERE id = ?");
            $stmt->execute([$tarefa_id]);
            $tarefa = $stmt->fetch();

            if (!$tarefa) {
                resposta_json(false, null, 'Tarefa não encontrada');
            }

            // Construir query com filtro opcional
            $sql = "
                SELECT
                    a.id,
                    a.tarefa_id,
                    a.usuario_id,
                    a.acao,
                    a.descricao,
                    a.campo_alterado,
                    a.valor_anterior,
                    a.valor_novo,
                    a.criado_em,
                    u.nome AS usuario_nome,
                    u.email AS usuario_email,
                    u.avatar AS usuario_avatar
                FROM tarefas_atividades a
                INNER JOIN usuarios u ON a.usuario_id = u.id
                WHERE a.tarefa_id = ?
            ";

            $params = [$tarefa_id];

            if ($filtro_acao) {
                $sql .= " AND a.acao = ?";
                $params[] = $filtro_acao;
            }

            $sql .= " ORDER BY a.criado_em DESC LIMIT ? OFFSET ?";
            $params[] = $limite;
            $params[] = $offset;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $atividades = $stmt->fetchAll();

            // Buscar total de atividades (para paginação)
            $sql_count = "SELECT COUNT(*) as total FROM tarefas_atividades WHERE tarefa_id = ?";
            $params_count = [$tarefa_id];

            if ($filtro_acao) {
                $sql_count .= " AND acao = ?";
                $params_count[] = $filtro_acao;
            }

            $stmt = $pdo->prepare($sql_count);
            $stmt->execute($params_count);
            $total = $stmt->fetch()['total'];

            // Enriquecer dados das atividades
            foreach ($atividades as &$atividade) {
                // Tempo relativo
                $atividade['tempo_relativo'] = tempoRelativo($atividade['criado_em']);

                // Ícone baseado na ação
                $atividade['icone'] = obterIconeAcao($atividade['acao']);

                // Cor baseada na ação
                $atividade['cor'] = obterCorAcao($atividade['acao']);

                // Tipo de atividade (agrupamento)
                $atividade['tipo'] = obterTipoAtividade($atividade['acao']);
            }

            resposta_json(true, [
                'atividades' => $atividades,
                'total' => $total,
                'limite' => $limite,
                'offset' => $offset,
                'tem_mais' => ($offset + $limite) < $total
            ]);

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao buscar atividades: ' . $e->getMessage());
        }
        break;

    default:
        resposta_json(false, null, 'Método HTTP não suportado. Esta API é somente leitura (GET)');
        break;
}

/**
 * Converter timestamp em tempo relativo (ex: "há 5 minutos", "há 2 horas")
 */
function tempoRelativo($timestamp) {
    $agora = time();
    $tempo = strtotime($timestamp);
    $diferenca = $agora - $tempo;

    if ($diferenca < 60) {
        return 'agora há pouco';
    } elseif ($diferenca < 3600) {
        $minutos = floor($diferenca / 60);
        return "há {$minutos} " . ($minutos == 1 ? 'minuto' : 'minutos');
    } elseif ($diferenca < 86400) {
        $horas = floor($diferenca / 3600);
        return "há {$horas} " . ($horas == 1 ? 'hora' : 'horas');
    } elseif ($diferenca < 604800) {
        $dias = floor($diferenca / 86400);
        return "há {$dias} " . ($dias == 1 ? 'dia' : 'dias');
    } elseif ($diferenca < 2592000) {
        $semanas = floor($diferenca / 604800);
        return "há {$semanas} " . ($semanas == 1 ? 'semana' : 'semanas');
    } elseif ($diferenca < 31536000) {
        $meses = floor($diferenca / 2592000);
        return "há {$meses} " . ($meses == 1 ? 'mês' : 'meses');
    } else {
        $anos = floor($diferenca / 31536000);
        return "há {$anos} " . ($anos == 1 ? 'ano' : 'anos');
    }
}

/**
 * Obter ícone emoji baseado no tipo de ação
 */
function obterIconeAcao($acao) {
    $icones = [
        'tarefa_criada' => '✨',
        'status_alterado' => '🔄',
        'prioridade_alterada' => '⚡',
        'prazo_alterado' => '📅',
        'titulo_alterado' => '✏️',
        'descricao_alterada' => '📝',
        'responsavel_alterado' => '👤',
        'etiqueta_adicionada' => '🏷️',
        'etiqueta_removida' => '🏷️',
        'checklist_item_adicionado' => '☑️',
        'checklist_item_concluido' => '✅',
        'checklist_item_reaberto' => '🔄',
        'checklist_item_removido' => '❌',
        'membro_adicionado' => '👥',
        'membro_removido' => '👥',
        'membro_papel_alterado' => '👥',
        'anexo_adicionado' => '📎',
        'anexo_removido' => '📎',
        'comentario_adicionado' => '💬',
        'comentario_editado' => '💬',
        'comentario_removido' => '💬',
        'tarefa_arquivada' => '🗄️',
        'tarefa_desarquivada' => '📂',
        'tarefa_excluida' => '🗑️'
    ];

    return $icones[$acao] ?? '📌';
}

/**
 * Obter cor baseada no tipo de ação (para UI)
 */
function obterCorAcao($acao) {
    $cores = [
        'tarefa_criada' => 'blue',
        'status_alterado' => 'indigo',
        'prioridade_alterada' => 'orange',
        'prazo_alterado' => 'purple',
        'titulo_alterado' => 'gray',
        'descricao_alterada' => 'gray',
        'responsavel_alterado' => 'blue',
        'etiqueta_adicionada' => 'green',
        'etiqueta_removida' => 'red',
        'checklist_item_adicionado' => 'green',
        'checklist_item_concluido' => 'green',
        'checklist_item_reaberto' => 'yellow',
        'checklist_item_removido' => 'red',
        'membro_adicionado' => 'blue',
        'membro_removido' => 'red',
        'membro_papel_alterado' => 'purple',
        'anexo_adicionado' => 'green',
        'anexo_removido' => 'red',
        'comentario_adicionado' => 'blue',
        'comentario_editado' => 'gray',
        'comentario_removido' => 'red',
        'tarefa_arquivada' => 'gray',
        'tarefa_desarquivada' => 'blue',
        'tarefa_excluida' => 'red'
    ];

    return $cores[$acao] ?? 'gray';
}

/**
 * Obter tipo/categoria da atividade (para agrupamento)
 */
function obterTipoAtividade($acao) {
    if (strpos($acao, 'etiqueta_') === 0) return 'etiqueta';
    if (strpos($acao, 'checklist_') === 0) return 'checklist';
    if (strpos($acao, 'membro_') === 0) return 'membro';
    if (strpos($acao, 'anexo_') === 0) return 'anexo';
    if (strpos($acao, 'comentario_') === 0) return 'comentario';
    if (strpos($acao, '_alterado') !== false) return 'alteracao';
    if (strpos($acao, 'tarefa_') === 0) return 'tarefa';

    return 'outro';
}
