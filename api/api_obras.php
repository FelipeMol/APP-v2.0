<?php
require_once __DIR__ . '/config.php';

// Middleware de autenticação
requer_autenticacao();

// Determinar ação baseada no método HTTP
$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    case 'GET':
        requer_permissao('obras', 'visualizar');

        // Listar todas as obras
        try {
            $stmt = $pdo->query("SELECT * FROM obras ORDER BY nome ASC");
            $obras = $stmt->fetchAll();
            resposta_json(true, $obras);
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao buscar obras: ' . $e->getMessage());
        }
        break;
    
    case 'POST':
        requer_permissao('obras', 'criar');

        // Adicionar nova obra
        $dados = obter_dados_post();
        
        // Validar dados obrigatórios
        if (empty($dados['nome'])) {
            resposta_json(false, null, 'Nome da obra é obrigatório');
        }
        
        try {
            // Sanitizar dados
            $nome = sanitizar($dados['nome']);
            $responsavel = sanitizar($dados['responsavel'] ?? '');
            $cidade = sanitizar($dados['cidade'] ?? '');
            
            // Verificar se obra já existe
            $stmt = $pdo->prepare("SELECT id FROM obras WHERE nome = ?");
            $stmt->execute([$nome]);
            
            if ($stmt->fetch()) {
                resposta_json(false, null, 'Obra com este nome já existe');
            }
            
            // Inserir obra
            $stmt = $pdo->prepare("INSERT INTO obras (nome, responsavel, cidade, criado_em) VALUES (?, ?, ?, NOW())");
            $stmt->execute([$nome, $responsavel, $cidade]);
            
            $id = $pdo->lastInsertId();
            resposta_json(true, ['id' => $id], 'Obra adicionada com sucesso');
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao salvar obra: ' . $e->getMessage());
        }
        break;

    case 'PUT':
        requer_permissao('obras', 'editar');
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            resposta_json(false, null, 'ID da obra é obrigatório');
        }
        
        $dados = obter_dados_post();
        
        if (empty($dados['nome'])) {
            resposta_json(false, null, 'Nome da obra é obrigatório');
        }
        
        try {
            // Verificar se obra existe
            $stmt = $pdo->prepare("SELECT nome FROM obras WHERE id = ?");
            $stmt->execute([$id]);
            $obraAtual = $stmt->fetch();
            
            if (!$obraAtual) {
                resposta_json(false, null, 'Obra não encontrada');
            }
            
            $nome = sanitizar($dados['nome']);
            $responsavel = sanitizar($dados['responsavel'] ?? '');
            $cidade = sanitizar($dados['cidade'] ?? '');
            
            // Verificar se novo nome já existe (exceto se for o mesmo)
            if ($nome !== $obraAtual['nome']) {
                $stmt = $pdo->prepare("SELECT id FROM obras WHERE nome = ? AND id != ?");
                $stmt->execute([$nome, $id]);
                
                if ($stmt->fetch()) {
                    resposta_json(false, null, 'Já existe outra obra com este nome');
                }
            }
            
            // Atualizar obra
            $stmt = $pdo->prepare("UPDATE obras SET nome = ?, responsavel = ?, cidade = ? WHERE id = ?");
            $stmt->execute([$nome, $responsavel, $cidade, $id]);
            
            // Se nome mudou, atualizar referências em lançamentos
            if ($nome !== $obraAtual['nome']) {
                $stmt = $pdo->prepare("UPDATE lancamentos SET obra = ? WHERE obra = ?");
                $stmt->execute([$nome, $obraAtual['nome']]);
            }
            
            resposta_json(true, null, 'Obra atualizada com sucesso');
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao atualizar obra: ' . $e->getMessage());
        }
        break;

    case 'DELETE':
        requer_permissao('obras', 'excluir');
        // Excluir obra
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            resposta_json(false, null, 'ID da obra é obrigatório');
        }
        
        try {
            // Verificar se obra existe
            $stmt = $pdo->prepare("SELECT nome FROM obras WHERE id = ?");
            $stmt->execute([$id]);
            $obra = $stmt->fetch();
            
            if (!$obra) {
                resposta_json(false, null, 'Obra não encontrada');
            }
            
            // Verificar se há lançamentos vinculados
            $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM lancamentos WHERE obra = ?");
            $stmt->execute([$obra['nome']]);
            $count = $stmt->fetch()['total'];
            
            if ($count > 0) {
                resposta_json(false, null, 'Não é possível excluir obra com lançamentos vinculados');
            }
            
            // Excluir obra
            $stmt = $pdo->prepare("DELETE FROM obras WHERE id = ?");
            $stmt->execute([$id]);
            
            resposta_json(true, null, 'Obra excluída com sucesso');
            
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao excluir obra: ' . $e->getMessage());
        }
        break;
    
    default:
        resposta_json(false, null, 'Método não permitido');
}

?>