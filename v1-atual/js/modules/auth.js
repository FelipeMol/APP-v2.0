// ========================================
// MÓDULO DE AUTENTICAÇÃO
// ========================================

import { API_CONFIG } from './config.js';

const TOKEN_KEY = 'controle_obras_token';
const USER_KEY = 'controle_obras_user';
const PERMISSIONS_KEY = 'controle_obras_permissions';

/**
 * Salvar no localStorage
 */
function salvarLocal(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('Erro ao salvar no localStorage:', e);
    }
}

/**
 * Carregar do localStorage
 */
function carregarLocal(key) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    } catch (e) {
        console.error('Erro ao carregar do localStorage:', e);
        return null;
    }
}

/**
 * Remover do localStorage
 */
function removerLocal(key) {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.error('Erro ao remover do localStorage:', e);
    }
}

/**
 * Fazer login
 */
export async function login(usuario, senha) {
    try {
        const response = await fetch(API_CONFIG.baseURL + API_CONFIG.endpoints.auth, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                acao: 'login',
                usuario,
                senha
            })
        });

        const result = await response.json();

        if (result.sucesso) {
            // Salvar token e dados do usuário
            salvarLocal(TOKEN_KEY, result.dados.token);
            salvarLocal(USER_KEY, result.dados.usuario);
            salvarLocal(PERMISSIONS_KEY, result.dados.permissoes || []);

            return result;
        } else {
            throw new Error(result.mensagem);
        }
    } catch (error) {
        console.error('Erro no login:', error);
        throw error;
    }
}

/**
 * Fazer logout
 */
export function logout() {
    removerLocal(TOKEN_KEY);
    removerLocal(USER_KEY);
    removerLocal(PERMISSIONS_KEY);
    window.location.reload(); // Recarrega para mostrar tela de login
}

/**
 * Verificar se está autenticado
 */
export function estaAutenticado() {
    const token = carregarLocal(TOKEN_KEY);
    return !!token;
}

/**
 * Obter token JWT
 */
export function obterToken() {
    return carregarLocal(TOKEN_KEY);
}

/**
 * Obter dados do usuário logado
 */
export function obterUsuario() {
    return carregarLocal(USER_KEY);
}

/**
 * Obter permissões do usuário
 */
export function obterPermissoes() {
    return carregarLocal(PERMISSIONS_KEY) || [];
}

/**
 * Verificar se usuário é admin
 */
export function ehAdmin() {
    const usuario = obterUsuario();
    return usuario && usuario.tipo === 'admin';
}

/**
 * Verificar permissão específica
 * @param {string} modulo - Nome do módulo
 * @param {string} acao - 'visualizar', 'criar', 'editar', 'excluir'
 */
export function temPermissao(modulo, acao) {
    if (ehAdmin()) return true; // Admin tem tudo

    const permissoes = obterPermissoes();
    const perm = permissoes.find(p => p.modulo === modulo);

    if (!perm) return false;

    const mapa = {
        'visualizar': 'pode_visualizar',
        'criar': 'pode_criar',
        'editar': 'pode_editar',
        'excluir': 'pode_excluir'
    };

    const campo = mapa[acao];
    return perm[campo] == 1;
}

/**
 * Trocar senha
 */
export async function trocarSenha(senhaAtual, senhaNova) {
    try {
        const response = await fetch(API_CONFIG.baseURL + API_CONFIG.endpoints.auth, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${obterToken()}`
            },
            body: JSON.stringify({
                acao: 'trocar_senha',
                senha_atual: senhaAtual,
                senha_nova: senhaNova
            })
        });

        const result = await response.json();

        if (result.sucesso) {
            // Atualizar token
            salvarLocal(TOKEN_KEY, result.dados.token);
            return result;
        } else {
            throw new Error(result.mensagem);
        }
    } catch (error) {
        console.error('Erro ao trocar senha:', error);
        throw error;
    }
}

/**
 * Validar token (verificar se ainda é válido)
 */
export async function validarToken() {
    if (!estaAutenticado()) return false;

    try {
        const response = await fetch(API_CONFIG.baseURL + API_CONFIG.endpoints.auth, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${obterToken()}`
            }
        });

        const result = await response.json();

        if (result.sucesso) {
            // Atualizar dados locais
            salvarLocal(USER_KEY, result.dados.usuario);
            salvarLocal(PERMISSIONS_KEY, result.dados.permissoes || []);
            return true;
        } else {
            logout(); // Token inválido, fazer logout
            return false;
        }
    } catch (error) {
        console.error('Erro ao validar token:', error);
        return false;
    }
}

/**
 * Refresh token automático (chamar antes de expirar)
 */
export async function refreshToken() {
    try {
        const response = await fetch(API_CONFIG.baseURL + API_CONFIG.endpoints.auth, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${obterToken()}`
            },
            body: JSON.stringify({ acao: 'refresh' })
        });

        const result = await response.json();

        if (result.sucesso) {
            salvarLocal(TOKEN_KEY, result.dados.token);
            console.log('Token renovado automaticamente');
        }
    } catch (error) {
        console.error('Erro ao renovar token:', error);
    }
}

// Renovar token a cada 6 horas (antes de expirar 8h)
if (typeof window !== 'undefined') {
    setInterval(() => {
        if (estaAutenticado()) {
            refreshToken();
        }
    }, 6 * 60 * 60 * 1000);
}
