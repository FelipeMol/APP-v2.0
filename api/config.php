<?php
// Produção: não exibir erros no output para preservar JSON limpo
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// Registrar erros em log (ajuste caminho conforme hospedagem)
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');

// Handler que evita imprimir HTML de warnings/notices
set_error_handler(function ($severity, $message, $file, $line) {
    // Loga e evita echo automático de erros, mantendo resposta JSON intacta
    error_log("[PHP:$severity] $message in $file on line $line");
    // Retorna true para impedir o handler padrão de exibir o erro
    return true;
});
// ========================================
// CONFIGURAÇÃO BANCO DE DADOS - HOSTGATOR
// ========================================

// ATENÇÃO: Configure estas variáveis no HostGator
$host = 'localhost';
$dbname = 'hg253b74_controleobras'; // Nome do banco (confirmado no cPanel)
$username = 'hg253b74_Felipe';     // Usuário MySQL (confirmado no cPanel)
$password = 'Warning81#';       // Senha do usuário

// DEBUG: Log das credenciais sendo usadas (REMOVER EM PRODUÇÃO)
error_log("CONFIG.PHP - Tentando conectar: host=$host, db=$dbname, user=$username");

// Headers para permitir requisições AJAX (apenas para APIs)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
// Mantém JSON como padrão das APIs; páginas HTML não devem incluir este arquivo
header('Content-Type: application/json; charset=UTF-8');

// Responder a requisições OPTIONS (preflight CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Conectar ao banco MySQL
try {
    $pdo = new PDO(
        "mysql:host={$host};dbname={$dbname};charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false
        ]
    );
    
} catch (PDOException $e) {
    // Retornar erro em formato JSON
    http_response_code(500);
    echo json_encode([
        'sucesso' => false,
        'mensagem' => 'Erro de conexão com banco de dados',
        'erro' => $e->getMessage(),
        'dsn' => "mysql:host={$host};dbname={$dbname};charset=utf8mb4",
        'usuario' => $username
    ]);
    exit();
}

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

// Função para retornar resposta JSON padronizada
function resposta_json($sucesso, $dados = null, $mensagem = '') {
    echo json_encode([
        'sucesso' => $sucesso,
        'dados' => $dados,
        'mensagem' => $mensagem,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// Função para sanitizar dados de entrada
function sanitizar($valor) {
    if (is_null($valor)) return null;
    return htmlspecialchars(strip_tags(trim($valor)), ENT_QUOTES, 'UTF-8');
}

// Função para validar método HTTP
function validar_metodo($metodo_esperado) {
    if ($_SERVER['REQUEST_METHOD'] !== $metodo_esperado) {
        resposta_json(false, null, "Método {$metodo_esperado} esperado");
    }
}

// Função para obter dados JSON do POST
function obter_dados_post() {
    $input = file_get_contents('php://input');
    $dados = json_decode($input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        resposta_json(false, null, 'Dados JSON inválidos');
    }

    return $dados ?: [];
}

// ========================================
// FUNÇÕES DE AUTENTICAÇÃO JWT
// ========================================

// Chave secreta para assinar tokens (TROCAR EM PRODUÇÃO!)
define('JWT_SECRET', 'SuaChaveSecretaSuperSegura2025!ViviControlObras#');
define('JWT_ALGORITHM', 'HS256');
define('JWT_EXPIRATION', 8 * 3600); // 8 horas em segundos

/**
 * Implementação simples de JWT sem dependências externas
 * Compatível com HostGator shared hosting
 */

// Base64 URL encode
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

// Base64 URL decode
function base64url_decode($data) {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
}

/**
 * Gerar token JWT
 * @param array $payload - Dados do usuário
 * @return string Token JWT
 */
function gerar_jwt($payload) {
    // Header
    $header = json_encode(['typ' => 'JWT', 'alg' => JWT_ALGORITHM]);

    // Payload com expiração
    $payload['iat'] = time(); // Issued at
    $payload['exp'] = time() + JWT_EXPIRATION; // Expiration
    $payload_json = json_encode($payload);

    // Codificar
    $base64_header = base64url_encode($header);
    $base64_payload = base64url_encode($payload_json);

    // Assinar
    $signature = hash_hmac('sha256', "$base64_header.$base64_payload", JWT_SECRET, true);
    $base64_signature = base64url_encode($signature);

    return "$base64_header.$base64_payload.$base64_signature";
}

/**
 * Validar e decodificar token JWT
 * @param string $token - Token JWT
 * @return array|false - Payload ou false se inválido
 */
function validar_jwt($token) {
    if (empty($token)) {
        return false;
    }

    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }

    list($base64_header, $base64_payload, $base64_signature) = $parts;

    // Verificar assinatura
    $signature = base64url_decode($base64_signature);
    $expected_signature = hash_hmac('sha256', "$base64_header.$base64_payload", JWT_SECRET, true);

    if (!hash_equals($signature, $expected_signature)) {
        return false; // Assinatura inválida
    }

    // Decodificar payload
    $payload = json_decode(base64url_decode($base64_payload), true);

    // Verificar expiração
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return false; // Token expirado
    }

    return $payload;
}

/**
 * Obter token JWT do header Authorization
 * @return string|null Token ou null
 */
function obter_token_do_header() {
    $headers = getallheaders();

    // Tentar pegar do header Authorization
    if (isset($headers['Authorization'])) {
        $auth = $headers['Authorization'];
        if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
            return $matches[1];
        }
    }

    // Fallback: tentar pegar de HTTP_AUTHORIZATION (HostGator)
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth = $_SERVER['HTTP_AUTHORIZATION'];
        if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
            return $matches[1];
        }
    }

    return null;
}

