"""
MCP Database Tools
Funções que a IA pode chamar para consultar o banco de dados.
Cada função recebe o tenant_id e só acessa dados daquele tenant.
"""

import json
from typing import Optional
from db import get_db_connection


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

async def execute_tool(tool_name: str, args: dict, tenant_id: int) -> str:
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

async def _get_resumo_financeiro(tenant_id: int, mes: Optional[int] = None, ano: Optional[int] = None) -> str:
    from datetime import date
    hoje = date.today()
    mes = mes or hoje.month
    ano = ano or hoje.year

    async with get_db_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT
                tipo,
                COALESCE(SUM(valor), 0) AS total
            FROM financeiro_lancamentos
            WHERE tenant_id = $1
              AND EXTRACT(MONTH FROM data_lancamento) = $2
              AND EXTRACT(YEAR  FROM data_lancamento) = $3
            GROUP BY tipo
            """,
            tenant_id, mes, ano,
        )
    result = {r["tipo"]: float(r["total"]) for r in rows}
    receitas = result.get("receita", 0)
    despesas = result.get("despesa", 0)
    return json.dumps({
        "periodo": f"{mes:02d}/{ano}",
        "receitas": receitas,
        "despesas": despesas,
        "saldo": receitas - despesas,
    }, ensure_ascii=False)


async def _listar_lancamentos_financeiros(
    tenant_id: int,
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

    conditions = [
        "tenant_id = $1",
        "EXTRACT(MONTH FROM data_lancamento) = $2",
        "EXTRACT(YEAR  FROM data_lancamento) = $3",
    ]
    params = [tenant_id, mes, ano]

    if tipo:
        conditions.append(f"tipo = ${len(params) + 1}")
        params.append(tipo)

    sql = f"""
        SELECT
            id, descricao, valor, tipo, data_lancamento,
            categoria_nome, status
        FROM financeiro_lancamentos
        WHERE {' AND '.join(conditions)}
        ORDER BY data_lancamento DESC
        LIMIT {limit}
    """

    async with get_db_connection() as conn:
        rows = await conn.fetch(sql, *params)

    data = [dict(r) for r in rows]
    for item in data:
        if item.get("data_lancamento"):
            item["data_lancamento"] = item["data_lancamento"].isoformat()
        item["valor"] = float(item["valor"])

    return json.dumps(data, ensure_ascii=False, default=str)


async def _listar_obras(tenant_id: int, status: Optional[str] = None) -> str:
    conditions = ["tenant_id = $1"]
    params = [tenant_id]

    if status:
        conditions.append(f"status = ${len(params) + 1}")
        params.append(status)

    sql = f"""
        SELECT id, nome, status, endereco, data_inicio, data_previsao_fim
        FROM obras
        WHERE {' AND '.join(conditions)}
        ORDER BY nome
    """

    async with get_db_connection() as conn:
        rows = await conn.fetch(sql, *params)

    data = [dict(r) for r in rows]
    for item in data:
        for k in ["data_inicio", "data_previsao_fim"]:
            if item.get(k):
                item[k] = item[k].isoformat()

    return json.dumps(data, ensure_ascii=False, default=str)


async def _listar_funcionarios(tenant_id: int, ativo: Optional[bool] = None) -> str:
    conditions = ["tenant_id = $1"]
    params = [tenant_id]

    if ativo is not None:
        conditions.append(f"ativo = ${len(params) + 1}")
        params.append(ativo)

    sql = f"""
        SELECT id, nome, funcao, ativo, data_admissao
        FROM funcionarios
        WHERE {' AND '.join(conditions)}
        ORDER BY nome
    """

    async with get_db_connection() as conn:
        rows = await conn.fetch(sql, *params)

    data = [dict(r) for r in rows]
    for item in data:
        if item.get("data_admissao"):
            item["data_admissao"] = item["data_admissao"].isoformat()

    return json.dumps(data, ensure_ascii=False, default=str)


async def _despesas_por_categoria(tenant_id: int, mes: Optional[int] = None, ano: Optional[int] = None) -> str:
    from datetime import date
    hoje = date.today()
    mes = mes or hoje.month
    ano = ano or hoje.year

    async with get_db_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT
                COALESCE(categoria_nome, 'Sem categoria') AS categoria,
                SUM(valor) AS total,
                COUNT(*) AS quantidade
            FROM financeiro_lancamentos
            WHERE tenant_id = $1
              AND tipo = 'despesa'
              AND EXTRACT(MONTH FROM data_lancamento) = $2
              AND EXTRACT(YEAR  FROM data_lancamento) = $3
            GROUP BY categoria_nome
            ORDER BY total DESC
            """,
            tenant_id, mes, ano,
        )

    data = [{"categoria": r["categoria"], "total": float(r["total"]), "quantidade": r["quantidade"]} for r in rows]
    return json.dumps({"periodo": f"{mes:02d}/{ano}", "categorias": data}, ensure_ascii=False)


async def _contas_a_pagar(tenant_id: int, dias: int = 30) -> str:
    async with get_db_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT
                id, descricao, valor, data_vencimento, status
            FROM financeiro_lancamentos
            WHERE tenant_id = $1
              AND tipo = 'despesa'
              AND status IN ('pendente', 'a_vencer')
              AND data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + $2::integer
            ORDER BY data_vencimento
            """,
            tenant_id, dias,
        )

    data = [dict(r) for r in rows]
    for item in data:
        if item.get("data_vencimento"):
            item["data_vencimento"] = item["data_vencimento"].isoformat()
        item["valor"] = float(item["valor"])

    return json.dumps(data, ensure_ascii=False, default=str)
