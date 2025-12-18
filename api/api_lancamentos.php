<?php
require_once 'config.php';

// Middleware de autenticação
requer_autenticacao();

// Determinar ação baseada no método HTTP
$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    case 'GET':
        requer_permissao('lancamentos', 'visualizar');

        // Listar lançamentos com filtros opcionais (data inicial/final)
        try {
            $sql = "SELECT * FROM lancamentos";
            $conds = [];
            $params = [];

            // Filtros por período
            $inicio = isset($_GET['inicio']) ? trim($_GET['inicio']) : null;
            $fim = isset($_GET['fim']) ? trim($_GET['fim']) : null;
            if ($inicio && preg_match('/^\d{4}-\d{2}-\d{2}$/', $inicio)) {
                $conds[] = "data >= ?";
                $params[] = $inicio;
            }
            if ($fim && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fim)) {
                $conds[] = "data <= ?";
                $params[] = $fim;
            }

            if (!empty($conds)) {
                $sql .= " WHERE " . implode(" AND ", $conds);
            }

            $sql .= " ORDER BY data DESC, criado_em DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $lancamentos = $stmt->fetchAll();
            // Normalizar campo horas para HH:MM na saída
            foreach ($lancamentos as &$l) {
                if (isset($l['horas']) && is_string($l['horas'])) {
                    if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $l['horas'])) {
                        $l['horas'] = substr($l['horas'], 0, 5);
                    }
                }
            }
            resposta_json(true, $lancamentos);
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao buscar lançamentos: ' . $e->getMessage());
        }
        break;
    
    case 'POST':
        requer_permissao('lancamentos', 'criar');
        // Adicionar novo lançamento
        $dados = obter_dados_post();
        
        // Validar dados obrigatórios
        if (empty($dados['data']) || empty($dados['funcionario'])) {
            resposta_json(false, null, 'Data e funcionário são obrigatórios');
        }
        
        try {
            // Sanitizar dados
            $data = sanitizar($dados['data']);
            $funcionario = sanitizar($dados['funcionario']);
            $funcao = sanitizar($dados['funcao'] ?? '');
            $empresa = sanitizar($dados['empresa'] ?? '');
            $obra = sanitizar($dados['obra'] ?? '');
            $horas = sanitizar($dados['horas'] ?? '08:00');
            // Normalizar horas para formato HH:MM
            if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $horas)) {
                $horas = substr($horas, 0, 5);
            }
            if (preg_match('/^\d{2}:\d{2}$/', $horas) !== 1) {
                $horas = '08:00';
            }
            // Diárias removidas do frontend; manter null/padrão
            $diarias = null;
            $observacao = sanitizar($dados['observacao'] ?? '');
            
            // Inserir lançamento
            $stmt = $pdo->prepare("INSERT INTO lancamentos (data, funcionario, funcao, empresa, obra, horas, diarias, observacao, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())");
            $stmt->execute([$data, $funcionario, $funcao, $empresa, $obra, $horas, $diarias, $observacao]);
            
            $id = $pdo->lastInsertId();
            resposta_json(true, ['id' => $id], 'Lançamento registrado com sucesso');
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao salvar lançamento: ' . $e->getMessage());
        }
        break;
    
    case 'PUT':
        requer_permissao('lancamentos', 'editar');
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            resposta_json(false, null, 'ID do lançamento é obrigatório');
        }
        
        $dados = obter_dados_post();
        
        if (empty($dados['data']) || empty($dados['funcionario'])) {
            resposta_json(false, null, 'Data e funcionário são obrigatórios');
        }
        
        try {
            // Verificar se lançamento existe
            $stmt = $pdo->prepare("SELECT id FROM lancamentos WHERE id = ?");
            $stmt->execute([$id]);
            
            if (!$stmt->fetch()) {
                resposta_json(false, null, 'Lançamento não encontrado');
            }
            
            // Sanitizar dados
            $data = sanitizar($dados['data']);
            $funcionario = sanitizar($dados['funcionario']);
            $funcao = sanitizar($dados['funcao'] ?? '');
            $empresa = sanitizar($dados['empresa'] ?? '');
            $obra = sanitizar($dados['obra'] ?? '');
            $horas = sanitizar($dados['horas'] ?? '08:00');
            // Normalizar horas para formato HH:MM
            if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $horas)) {
                $horas = substr($horas, 0, 5);
            }
            if (preg_match('/^\d{2}:\d{2}$/', $horas) !== 1) {
                $horas = '08:00';
            }
            // Diárias removidas do frontend; manter existente ou null
            $diarias = isset($dados['diarias']) ? (float)$dados['diarias'] : null;
            $observacao = sanitizar($dados['observacao'] ?? '');
            
            // Atualizar lançamento
            $stmt = $pdo->prepare("UPDATE lancamentos SET data = ?, funcionario = ?, funcao = ?, empresa = ?, obra = ?, horas = ?, diarias = ?, observacao = ? WHERE id = ?");
            $stmt->execute([$data, $funcionario, $funcao, $empresa, $obra, $horas, $diarias, $observacao, $id]);
            
            resposta_json(true, null, 'Lançamento atualizado com sucesso');
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao atualizar lançamento: ' . $e->getMessage());
        }
        break;
    
    case 'DELETE':
        requer_permissao('lancamentos', 'excluir');
        // Excluir lançamento
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            resposta_json(false, null, 'ID do lançamento é obrigatório');
        }
        
        try {
            // Verificar se lançamento existe
            $stmt = $pdo->prepare("SELECT id FROM lancamentos WHERE id = ?");
            $stmt->execute([$id]);
            $lancamento = $stmt->fetch();
            
            if (!$lancamento) {
                resposta_json(false, null, 'Lançamento não encontrado');
            }
            
            // Excluir lançamento
            $stmt = $pdo->prepare("DELETE FROM lancamentos WHERE id = ?");
            $stmt->execute([$id]);
            
            resposta_json(true, null, 'Lançamento excluído com sucesso');
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao excluir lançamento: ' . $e->getMessage());
        }
        break;
    
    default:
        resposta_json(false, null, 'Método não permitido');
}

?>