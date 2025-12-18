<?php
require_once __DIR__ . '/config.php';

$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    // ========================================
    // LISTAR PERMISSÕES DE UM USUÁRIO
    // ========================================
    case 'GET':
        requer_admin();

        $usuario_id = $_GET['usuario_id'] ?? null;

        try {
            if ($usuario_id) {
                // Permissões de usuário específico
                $stmt = $pdo->prepare("
                    SELECT
                        m.id as modulo_id,
                        m.nome as modulo_nome,
                        m.titulo as modulo_titulo,
                        m.icone,
                        m.requer_admin,
                        COALESCE(p.pode_visualizar, 0) as pode_visualizar,
                        COALESCE(p.pode_criar, 0) as pode_criar,
                        COALESCE(p.pode_editar, 0) as pode_editar,
                        COALESCE(p.pode_excluir, 0) as pode_excluir
                    FROM modulos m
                    LEFT JOIN permissoes p ON m.id = p.modulo_id AND p.usuario_id = ?
                    WHERE m.ativo = 1
                    ORDER BY m.ordem
                ");
                $stmt->execute([$usuario_id]);
                $permissoes = $stmt->fetchAll();

                resposta_json(true, $permissoes);
            } else {
                // Listar todos os módulos disponíveis
                $stmt = $pdo->query("
                    SELECT id, nome, titulo, descricao, icone, ordem, requer_admin
                    FROM modulos
                    WHERE ativo = 1
                    ORDER BY ordem
                ");
                $modulos = $stmt->fetchAll();

                resposta_json(true, $modulos);
            }
        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao buscar permissões: ' . $e->getMessage());
        }
        break;

    // ========================================
    // SALVAR PERMISSÕES DE UM USUÁRIO
    // ========================================
    case 'POST':
        requer_admin();

        $dados = obter_dados_post();

        if (empty($dados['usuario_id']) || empty($dados['permissoes'])) {
            resposta_json(false, null, 'usuario_id e permissões são obrigatórios');
        }

        $usuario_id = $dados['usuario_id'];
        $permissoes = $dados['permissoes']; // Array: [{ modulo_id, visualizar, criar, editar, excluir }]

        try {
            // Verificar se usuário existe e não é admin
            $stmt = $pdo->prepare("SELECT tipo FROM usuarios WHERE id = ?");
            $stmt->execute([$usuario_id]);
            $usuario = $stmt->fetch();

            if (!$usuario) {
                resposta_json(false, null, 'Usuário não encontrado');
            }

            if ($usuario['tipo'] === 'admin') {
                resposta_json(false, null, 'Não é possível alterar permissões de administrador');
            }

            // Deletar permissões antigas
            $stmt = $pdo->prepare("DELETE FROM permissoes WHERE usuario_id = ?");
            $stmt->execute([$usuario_id]);

            // Inserir novas permissões
            $stmt = $pdo->prepare("
                INSERT INTO permissoes
                (usuario_id, modulo_id, pode_visualizar, pode_criar, pode_editar, pode_excluir)
                VALUES (?, ?, ?, ?, ?, ?)
            ");

            foreach ($permissoes as $perm) {
                $stmt->execute([
                    $usuario_id,
                    $perm['modulo_id'],
                    $perm['pode_visualizar'] ? 1 : 0,
                    $perm['pode_criar'] ? 1 : 0,
                    $perm['pode_editar'] ? 1 : 0,
                    $perm['pode_excluir'] ? 1 : 0
                ]);
            }

            resposta_json(true, null, 'Permissões atualizadas com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao salvar permissões: ' . $e->getMessage());
        }
        break;

    default:
        resposta_json(false, null, 'Método não permitido');
}
