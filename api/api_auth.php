<?php
require_once __DIR__ . '/config.php';

$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    // ========================================
    // LOGIN
    // ========================================
    case 'POST':
        $dados = obter_dados_post();

        // Determinar ação (login, refresh, trocar_senha)
        $acao = $dados['acao'] ?? 'login';

        if ($acao === 'login') {
            // Validar campos obrigatórios
            if (empty($dados['usuario']) || empty($dados['senha'])) {
                resposta_json(false, null, 'Usuário e senha são obrigatórios');
            }

            try {
                // Log para debug
                error_log("Tentativa de login - Usuário: {$dados['usuario']}");

                // Buscar usuário
                $stmt = $pdo->prepare("
                    SELECT id, nome, usuario, email, senha, tipo, ativo,
                           primeiro_acesso, token_versao, ultimo_login
                    FROM usuarios
                    WHERE usuario = ? OR email = ?
                ");
                $stmt->execute([$dados['usuario'], $dados['usuario']]);
                $usuario = $stmt->fetch();

                if (!$usuario) {
                    error_log("Login falhou - Usuário não encontrado: {$dados['usuario']}");
                    resposta_json(false, null, 'Usuário ou senha incorretos');
                }

                // Verificar se está ativo
                if ($usuario['ativo'] !== 'Sim') {
                    resposta_json(false, null, 'Usuário desativado. Contate o administrador.');
                }

                // Verificar senha
                $senha_valida = password_verify($dados['senha'], $usuario['senha']);
                error_log("Verificação de senha - Usuário: {$usuario['usuario']}, Senha válida: " . ($senha_valida ? 'SIM' : 'NÃO'));

                if (!$senha_valida) {
                    resposta_json(false, null, 'Usuário ou senha incorretos');
                }

                // Atualizar último login
                $stmt = $pdo->prepare("UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?");
                $stmt->execute([$usuario['id']]);

                // Gerar token JWT
                $payload_token = [
                    'id' => $usuario['id'],
                    'nome' => $usuario['nome'],
                    'email' => $usuario['email'],
                    'tipo' => $usuario['tipo'],
                    'token_versao' => $usuario['token_versao']
                ];

                $token = gerar_jwt($payload_token);

                // Buscar permissões do usuário
                $permissoes = [];
                if ($usuario['tipo'] !== 'admin') {
                    $stmt = $pdo->prepare("
                        SELECT
                            m.nome as modulo,
                            p.pode_visualizar,
                            p.pode_criar,
                            p.pode_editar,
                            p.pode_excluir
                        FROM permissoes p
                        INNER JOIN modulos m ON p.modulo_id = m.id
                        WHERE p.usuario_id = ? AND m.ativo = 1
                    ");
                    $stmt->execute([$usuario['id']]);
                    $permissoes = $stmt->fetchAll();
                }

                // Resposta
                resposta_json(true, [
                    'token' => $token,
                    'usuario' => [
                        'id' => $usuario['id'],
                        'nome' => $usuario['nome'],
                        'email' => $usuario['email'],
                        'tipo' => $usuario['tipo'],
                        'primeiro_acesso' => (bool)$usuario['primeiro_acesso']
                    ],
                    'permissoes' => $permissoes,
                    'expira_em' => JWT_EXPIRATION
                ], 'Login realizado com sucesso');

            } catch (PDOException $e) {
                resposta_json(false, null, 'Erro ao fazer login: ' . $e->getMessage());
            }
        }

        // ========================================
        // TROCAR SENHA
        // ========================================
        elseif ($acao === 'trocar_senha') {
            $payload = requer_autenticacao(); // Middleware

            if (empty($dados['senha_atual']) || empty($dados['senha_nova'])) {
                resposta_json(false, null, 'Senha atual e nova senha são obrigatórias');
            }

            if (strlen($dados['senha_nova']) < 6) {
                resposta_json(false, null, 'Senha deve ter no mínimo 6 caracteres');
            }

            try {
                // Buscar senha atual
                $stmt = $pdo->prepare("SELECT senha, token_versao FROM usuarios WHERE id = ?");
                $stmt->execute([$payload['id']]);
                $usuario = $stmt->fetch();

                // Verificar senha atual
                if (!password_verify($dados['senha_atual'], $usuario['senha'])) {
                    resposta_json(false, null, 'Senha atual incorreta');
                }

                // Atualizar senha e incrementar token_versao (invalida tokens antigos)
                $nova_senha_hash = password_hash($dados['senha_nova'], PASSWORD_BCRYPT);
                $novo_token_versao = (int)$usuario['token_versao'] + 1;

                $stmt = $pdo->prepare("
                    UPDATE usuarios
                    SET senha = ?,
                        token_versao = ?,
                        primeiro_acesso = 0
                    WHERE id = ?
                ");
                $stmt->execute([$nova_senha_hash, $novo_token_versao, $payload['id']]);

                // Gerar novo token
                $novo_payload = $payload;
                $novo_payload['token_versao'] = $novo_token_versao;
                $novo_token = gerar_jwt($novo_payload);

                resposta_json(true, [
                    'token' => $novo_token
                ], 'Senha alterada com sucesso');

            } catch (PDOException $e) {
                resposta_json(false, null, 'Erro ao trocar senha: ' . $e->getMessage());
            }
        }

        // ========================================
        // REFRESH TOKEN
        // ========================================
        elseif ($acao === 'refresh') {
            $payload = requer_autenticacao(); // Valida token atual

            // Gerar novo token com mesma versão
            $novo_token = gerar_jwt($payload);

            resposta_json(true, [
                'token' => $novo_token,
                'expira_em' => JWT_EXPIRATION
            ], 'Token renovado');
        }

        else {
            resposta_json(false, null, 'Ação inválida');
        }
        break;

    // ========================================
    // VALIDAR TOKEN (GET)
    // ========================================
    case 'GET':
        $payload = requer_autenticacao();

        // Buscar dados atualizados do usuário
        $stmt = $pdo->prepare("
            SELECT id, nome, email, tipo, ativo, primeiro_acesso
            FROM usuarios WHERE id = ?
        ");
        $stmt->execute([$payload['id']]);
        $usuario = $stmt->fetch();

        // Buscar permissões
        $permissoes = [];
        if ($usuario['tipo'] !== 'admin') {
            $stmt = $pdo->prepare("
                SELECT
                    m.nome as modulo,
                    p.pode_visualizar,
                    p.pode_criar,
                    p.pode_editar,
                    p.pode_excluir
                FROM permissoes p
                INNER JOIN modulos m ON p.modulo_id = m.id
                WHERE p.usuario_id = ? AND m.ativo = 1
            ");
            $stmt->execute([$payload['id']]);
            $permissoes = $stmt->fetchAll();
        }

        resposta_json(true, [
            'usuario' => $usuario,
            'permissoes' => $permissoes
        ]);
        break;

    default:
        resposta_json(false, null, 'Método não permitido');
}
