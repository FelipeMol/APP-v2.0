// ========================================
// MÓDULO DE FUNÇÕES UTILITÁRIAS
// ========================================

/**
 * Formata data para exibição (YYYY-MM-DD -> DD/MM/YYYY)
 */
export function formatarData(data) {
    if (!data) return '';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
}

/**
 * Formata data para input (DD/MM/YYYY -> YYYY-MM-DD)
 */
export function formatarDataInput(data) {
    if (!data) return '';
    if (data.includes('-')) return data; // Já está no formato correto
    const [dia, mes, ano] = data.split('/');
    return `${ano}-${mes}-${dia}`;
}

/**
 * Converte objeto Date para string YYYY-MM-DD
 */
export function formatDateToYYYYMMDD(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Formata data para exibição (DD/MM/YYYY)
 * Aceita: Date object, YYYY-MM-DD string, ou timestamp
 */
export function formatDate(data) {
    if (!data) return '';

    let dateObj;

    // Se é string no formato YYYY-MM-DD ou YYYY-MM-DD HH:MM:SS
    if (typeof data === 'string') {
        // Extrair apenas a parte da data se tiver timestamp
        const datePart = data.split(' ')[0];
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year}`;
    }

    // Se é objeto Date
    if (data instanceof Date) {
        const day = String(data.getDate()).padStart(2, '0');
        const month = String(data.getMonth() + 1).padStart(2, '0');
        const year = data.getFullYear();
        return `${day}/${month}/${year}`;
    }

    return '';
}

/**
 * Formata data para exibição BR (ambas direções)
 * Se receber YYYY-MM-DD, converte para DD/MM/YYYY
 * Se receber DD/MM/YYYY, retorna sem alteração
 */
export function formatarDataBR(dataStr) {
    if (!dataStr) return '';

    // Se já está em DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
        return dataStr;
    }

    // Se está em YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
        const [ano, mes, dia] = dataStr.split('-');
        return `${dia}/${mes}/${ano}`;
    }

    return dataStr;
}

/**
 * Retorna data de hoje no formato YYYY-MM-DD
 */
export function getDataHoje() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Formata data para exibição no header (DD/MM/AA)
 */
export function formatarDataHeader() {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = String(hoje.getFullYear()).slice(-2);
    return `📅 ${dia}/${mes}/${ano}`;
}

/**
 * Formata horário para exibição (HH:MM:SS -> HH:MM)
 */
export function formatarHora(hora) {
    if (!hora) return '08:00';
    if (hora.length === 8) return hora.slice(0, 5); // Remove segundos
    return hora;
}

/**
 * Valida CNPJ
 */
export function validarCNPJ(cnpj) {
    if (!cnpj) return true; // Campo opcional
    cnpj = cnpj.replace(/[^\d]/g, '');
    if (cnpj.length !== 14) return false;
    // Validação básica - pode melhorar com dígitos verificadores
    return true;
}

/**
 * Valida CPF
 */
export function validarCPF(cpf) {
    if (!cpf) return true; // Campo opcional
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;
    // Validação básica - pode melhorar com dígitos verificadores
    return true;
}

/**
 * Valida email
 */
export function validarEmail(email) {
    if (!email) return true; // Campo opcional
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Formata CNPJ (00.000.000/0000-00)
 */
export function formatarCNPJ(cnpj) {
    if (!cnpj) return '';
    cnpj = cnpj.replace(/[^\d]/g, '');
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Formata CPF (000.000.000-00)
 */
export function formatarCPF(cpf) {
    if (!cpf) return '';
    cpf = cpf.replace(/[^\d]/g, '');
    return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

/**
 * Formata telefone ((00) 00000-0000)
 */
export function formatarTelefone(tel) {
    if (!tel) return '';
    tel = tel.replace(/[^\d]/g, '');
    if (tel.length === 11) {
        return tel.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (tel.length === 10) {
        return tel.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    return tel;
}

/**
 * Debounce - Executa função após delay
 */
export function debounce(func, delay = 300) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Capitaliza primeira letra de cada palavra
 */
export function capitalize(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Remove acentos de uma string
 */
export function removerAcentos(str) {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Busca em array de objetos (case-insensitive, sem acentos)
 */
export function buscarEmArray(array, termo, campos) {
    if (!termo) return array;

    const termoNormalizado = removerAcentos(termo.toLowerCase());

    return array.filter(item => {
        return campos.some(campo => {
            const valor = item[campo];
            if (!valor) return false;
            const valorNormalizado = removerAcentos(String(valor).toLowerCase());
            return valorNormalizado.includes(termoNormalizado);
        });
    });
}

/**
 * Ordena array de objetos por campo
 */
export function ordenarPor(array, campo, ordem = 'asc') {
    return [...array].sort((a, b) => {
        const valorA = a[campo];
        const valorB = b[campo];

        if (valorA < valorB) return ordem === 'asc' ? -1 : 1;
        if (valorA > valorB) return ordem === 'asc' ? 1 : -1;
        return 0;
    });
}

/**
 * Gera ID único (timestamp + random)
 */
export function gerarId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Faz download de arquivo (útil para exportar dados)
 */
export function downloadArquivo(conteudo, nomeArquivo, tipo = 'text/plain') {
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Copia texto para clipboard
 */
export async function copiarParaClipboard(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        return true;
    } catch (error) {
        console.error('Erro ao copiar:', error);
        return false;
    }
}

/**
 * Valida formulário
 */
export function validarFormulario(formData, regras) {
    const erros = {};

    for (const [campo, regra] of Object.entries(regras)) {
        const valor = formData[campo];

        // Required
        if (regra.required && !valor) {
            erros[campo] = `${regra.label || campo} é obrigatório`;
            continue;
        }

        // Email
        if (regra.type === 'email' && valor && !validarEmail(valor)) {
            erros[campo] = 'Email inválido';
        }

        // CNPJ
        if (regra.type === 'cnpj' && valor && !validarCNPJ(valor)) {
            erros[campo] = 'CNPJ inválido';
        }

        // CPF
        if (regra.type === 'cpf' && valor && !validarCPF(valor)) {
            erros[campo] = 'CPF inválido';
        }

        // Min length
        if (regra.minLength && valor && valor.length < regra.minLength) {
            erros[campo] = `Mínimo de ${regra.minLength} caracteres`;
        }

        // Max length
        if (regra.maxLength && valor && valor.length > regra.maxLength) {
            erros[campo] = `Máximo de ${regra.maxLength} caracteres`;
        }
    }

    return {
        valido: Object.keys(erros).length === 0,
        erros
    };
}

/**
 * Salva no localStorage
 */
export function salvarLocal(chave, valor) {
    try {
        // Se for string, salvar diretamente sem stringify
        // Se for objeto/array, usar stringify
        const valorParaSalvar = typeof valor === 'string' ? valor : JSON.stringify(valor);
        localStorage.setItem(chave, valorParaSalvar);
        return true;
    } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
        return false;
    }
}

/**
 * Carrega do localStorage
 */
export function carregarLocal(chave, valorPadrao = null) {
    try {
        const item = localStorage.getItem(chave);
        if (!item) return valorPadrao;

        // Tentar fazer parse, se falhar retornar o valor direto (é uma string)
        try {
            return JSON.parse(item);
        } catch {
            return item;
        }
    } catch (error) {
        console.error('Erro ao carregar do localStorage:', error);
        return valorPadrao;
    }
}

/**
 * Remove do localStorage
 */
export function removerLocal(chave) {
    try {
        localStorage.removeItem(chave);
        return true;
    } catch (error) {
        console.error('Erro ao remover do localStorage:', error);
        return false;
    }
}

/**
 * Gera avatar com iniciais do nome
 * @param {string} nome - Nome completo do usuário
 * @returns {string} - Iniciais (2 letras maiúsculas)
 */
export function gerarAvatar(nome) {
    if (!nome) return '?';

    const palavras = nome.trim().split(' ');
    if (palavras.length === 1) {
        return palavras[0].substring(0, 2).toUpperCase();
    }

    return (palavras[0][0] + palavras[palavras.length - 1][0]).toUpperCase();
}

/**
 * Formata tamanho de arquivo em bytes para formato legível
 * @param {number} bytes - Tamanho em bytes
 * @returns {string} - Tamanho formatado (ex: "1.5 MB")
 */
export function formatarTamanhoArquivo(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
