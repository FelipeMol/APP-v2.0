"""
Orquestrador da IA: recebe mensagem, chama LLM, executa MCP tools e devolve resposta.
Suporta GLM (padrão), OpenAI e Anthropic.
"""

import json
from typing import List
from openai import AsyncOpenAI
from config import settings
from mcp_tools import TOOLS, execute_tool
from db import get_db_connection

# Mapa de descrições amigáveis dos módulos
_MODULE_LABELS = {
    "financeiro":    "Financeiro (lançamentos, orçamentos, fluxo de caixa)",
    "lancamentos":   "Lançamentos financeiros",
    "obras":         "Obras e projetos",
    "funcionarios":  "Funcionários e equipe",
    "rh":            "Recursos Humanos",
    "tarefas":       "Tarefas e cronograma",
    "relatorios":    "Relatórios gerenciais",
    "empresas":      "Cadastro de empresas/clientes",
    "dashboard":     "Dashboard e indicadores",
}


async def fetch_tenant_context(tenant_id: str) -> dict:
    """
    Busca nome da empresa e módulos ativos no banco.
    Retorna dict: {name, short_name, modulos_ativos}
    """
    try:
        async with get_db_connection() as conn:
            tenant = await conn.fetchrow(
                "SELECT name, short_name FROM tenants WHERE id = $1",
                tenant_id,
            )
            modules = await conn.fetch(
                "SELECT module_id FROM tenant_modules WHERE tenant_id = $1 AND enabled = true",
                tenant_id,
            )
        name = tenant["name"] if tenant else tenant_id
        short_name = tenant["short_name"] if tenant else tenant_id
        modulos_ativos = [r["module_id"] for r in modules]
        return {"name": name, "short_name": short_name, "modulos_ativos": modulos_ativos}
    except Exception:
        # Se o banco falhar, usa fallback mínimo sem travar o chat
        return {"name": tenant_id, "short_name": tenant_id, "modulos_ativos": []}


def build_system_prompt(tenant_ctx: dict) -> str:
    """
    Monta o system prompt personalizado para o tenant.
    """
    name = tenant_ctx["name"]
    modulos = tenant_ctx["modulos_ativos"]

    if modulos:
        modulos_str = "\n".join(
            f"  - {_MODULE_LABELS.get(m, m)}" for m in modulos
        )
        modulos_section = f"\nMÓDULOS ATIVOS NESTA EMPRESA:\n{modulos_str}"
    else:
        modulos_section = ""

    return f"""Você é o assistente de gestão da empresa **{name}**, integrado ao sistema Controle de Obras.

REGRAS IMPORTANTES:
- Você SOMENTE tem acesso aos dados de {name}. Nunca revele dados de outras empresas.
- Seja objetivo e direto. Use valores formatados em R$ quando falar de dinheiro.
- Se não encontrar dados, informe claramente sem inventar.
- Quando o usuário pedir informações que requerem consulta ao banco, use as ferramentas disponíveis.
- Responda sempre em português brasileiro.{modulos_section}

Se o usuário pedir algo fora dos módulos ativos acima, informe que essa funcionalidade não está disponível para {name}."""


async def run_chat(
    message: str,
    history: List[dict],
    tenant_id: str,
) -> str:
    """
    Executa o ciclo completo de chat com suporte a tool calling.
    Retorna a resposta final como string.
    """
    tenant_ctx = await fetch_tenant_context(tenant_id)
    system_prompt = build_system_prompt(tenant_ctx)

    if settings.llm_provider == "anthropic":
        return await _run_anthropic(message, history, tenant_id, system_prompt)
    if settings.llm_provider == "glm":
        return await _run_glm(message, history, tenant_id, system_prompt)
    return await _run_openai(message, history, tenant_id, system_prompt)


async def _run_openai(message: str, history: List[dict], tenant_id: str, system_prompt: str) -> str:
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    messages = [{"role": "system", "content": system_prompt}]
    # Adiciona histórico (máx. últimas 10 mensagens)
    for h in history[-10:]:
        if h.get("role") in ("user", "assistant"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    # Loop de tool calling (máx. 5 rounds para evitar loop infinito)
    for _ in range(5):
        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
        )

        choice = response.choices[0]

        # Sem tool call — resposta final
        if choice.finish_reason == "stop" or not choice.message.tool_calls:
            return choice.message.content or "(sem resposta)"

        # Executa tool calls
        messages.append(choice.message)  # mensagem do assistente com tool_calls

        for tc in choice.message.tool_calls:
            try:
                args = json.loads(tc.function.arguments)
            except json.JSONDecodeError:
                args = {}

            result = await execute_tool(tc.function.name, args, tenant_id)

            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result,
            })

    return "Não consegui processar sua solicitação. Tente novamente."


async def _run_glm(message: str, history: List[dict], tenant_id: str, system_prompt: str) -> str:
    """Implementação com GLM (Zhipu AI) — compatível com OpenAI SDK."""
    client = AsyncOpenAI(
        api_key=settings.glm_api_key,
        base_url="https://open.bigmodel.cn/api/paas/v4/",
    )

    messages = [{"role": "system", "content": system_prompt}]
    for h in history[-10:]:
        if h.get("role") in ("user", "assistant"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    for _ in range(5):
        response = await client.chat.completions.create(
            model=settings.glm_model,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
        )

        choice = response.choices[0]

        if choice.finish_reason == "stop" or not choice.message.tool_calls:
            return choice.message.content or "(sem resposta)"

        messages.append(choice.message)

        for tc in choice.message.tool_calls:
            try:
                args = json.loads(tc.function.arguments)
            except json.JSONDecodeError:
                args = {}

            result = await execute_tool(tc.function.name, args, tenant_id)

            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": result,
            })

    return "Não consegui processar sua solicitação. Tente novamente."


async def _run_anthropic(message: str, history: List[dict], tenant_id: str, system_prompt: str) -> str:
    """Implementação com Anthropic Claude (reserva)."""
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    # Converte tools do formato OpenAI para Anthropic
    anthropic_tools = []
    for t in TOOLS:
        fn = t["function"]
        anthropic_tools.append({
            "name": fn["name"],
            "description": fn["description"],
            "input_schema": fn["parameters"],
        })

    messages = []
    for h in history[-10:]:
        if h.get("role") in ("user", "assistant"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": message})

    for _ in range(5):
        response = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=2048,
            system=system_prompt,
            messages=messages,
            tools=anthropic_tools,
        )

        if response.stop_reason == "end_turn":
            text_blocks = [b.text for b in response.content if hasattr(b, "text")]
            return " ".join(text_blocks) or "(sem resposta)"

        # Processa tool use
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = await execute_tool(block.name, block.input, tenant_id)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

        if not tool_results:
            text_blocks = [b.text for b in response.content if hasattr(b, "text")]
            return " ".join(text_blocks) or "(sem resposta)"

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

    return "Não consegui processar sua solicitação. Tente novamente."
