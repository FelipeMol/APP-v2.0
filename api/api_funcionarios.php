<?php
require_once __DIR__ . '/config.php';

// Middleware de autenticação
requer_autenticacao();

// Determinar ação baseada no método HTTP
$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    case 'GET':
        requer_permissao('funcionarios', 'visualizar');

        // Listar todos os funcionários
        try {
            $stmt = $pdo->query("SELECT * FROM funcionarios ORDER BY nome ASC");
            $funcionarios = $stmt->fetchAll();
            resposta_json(true, $funcionarios);

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao buscar funcionários: ' . $e->getMessage());
        }
        break;

    case 'POST':
        requer_permissao('funcionarios', 'criar');
        // Adicionar novo funcionário
        $dados = obter_dados_post();
        
        // Validar dados obrigatórios
        if (empty($dados['nome'])) {
            resposta_json(false, null, 'Nome é obrigatório');
        }
        
        try {
            // Sanitizar dados
            $nome = sanitizar($dados['nome']);
            $funcao = sanitizar($dados['funcao'] ?? '');
            $empresa = sanitizar($dados['empresa'] ?? '');
            $situacao = sanitizar($dados['situacao'] ?? 'Ativo');
            
            // Verificar se funcionário já existe
            $stmt = $pdo->prepare("SELECT id FROM funcionarios WHERE nome = ?");
            $stmt->execute([$nome]);
            
            if ($stmt->fetch()) {
                resposta_json(false, null, 'Funcionário com este nome já existe');
            }
            
            // Inserir funcionário
            $stmt = $pdo->prepare("INSERT INTO funcionarios (nome, funcao, empresa, situacao, criado_em) VALUES (?, ?, ?, ?, NOW())");
            $stmt->execute([$nome, $funcao, $empresa, $situacao]);
            
            $id = $pdo->lastInsertId();
            resposta_json(true, ['id' => $id], 'Funcionário adicionado com sucesso');
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao salvar funcionário: ' . $e->getMessage());
        }
        break;
    
    case 'DELETE':
        requer_permissao('funcionarios', 'excluir');

        // Excluir funcionário
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            resposta_json(false, null, 'ID do funcionário é obrigatório');
        }
        
        try {
            // Verificar se funcionário existe
            $stmt = $pdo->prepare("SELECT nome FROM funcionarios WHERE id = ?");
            $stmt->execute([$id]);
            $funcionario = $stmt->fetch();
            
            if (!$funcionario) {
                resposta_json(false, null, 'Funcionário não encontrado');
            }
            
            // Verificar se há lançamentos vinculados (busca pelo nome do funcionário)
            $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM lancamentos WHERE funcionario = ?");
            $stmt->execute([$funcionario['nome']]);
            $count = $stmt->fetch()['total'];
            
            if ($count > 0) {
                resposta_json(false, null, 'Não é possível excluir funcionário com lançamentos vinculados');
            }
            
            // Excluir funcionário
            $stmt = $pdo->prepare("DELETE FROM funcionarios WHERE id = ?");
            $stmt->execute([$id]);
            
            resposta_json(true, null, 'Funcionário excluído com sucesso');
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao excluir funcionário: ' . $e->getMessage());
        }
        break;

    case 'PUT':
        requer_permissao('funcionarios', 'editar');
        // Atualizar funcionário
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            resposta_json(false, null, 'ID do funcionário é obrigatório');
        }
        
        $dados = obter_dados_post();
        
        // Validar dados obrigatórios
        if (empty($dados['nome'])) {
            resposta_json(false, null, 'Nome é obrigatório');
        }
        
        try {
            // Verificar se funcionário existe
            $stmt = $pdo->prepare("SELECT nome FROM funcionarios WHERE id = ?");
            $stmt->execute([$id]);
            $funcionarioAntigo = $stmt->fetch();
            
            if (!$funcionarioAntigo) {
                resposta_json(false, null, 'Funcionário não encontrado');
            }
            
            // Sanitizar dados
            $nome = sanitizar($dados['nome']);
            $funcao = sanitizar($dados['funcao'] ?? '');
            $empresa = sanitizar($dados['empresa'] ?? '');
            $situacao = sanitizar($dados['situacao'] ?? 'Ativo');
            
            // Verificar se novo nome já existe em outro registro
            if ($nome !== $funcionarioAntigo['nome']) {
                $stmt = $pdo->prepare("SELECT id FROM funcionarios WHERE nome = ? AND id != ?");
                $stmt->execute([$nome, $id]);
                
                if ($stmt->fetch()) {
                    resposta_json(false, null, 'Já existe outro funcionário com este nome');
                }
            }
            
            // Atualizar funcionário
            $stmt = $pdo->prepare("UPDATE funcionarios SET nome = ?, funcao = ?, empresa = ?, situacao = ?, atualizado_em = NOW() WHERE id = ?");
            $stmt->execute([$nome, $funcao, $empresa, $situacao, $id]);
            
            // Se o nome mudou, atualizar lançamentos relacionados
            if ($nome !== $funcionarioAntigo['nome']) {
                $stmt = $pdo->prepare("UPDATE lancamentos SET funcionario = ? WHERE funcionario = ?");
                $stmt->execute([$nome, $funcionarioAntigo['nome']]);
            }
            
            resposta_json(true, ['id' => $id], 'Funcionário atualizado com sucesso');
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao atualizar funcionário: ' . $e->getMessage());
        }
        break;
    
    default:
        resposta_json(false, null, 'Método não permitido');
}

?>