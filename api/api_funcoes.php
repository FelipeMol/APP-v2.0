<?php
require_once 'config.php';

// Middleware de autenticação
requer_autenticacao();

// Determinar ação baseada no método HTTP
$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    case 'GET':
        requer_permissao('base', 'visualizar');

        // Listar todas as funções
        try {
            $filtro = isset($_GET['ativo']) ? $_GET['ativo'] : null;
            
            if ($filtro) {
                $stmt = $pdo->prepare("SELECT * FROM funcoes WHERE ativo = ? ORDER BY nome ASC");
                $stmt->execute([$filtro]);
            } else {
                $stmt = $pdo->query("SELECT * FROM funcoes ORDER BY nome ASC");
            }
            
            $funcoes = $stmt->fetchAll();
            resposta_json(true, $funcoes);
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao buscar funções: ' . $e->getMessage());
        }
        break;
    
    case 'POST':
        requer_permissao('base', 'criar');
        // Adicionar nova função
        $dados = obter_dados_post();
        
        // Validar dados obrigatórios
        if (empty($dados['nome'])) {
            resposta_json(false, null, 'Nome é obrigatório');
        }
        
        try {
            // Sanitizar dados
            $nome = sanitizar($dados['nome']);
            $descricao = sanitizar($dados['descricao'] ?? '');
            $ativo = sanitizar($dados['ativo'] ?? 'Sim');
            
            // Verificar se função já existe
            $stmt = $pdo->prepare("SELECT id FROM funcoes WHERE nome = ?");
            $stmt->execute([$nome]);
            
            if ($stmt->fetch()) {
                resposta_json(false, null, 'Função com este nome já existe');
            }
            
            // Inserir função
            $stmt = $pdo->prepare("INSERT INTO funcoes (nome, descricao, ativo, criado_em) VALUES (?, ?, ?, NOW())");
            $stmt->execute([$nome, $descricao, $ativo]);
            
            $id = $pdo->lastInsertId();
            resposta_json(true, ['id' => $id], 'Função adicionada com sucesso');
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao salvar função: ' . $e->getMessage());
        }
        break;
    
    case 'PUT':
        requer_permissao('base', 'editar');
        // Atualizar função
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            resposta_json(false, null, 'ID da função é obrigatório');
        }
        
        $dados = obter_dados_post();
        
        // Validar dados obrigatórios
        if (empty($dados['nome'])) {
            resposta_json(false, null, 'Nome é obrigatório');
        }
        
        try {
            // Verificar se função existe
            $stmt = $pdo->prepare("SELECT id FROM funcoes WHERE id = ?");
            $stmt->execute([$id]);
            
            if (!$stmt->fetch()) {
                resposta_json(false, null, 'Função não encontrada');
            }
            
            // Sanitizar dados
            $nome = sanitizar($dados['nome']);
            $descricao = sanitizar($dados['descricao'] ?? '');
            $ativo = sanitizar($dados['ativo'] ?? 'Sim');
            
            // Verificar se novo nome já existe em outro registro
            $stmt = $pdo->prepare("SELECT id FROM funcoes WHERE nome = ? AND id != ?");
            $stmt->execute([$nome, $id]);
            
            if ($stmt->fetch()) {
                resposta_json(false, null, 'Já existe outra função com este nome');
            }
            
            // Atualizar função
            $stmt = $pdo->prepare("UPDATE funcoes SET nome = ?, descricao = ?, ativo = ?, atualizado_em = NOW() WHERE id = ?");
            $stmt->execute([$nome, $descricao, $ativo, $id]);
            
            resposta_json(true, ['id' => $id], 'Função atualizada com sucesso');
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao atualizar função: ' . $e->getMessage());
        }
        break;
    
    case 'DELETE':
        requer_permissao('base', 'excluir');
        // Excluir função
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            resposta_json(false, null, 'ID da função é obrigatório');
        }
        
        try {
            // Verificar se função existe
            $stmt = $pdo->prepare("SELECT nome FROM funcoes WHERE id = ?");
            $stmt->execute([$id]);
            $funcao = $stmt->fetch();
            
            if (!$funcao) {
                resposta_json(false, null, 'Função não encontrada');
            }
            
            // Verificar se há funcionários com esta função
            $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM funcionarios WHERE funcao = ?");
            $stmt->execute([$funcao['nome']]);
            $count = $stmt->fetch()['total'];
            
            if ($count > 0) {
                resposta_json(false, null, 'Não é possível excluir função vinculada a funcionários. Desative-a ao invés de excluir.');
            }
            
            // Excluir função
            $stmt = $pdo->prepare("DELETE FROM funcoes WHERE id = ?");
            $stmt->execute([$id]);
            
            resposta_json(true, null, 'Função excluída com sucesso');
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao excluir função: ' . $e->getMessage());
        }
        break;
    
    default:
        resposta_json(false, null, 'Método não permitido');
}

?>
