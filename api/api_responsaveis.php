<?php
require_once 'config.php';

// Middleware de autenticação
requer_autenticacao();

// Determinar ação baseada no método HTTP
$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    case 'GET':
        requer_permissao('base', 'visualizar');

        // Listar todos os responsáveis
        try {
            $filtro = isset($_GET['ativo']) ? $_GET['ativo'] : null;
            
            if ($filtro) {
                $stmt = $pdo->prepare("SELECT * FROM responsaveis WHERE ativo = ? ORDER BY nome ASC");
                $stmt->execute([$filtro]);
            } else {
                $stmt = $pdo->query("SELECT * FROM responsaveis ORDER BY nome ASC");
            }
            
            $responsaveis = $stmt->fetchAll();
            resposta_json(true, $responsaveis);
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao buscar responsáveis: ' . $e->getMessage());
        }
        break;
    
    case 'POST':
        requer_permissao('base', 'criar');
        // Adicionar novo responsável
        $dados = obter_dados_post();
        
        // Validar dados obrigatórios
        if (empty($dados['nome'])) {
            resposta_json(false, null, 'Nome é obrigatório');
        }
        
        try {
            // Sanitizar dados
            $nome = sanitizar($dados['nome']);
            $cargo = sanitizar($dados['cargo'] ?? '');
            $telefone = sanitizar($dados['telefone'] ?? '');
            $email = sanitizar($dados['email'] ?? '');
            $ativo = sanitizar($dados['ativo'] ?? 'Sim');
            
            // Verificar se email já existe (se fornecido)
            if (!empty($email)) {
                $stmt = $pdo->prepare("SELECT id FROM responsaveis WHERE email = ?");
                $stmt->execute([$email]);
                
                if ($stmt->fetch()) {
                    resposta_json(false, null, 'Já existe um responsável com este e-mail');
                }
            }
            
            // Inserir responsável
            $stmt = $pdo->prepare("INSERT INTO responsaveis (nome, cargo, telefone, email, ativo, criado_em) VALUES (?, ?, ?, ?, ?, NOW())");
            $stmt->execute([$nome, $cargo, $telefone, $email, $ativo]);
            
            $id = $pdo->lastInsertId();
            resposta_json(true, ['id' => $id], 'Responsável adicionado com sucesso');
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao salvar responsável: ' . $e->getMessage());
        }
        break;
    
    case 'PUT':
        requer_permissao('base', 'editar');
        // Atualizar responsável
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            resposta_json(false, null, 'ID do responsável é obrigatório');
        }
        
        $dados = obter_dados_post();
        
        // Validar dados obrigatórios
        if (empty($dados['nome'])) {
            resposta_json(false, null, 'Nome é obrigatório');
        }
        
        try {
            // Verificar se responsável existe
            $stmt = $pdo->prepare("SELECT id FROM responsaveis WHERE id = ?");
            $stmt->execute([$id]);
            
            if (!$stmt->fetch()) {
                resposta_json(false, null, 'Responsável não encontrado');
            }
            
            // Sanitizar dados
            $nome = sanitizar($dados['nome']);
            $cargo = sanitizar($dados['cargo'] ?? '');
            $telefone = sanitizar($dados['telefone'] ?? '');
            $email = sanitizar($dados['email'] ?? '');
            $ativo = sanitizar($dados['ativo'] ?? 'Sim');
            
            // Verificar se email já existe em outro registro
            if (!empty($email)) {
                $stmt = $pdo->prepare("SELECT id FROM responsaveis WHERE email = ? AND id != ?");
                $stmt->execute([$email, $id]);
                
                if ($stmt->fetch()) {
                    resposta_json(false, null, 'Já existe outro responsável com este e-mail');
                }
            }
            
            // Atualizar responsável
            $stmt = $pdo->prepare("UPDATE responsaveis SET nome = ?, cargo = ?, telefone = ?, email = ?, ativo = ?, atualizado_em = NOW() WHERE id = ?");
            $stmt->execute([$nome, $cargo, $telefone, $email, $ativo, $id]);
            
            resposta_json(true, ['id' => $id], 'Responsável atualizado com sucesso');
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao atualizar responsável: ' . $e->getMessage());
        }
        break;
    
    case 'DELETE':
        requer_permissao('base', 'excluir');
        // Excluir responsável
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            resposta_json(false, null, 'ID do responsável é obrigatório');
        }
        
        try {
            // Verificar se responsável existe
            $stmt = $pdo->prepare("SELECT nome FROM responsaveis WHERE id = ?");
            $stmt->execute([$id]);
            $responsavel = $stmt->fetch();
            
            if (!$responsavel) {
                resposta_json(false, null, 'Responsável não encontrado');
            }
            
            // Verificar se há obras com este responsável
            $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM obras WHERE responsavel = ?");
            $stmt->execute([$responsavel['nome']]);
            $count = $stmt->fetch()['total'];
            
            if ($count > 0) {
                resposta_json(false, null, 'Não é possível excluir responsável vinculado a obras. Desative-o ao invés de excluir.');
            }
            
            // Excluir responsável
            $stmt = $pdo->prepare("DELETE FROM responsaveis WHERE id = ?");
            $stmt->execute([$id]);
            
            resposta_json(true, null, 'Responsável excluído com sucesso');
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao excluir responsável: ' . $e->getMessage());
        }
        break;
    
    default:
        resposta_json(false, null, 'Método não permitido');
}

?>
