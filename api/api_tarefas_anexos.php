<?php
/**
 * API REST: Tarefas - Anexos (Upload de arquivos)
 *
 * Gerencia upload e download de arquivos anexados a tarefas
 * Endpoints: GET, POST, DELETE
 */

require_once __DIR__ . '/config.php';

// Middleware de autenticação
requer_autenticacao();

$metodo = $_SERVER['REQUEST_METHOD'];

// Diretório de upload
$upload_dir = __DIR__ . '/uploads/tarefas/';

// Criar diretório se não existir
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0755, true);
}

switch ($metodo) {
    case 'GET':
        // Listar anexos de uma tarefa OU fazer download de um anexo específico
        requer_permissao('tarefas', 'visualizar');

        // Download de arquivo específico
        if (!empty($_GET['download']) && !empty($_GET['id'])) {
            $id = intval($_GET['id']);

            try {
                // Buscar anexo
                $stmt = $pdo->prepare("SELECT * FROM tarefas_anexos WHERE id = ?");
                $stmt->execute([$id]);
                $anexo = $stmt->fetch();

                if (!$anexo) {
                    resposta_json(false, null, 'Anexo não encontrado');
                }

                $arquivo_path = $upload_dir . $anexo['nome_arquivo'];

                if (!file_exists($arquivo_path)) {
                    resposta_json(false, null, 'Arquivo não encontrado no servidor');
                }

                // Fazer download
                header('Content-Type: ' . $anexo['tipo_mime']);
                header('Content-Disposition: attachment; filename="' . $anexo['nome_original'] . '"');
                header('Content-Length: ' . filesize($arquivo_path));
                readfile($arquivo_path);
                exit;

            } catch (PDOException $e) {
                resposta_json(false, null, 'Erro ao buscar anexo: ' . $e->getMessage());
            }
        }

        // Listar anexos de uma tarefa
        if (empty($_GET['tarefa_id'])) {
            resposta_json(false, null, 'ID da tarefa é obrigatório');
        }

        $tarefa_id = intval($_GET['tarefa_id']);

        try {
            // Verificar se tarefa existe
            $stmt = $pdo->prepare("SELECT id FROM tarefas WHERE id = ?");
            $stmt->execute([$tarefa_id]);

            if (!$stmt->fetch()) {
                resposta_json(false, null, 'Tarefa não encontrada');
            }

            // Buscar anexos da tarefa
            $stmt = $pdo->prepare("
                SELECT
                    a.id,
                    a.tarefa_id,
                    a.nome_original,
                    a.nome_arquivo,
                    a.caminho,
                    a.tamanho,
                    a.tipo_mime,
                    a.usuario_id,
                    a.criado_em,
                    u.nome AS usuario_nome
                FROM tarefas_anexos a
                INNER JOIN usuarios u ON a.usuario_id = u.id
                WHERE a.tarefa_id = ?
                ORDER BY a.criado_em DESC
            ");
            $stmt->execute([$tarefa_id]);
            $anexos = $stmt->fetchAll();

            // Adicionar informações extras
            foreach ($anexos as &$anexo) {
                // URL de download
                $anexo['download_url'] = "api_tarefas_anexos.php?download=1&id={$anexo['id']}";

                // Tamanho formatado
                $anexo['tamanho_formatado'] = formatarTamanhoArquivo($anexo['tamanho']);

                // Se for imagem, adicionar URL de visualização
                if (strpos($anexo['tipo_mime'], 'image/') === 0) {
                    $anexo['preview_url'] = "uploads/tarefas/{$anexo['nome_arquivo']}";
                    $anexo['is_imagem'] = true;
                } else {
                    $anexo['is_imagem'] = false;
                }
            }

            resposta_json(true, $anexos);

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao buscar anexos: ' . $e->getMessage());
        }
        break;

    case 'POST':
        // Upload de novo anexo
        requer_permissao('tarefas', 'editar');

        // Validações
        if (empty($_POST['tarefa_id'])) {
            resposta_json(false, null, 'ID da tarefa é obrigatório');
        }

        if (empty($_FILES['arquivo'])) {
            resposta_json(false, null, 'Nenhum arquivo foi enviado');
        }

        $tarefa_id = intval($_POST['tarefa_id']);
        $arquivo = $_FILES['arquivo'];

        // Verificar erros no upload
        if ($arquivo['error'] !== UPLOAD_ERR_OK) {
            $erros_upload = [
                UPLOAD_ERR_INI_SIZE => 'O arquivo excede o tamanho máximo permitido pelo servidor',
                UPLOAD_ERR_FORM_SIZE => 'O arquivo excede o tamanho máximo permitido',
                UPLOAD_ERR_PARTIAL => 'O arquivo foi enviado parcialmente',
                UPLOAD_ERR_NO_FILE => 'Nenhum arquivo foi enviado',
                UPLOAD_ERR_NO_TMP_DIR => 'Pasta temporária não encontrada',
                UPLOAD_ERR_CANT_WRITE => 'Falha ao gravar arquivo no disco',
                UPLOAD_ERR_EXTENSION => 'Upload bloqueado por extensão'
            ];
            $mensagem_erro = $erros_upload[$arquivo['error']] ?? 'Erro desconhecido no upload';
            resposta_json(false, null, $mensagem_erro);
        }

        // Tamanho máximo: 10MB
        $tamanho_maximo = 10 * 1024 * 1024; // 10MB em bytes
        if ($arquivo['size'] > $tamanho_maximo) {
            resposta_json(false, null, 'Arquivo muito grande. Tamanho máximo: 10MB');
        }

        // Tipos permitidos (pode ser configurado)
        $tipos_perigosos = ['application/x-php', 'application/x-httpd-php', 'text/x-php'];
        if (in_array($arquivo['type'], $tipos_perigosos)) {
            resposta_json(false, null, 'Tipo de arquivo não permitido por questões de segurança');
        }

        try {
            // Verificar se tarefa existe
            $stmt = $pdo->prepare("SELECT titulo FROM tarefas WHERE id = ?");
            $stmt->execute([$tarefa_id]);
            $tarefa = $stmt->fetch();

            if (!$tarefa) {
                resposta_json(false, null, 'Tarefa não encontrada');
            }

            // Gerar nome único para o arquivo
            $extensao = pathinfo($arquivo['name'], PATHINFO_EXTENSION);
            $nome_arquivo = uniqid('tarefa_' . $tarefa_id . '_', true) . '.' . $extensao;
            $caminho_completo = $upload_dir . $nome_arquivo;
            $caminho_relativo = 'uploads/tarefas/' . $nome_arquivo;

            // Mover arquivo para diretório de uploads
            if (!move_uploaded_file($arquivo['tmp_name'], $caminho_completo)) {
                resposta_json(false, null, 'Erro ao salvar arquivo no servidor');
            }

            // Obter usuário autenticado
            $usuario = obter_usuario_autenticado();

            // Inserir registro no banco
            $stmt = $pdo->prepare("
                INSERT INTO tarefas_anexos (
                    tarefa_id,
                    nome_original,
                    nome_arquivo,
                    caminho,
                    tamanho,
                    tipo_mime,
                    usuario_id,
                    criado_em
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $tarefa_id,
                $arquivo['name'],
                $nome_arquivo,
                $caminho_relativo,
                $arquivo['size'],
                $arquivo['type'],
                $usuario['id']
            ]);

            $id = $pdo->lastInsertId();

            // Registrar atividade
            $stmt = $pdo->prepare("
                INSERT INTO tarefas_atividades (tarefa_id, usuario_id, acao, descricao, criado_em)
                VALUES (?, ?, 'anexo_adicionado', ?, NOW())
            ");
            $stmt->execute([
                $tarefa_id,
                $usuario['id'],
                "Adicionou o anexo '{$arquivo['name']}'"
            ]);

            // Buscar anexo criado com dados completos
            $stmt = $pdo->prepare("
                SELECT
                    a.*,
                    u.nome AS usuario_nome
                FROM tarefas_anexos a
                INNER JOIN usuarios u ON a.usuario_id = u.id
                WHERE a.id = ?
            ");
            $stmt->execute([$id]);
            $anexo = $stmt->fetch();

            // Adicionar informações extras
            $anexo['download_url'] = "api_tarefas_anexos.php?download=1&id={$anexo['id']}";
            $anexo['tamanho_formatado'] = formatarTamanhoArquivo($anexo['tamanho']);

            if (strpos($anexo['tipo_mime'], 'image/') === 0) {
                $anexo['preview_url'] = $caminho_relativo;
                $anexo['is_imagem'] = true;
            } else {
                $anexo['is_imagem'] = false;
            }

            resposta_json(true, $anexo, 'Arquivo anexado com sucesso');

        } catch (PDOException $e) {
            // Se houve erro no banco, tentar remover arquivo enviado
            if (isset($caminho_completo) && file_exists($caminho_completo)) {
                unlink($caminho_completo);
            }
            resposta_json(false, null, 'Erro ao anexar arquivo: ' . $e->getMessage());
        }
        break;

    case 'DELETE':
        // Excluir anexo
        requer_permissao('tarefas', 'editar');

        if (empty($_GET['id'])) {
            resposta_json(false, null, 'ID do anexo é obrigatório');
        }

        $id = intval($_GET['id']);

        try {
            // Buscar anexo antes de excluir
            $stmt = $pdo->prepare("SELECT * FROM tarefas_anexos WHERE id = ?");
            $stmt->execute([$id]);
            $anexo = $stmt->fetch();

            if (!$anexo) {
                resposta_json(false, null, 'Anexo não encontrado');
            }

            // Excluir registro do banco
            $stmt = $pdo->prepare("DELETE FROM tarefas_anexos WHERE id = ?");
            $stmt->execute([$id]);

            // Tentar excluir arquivo físico
            $arquivo_path = $upload_dir . $anexo['nome_arquivo'];
            if (file_exists($arquivo_path)) {
                unlink($arquivo_path);
            }

            // Registrar atividade
            $usuario = obter_usuario_autenticado();
            $stmt = $pdo->prepare("
                INSERT INTO tarefas_atividades (tarefa_id, usuario_id, acao, descricao, criado_em)
                VALUES (?, ?, 'anexo_removido', ?, NOW())
            ");
            $stmt->execute([
                $anexo['tarefa_id'],
                $usuario['id'],
                "Removeu o anexo '{$anexo['nome_original']}'"
            ]);

            resposta_json(true, ['id' => $id], 'Anexo removido com sucesso');

        } catch (PDOException $e) {
            resposta_json(false, null, 'Erro ao excluir anexo: ' . $e->getMessage());
        }
        break;

    default:
        resposta_json(false, null, 'Método HTTP não suportado');
        break;
}

/**
 * Formatar tamanho de arquivo em formato legível
 */
function formatarTamanhoArquivo($bytes) {
    if ($bytes >= 1073741824) {
        return number_format($bytes / 1073741824, 2) . ' GB';
    } elseif ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2) . ' MB';
    } elseif ($bytes >= 1024) {
        return number_format($bytes / 1024, 2) . ' KB';
    } else {
        return $bytes . ' bytes';
    }
}
