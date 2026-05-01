"""
MCP Database Tools
Funções que a IA pode chamar para consultar o banco de dados.
Cada função recebe o tenant_id e só acessa dados daquele tenant.
Usa supabase-py (PostgREST) — não requer conexão direta ao Postgres.
"""

import json
from typing import Optional
from db import get_supabase


# ── Definição das tools para o LLM ───────────────────────────
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_resumo_financeiro",
            "description": "Retorna resumo financeiro do mês atual: total de receitas, despesas e saldo. Use quando o usuário perguntar sobre dinheiro, saldo, finanças, entradas ou saídas.",
            "parameters": {
                "type": "object",
                "properties": {
                    "mes": {
                        "type": "integer",
                        "description": "Mês (1-12). Se não informado usa o mês atual.",
                    },
                    "ano": {
                        "type": "integer",
                        "description": "Ano (ex: 2026). Se não informado usa o ano atual.",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listar_lancamentos_financeiros",
            "description": "Lista lançamentos financeiros (receitas e despesas) com filtros opcionais. Use quando pedirem para ver lançamentos, transações, pagamentos ou recebimentos.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tipo": {
                        "type": "string",
                        "enum": ["receita", "despesa"],
                        "description": "Filtrar por tipo (receita ou despesa). Omitir para todos.",
                    },
                    "mes": {"type": "integer", "description": "Mês (1-12)."},
                    "ano": {"type": "integer", "description": "Ano."},
                    "limit": {
                        "type": "integer",
                        "description": "Máximo de registros a retornar (padrão 20).",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listar_obras",
            "description": "Lista obras/projetos cadastrados no sistema com status e detalhes. Use quando perguntarem sobre obras, projetos, construções.",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "description": "Filtrar por status (ex: 'ativo', 'concluido', 'pausado').",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listar_funcionarios",
            "description": "Lista funcionários cadastrados. Use quando perguntarem sobre funcionários, equipe, colaboradores.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ativo": {
                        "type": "boolean",
                        "description": "True para apenas ativos, False para inativos, omitir para todos.",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "despesas_por_categoria",
            "description": "Mostra total de despesas agrupado por categoria no período. Use para análises de gastos.",
            "parameters": {
                "type": "object",
                "properties": {
                    "mes": {"type": "integer"},
                    "ano": {"type": "integer"},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "contas_a_pagar",
            "description": "Lista lançamentos financeiros pendentes/a pagar. Use quando perguntarem sobre contas a pagar, vencimentos, compromissos financeiros.",
            "parameters": {
                "type": "object",
                "properties": {
                    "dias": {
                        "type": "integer",
                        "description": "Próximos N dias a considerar (padrão 30).",
                    },
                },
                "required": [],
            },
        },
    },
]


# ── Implementação das tools ───────────────────────────────────

async def execute_tool(tool_name: str, args: dict, tenant_id: str) -> str:
    """
    Executa a tool solicitada pela IA e retorna o resultado como string JSON.
    tenant_id garante isolamento: cada empresa só vê seus próprios dados.
    """
    try:
        if tool_name == "get_resumo_financeiro":
            return await _get_resumo_financeiro(tenant_id, **args)
        elif tool_name == "listar_lancamentos_financeiros":
            return await _listar_lancamentos_financeiros(tenant_id, **args)
        elif tool_name == "listar_obras":
            return await _listar_obras(tenant_id, **args)
        elif tool_name == "listar_funcionarios":
            return await _listar_funcionarios(tenant_id, **args)
        elif tool_name == "despesas_por_categoria":
            return await _despesas_por_categoria(tenant_id, **args)
        elif tool_name == "contas_a_pagar":
            return await _contas_a_pagar(tenant_id, **args)
        else:
            return json.dumps({"erro": f"Tool desconhecida: {tool_name}"})
    except Exception as e:
        return json.dumps({"erro": str(e)})


# ── Implementações individuais ────────────────────────────────

def _date_range(mes: int, ano: int):
    """Retorna (data_inicio, data_fim) para o mês/ano informado."""
    import calendar
    last_day = calendar.monthrange(ano, mes)[1]
    return f"{ano}-{mes:02d}-01", f"{ano}-{mes:02d}-{last_day}"


async def _get_resumo_financeiro(tenant_id: str, mes: Optional[int] = None, ano: Optional[int] = None) -> str:
    from datetime import date
    hoje = date.today()
    mes = mes or hoje.month
    ano = ano or hoje.year
    inicio, fim = _date_range(mes, ano)

    sb = get_supabase()
    resp = (
        sb.table("financeiro_lancamentos")
        .select("tipo, valor")
        .eq("tenant_id", tenant_id)
        .gte("data_lancamento", inicio)
        .lte("data_lancamento", fim)
        .execute()
    )

    receitas = sum(float(r["valor"]) for r in resp.data if r.get("tipo") == "receita")
    despesas = sum(float(r["valor"]) for r in resp.data if r.get("tipo") == "despesa")
    return json.dumps({
        "periodo": f"{mes:02d}/{ano}",
        "receitas": receitas,
        "despesas": despesas,
        "saldo": receitas - despesas,
    }, ensure_ascii=False)


async def _listar_lancamentos_financeiros(
    tenant_id: str,
    tipo: Optional[str] = None,
    mes: Optional[int] = None,
    ano: Optional[int] = None,
    limit: int = 20,
) -> str:
    from datetime import date
    hoje = date.today()
    mes = mes or hoje.month
    ano = ano or hoje.year
    limit = min(limit or 20, 50)
    inicio, fim = _date_range(mes, ano)

    sb = get_supabase()
    q = (
        sb.table("financeiro_lancamentos")
        .select("id, descricao, valor, tipo, data_lancamento, categoria_nome, status")
        .eq("tenant_id", tenant_id)
        .gte("data_lancamento", inicio)
        .lte("data_lancamento", fim)
        .order("data_lancamento", desc=True)
        .limit(limit)
    )
    if tipo:
        q = q.eq("tipo", tipo)

    resp = q.execute()
    data = resp.data or []
    for item in data:
        if item.get("valor") is not None:
            item["valor"] = float(item["valor"])
    return json.dumps(data, ensure_ascii=False, default=str)


async def _listar_obras(tenant_id: str, status: Optional[str] = None) -> str:
    sb = get_supabase()
    q = (
        sb.table("obras")
        .select("id, nome, status, endereco, data_inicio, data_previsao_fim")
        .eq("tenant_id", tenant_id)
        .order("nome")
    )
    if status:
        q = q.eq("status", status)
    resp = q.execute()
    return json.dumps(resp.data or [], ensure_ascii=False, default=str)


async def _listar_funcionarios(tenant_id: str, ativo: Optional[bool] = None) -> str:
    sb = get_supabase()
    q = (
        sb.table("funcionarios")
        .select("id, nome, funcao, ativo, data_admissao")
        .eq("tenant_id", tenant_id)
        .order("nome")
    )
    if ativo is not None:
        q = q.eq("ativo", ativo)
    resp = q.execute()
    return json.dumps(resp.data or [], ensure_ascii=False, default=str)


async def _despesas_por_categoria(tenant_id: str, mes: Optional[int] = None, ano: Optional[int] = None) -> str:
    from datetime import date
    hoje = date.today()
    mes = mes or hoje.month
    ano = ano or hoje.year
    inicio, fim = _date_range(mes, ano)

    sb = get_supabase()
    resp = (
        sb.table("financeiro_lancamentos")
        .select("categoria_nome, valor")
        .eq("tenant_id", tenant_id)
        .eq("tipo", "despesa")
        .gte("data_lancamento", inicio)
        .lte("data_lancamento", fim)
        .execute()
    )

    totais: dict = {}
    contagens: dict = {}
    for r in (resp.data or []):
        cat = r.get("categoria_nome") or "Sem categoria"
        totais[cat] = totais.get(cat, 0.0) + float(r.get("valor", 0))
        contagens[cat] = contagens.get(cat, 0) + 1

    categorias = sorted(
        [{"categoria": k, "total": totais[k], "quantidade": contagens[k]} for k in totais],
        key=lambda x: x["total"],
        reverse=True,
    )
    return json.dumps({"periodo": f"{mes:02d}/{ano}", "categorias": categorias}, ensure_ascii=False)


async def _contas_a_pagar(tenant_id: str, dias: int = 30) -> str:
    from datetime import date, timedelta
    hoje = date.today()
    ate = hoje + timedelta(days=dias)

    sb = get_supabase()
    resp = (
        sb.table("financeiro_lancamentos")
        .select("id, descricao, valor, data_vencimento, status")
        .eq("tenant_id", tenant_id)
        .eq("tipo", "despesa")
        .in_("status", ["pendente", "a_vencer"])
        .gte("data_vencimento", str(hoje))
        .lte("data_vencimento", str(ate))
        .order("data_vencimento")
        .execute()
    )

    data = resp.data or []
    for item in data:
        if item.get("valor") is not None:
            item["valor"] = float(item["valor"])
    return json.dumps(data, ensure_ascii=False, default=str)