/**
 * Verificar autenticação (middleware)
 * Retorna payload do usuário ou encerra com erro 401
 */
function requer_autenticacao() {
    global $pdo;

    $token = obter_token_do_header();

    if (!$token) {
        http_response_code(401);
        resposta_json(false, null, 'Token não fornecido');
    }

    $payload = validar_jwt($token);

    if (!$payload) {
        http_response_code(401);
        resposta_json(false, null, 'Token inválido ou expirado');
    }

    // Verificar se usuário ainda existe e está ativo
    $stmt = $pdo->prepare("
        SELECT id, nome, email, tipo, ativo, token_versao
        FROM usuarios
        WHERE id = ?
    ");
    $stmt->execute([$payload['id']]);
    $usuario = $stmt->fetch();

    if (!$usuario) {
        http_response_code(401);
        resposta_json(false, null, 'Usuário não encontrado');
    }

    if ($usuario['ativo'] !== 'Sim') {
        http_response_code(403);
        resposta_json(false, null, 'Usuário desativado');
    }

    // Verificar token_versao (invalida tokens antigos se senha foi trocada)
    if (isset($payload['token_versao']) && $payload['token_versao'] !== (int)$usuario['token_versao']) {
        http_response_code(401);
        resposta_json(false, null, 'Token inválido (senha foi alterada)');
    }

    return $payload;
}

/**
 * Verificar se usuário é admin
 */
function requer_admin() {
    global $pdo;

    $payload = requer_autenticacao();

    $stmt = $pdo->prepare("SELECT tipo FROM usuarios WHERE id = ?");
    $stmt->execute([$payload['id']]);
    $usuario = $stmt->fetch();

    if ($usuario['tipo'] !== 'admin') {
        http_response_code(403);
        resposta_json(false, null, 'Acesso negado: requer permissões de administrador');
    }

    return $payload;
}

/**
 * Verificar permissão específica em um módulo
 * @param string $modulo_nome - Nome do módulo
 * @param string $acao - 'visualizar', 'criar', 'editar', 'excluir'
 * @return bool
 */
function verificar_permissao($modulo_nome, $acao) {
    global $pdo;

    $payload = requer_autenticacao();
    $usuario_id = $payload['id'];

    // Admin sempre tem permissão total
    $stmt = $pdo->prepare("SELECT tipo FROM usuarios WHERE id = ?");
    $stmt->execute([$usuario_id]);
    $usuario = $stmt->fetch();

    if ($usuario['tipo'] === 'admin') {
        return true;
    }

    // Verificar permissão específica
    $campo_permissao = "pode_" . $acao;

    $stmt = $pdo->prepare("
        SELECT p.{$campo_permissao}
        FROM permissoes p
        INNER JOIN modulos m ON p.modulo_id = m.id
        WHERE p.usuario_id = ? AND m.nome = ?
    ");
    $stmt->execute([$usuario_id, $modulo_nome]);
    $permissao = $stmt->fetch();

    return $permissao && $permissao[$campo_permissao] == 1;
}

/**
 * Middleware que verifica permissão e retorna 403 se negado
 */
function requer_permissao($modulo_nome, $acao) {
    if (!verificar_permissao($modulo_nome, $acao)) {
        http_response_code(403);
        resposta_json(false, null, "Sem permissão para {$acao} em {$modulo_nome}");
    }
}

/**
 * Obter dados completos do usuário autenticado
 */
function obter_usuario_autenticado() {
    global $pdo;

    $payload = requer_autenticacao();

    $stmt = $pdo->prepare("SELECT id, nome, email, tipo, ativo, token_versao FROM usuarios WHERE id = ?");
    $stmt->execute([$payload['id']]);
    $usuario = $stmt->fetch();

    if (!$usuario) {
        http_response_code(401);
        resposta_json(false, null, 'Usuário não encontrado');
    }

    return $usuario;
}

/**
 * Obter permissões de um usuário (todas as permissões de todos os módulos)
 * @param PDO $pdo
 * @param int $usuario_id
 * @return array Array associativo com nome_modulo => permissões
 */
function obter_permissoes_usuario($pdo, $usuario_id) {
    $stmt = $pdo->prepare("
        SELECT
            m.nome as modulo,
            COALESCE(p.pode_visualizar, 0) as pode_visualizar,
            COALESCE(p.pode_criar, 0) as pode_criar,
            COALESCE(p.pode_editar, 0) as pode_editar,
            COALESCE(p.pode_excluir, 0) as pode_excluir
        FROM modulos m
        LEFT JOIN permissoes p ON p.modulo_id = m.id AND p.usuario_id = ?
        WHERE m.ativo = 1
    ");
    $stmt->execute([$usuario_id]);

    $permissoes = [];
    while ($row = $stmt->fetch()) {
        $permissoes[$row['modulo']] = [
            'pode_visualizar' => (bool)$row['pode_visualizar'],
            'pode_criar' => (bool)$row['pode_criar'],
            'pode_editar' => (bool)$row['pode_editar'],
            'pode_excluir' => (bool)$row['pode_excluir']
        ];
    }

    return $permissoes;
}

/**
 * Verificar se usuário tem permissão específica
 * @param array $permissoes Array de permissões (retorno de obter_permissoes_usuario)
 * @param string $modulo Nome do módulo
 * @param string $acao Nome da ação (ex: 'pode_visualizar')
 * @return bool
 */
function tem_permissao($permissoes, $modulo, $acao) {
    if (!isset($permissoes[$modulo])) {
        return false;
    }

    if (!isset($permissoes[$modulo][$acao])) {
        return false;
    }

    return $permissoes[$modulo][$acao] === true;
}

// Importante: sem tag de fechamento PHP para evitar espaços/BOM que quebram headers
