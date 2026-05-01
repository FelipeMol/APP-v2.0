// Supabase Edge Function — AI Copilot Chat
// Deploy: supabase functions deploy chat
// Variáveis necessárias (supabase secrets set):
//   GLM_API_KEY, JWT_SECRET

import { createClient } from "jsr:@supabase/supabase-js@2";
import { decode as jwtDecode } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GLM_API_KEY = Deno.env.get("GLM_API_KEY")!;
const GLM_MODEL = Deno.env.get("GLM_MODEL") ?? "glm-4-flash";
const GLM_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
const JWT_SECRET = Deno.env.get("JWT_SECRET")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Tenant-ID",
};

// ── Descrições dos módulos ────────────────────────────────────
const MODULE_LABELS: Record<string, string> = {
  financeiro: "Financeiro (lançamentos, orçamentos, fluxo de caixa)",
  lancamentos: "Lançamentos financeiros",
  obras: "Obras e projetos",
  funcionarios: "Funcionários e equipe",
  rh: "Recursos Humanos",
  tarefas: "Tarefas e cronograma",
  relatorios: "Relatórios gerenciais",
  empresas: "Cadastro de empresas/clientes",
  dashboard: "Dashboard e indicadores",
};

// ── Definição das tools para o LLM ───────────────────────────
const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_resumo_financeiro",
      description:
        "Retorna resumo financeiro do mês: total de receitas, despesas e saldo. Use quando perguntarem sobre dinheiro, saldo, finanças.",
      parameters: {
        type: "object",
        properties: {
          mes: { type: "integer", description: "Mês (1-12). Padrão: mês atual." },
          ano: { type: "integer", description: "Ano. Padrão: ano atual." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_lancamentos_financeiros",
      description:
        "Lista lançamentos financeiros com filtros opcionais. Use quando pedirem lançamentos, transações, pagamentos, recebimentos.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["receita", "despesa"] },
          mes: { type: "integer" },
          ano: { type: "integer" },
          limit: { type: "integer", description: "Máximo de registros (padrão 20)." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_obras",
      description: "Lista obras/projetos cadastrados. Use quando perguntarem sobre obras, projetos, construções.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filtrar por status (ativo, concluido, pausado)." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_funcionarios",
      description: "Lista funcionários cadastrados. Use quando perguntarem sobre funcionários, equipe, colaboradores.",
      parameters: {
        type: "object",
        properties: {
          ativo: { type: "boolean", description: "true=apenas ativos, false=inativos, omitir=todos." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "despesas_por_categoria",
      description: "Total de despesas agrupado por categoria. Use para análises de gastos.",
      parameters: {
        type: "object",
        properties: {
          mes: { type: "integer" },
          ano: { type: "integer" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "contas_a_pagar",
      description: "Lista lançamentos pendentes/a pagar. Use quando perguntarem sobre contas a pagar, vencimentos.",
      parameters: {
        type: "object",
        properties: {
          dias: { type: "integer", description: "Próximos N dias (padrão 30)." },
        },
        required: [],
      },
    },
  },
];

// ── Helpers de data ───────────────────────────────────────────
function dateRange(mes: number, ano: number): [string, string] {
  const lastDay = new Date(ano, mes, 0).getDate();
  return [
    `${ano}-${String(mes).padStart(2, "0")}-01`,
    `${ano}-${String(mes).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  ];
}

function currentMonthYear() {
  const now = new Date();
  return { mes: now.getMonth() + 1, ano: now.getFullYear() };
}

// ── Execução das tools ────────────────────────────────────────
async function executeTool(
  sb: ReturnType<typeof createClient>,
  toolName: string,
  args: Record<string, unknown>,
  tenantId: string,
): Promise<string> {
  try {
    const { mes: mesPadrao, ano: anoPadrao } = currentMonthYear();

    if (toolName === "get_resumo_financeiro") {
      const mes = (args.mes as number) ?? mesPadrao;
      const ano = (args.ano as number) ?? anoPadrao;
      const [inicio, fim] = dateRange(mes, ano);

      const { data } = await sb
        .from("financeiro_lancamentos")
        .select("tipo, valor")
        .eq("tenant_id", tenantId)
        .gte("data_lancamento", inicio)
        .lte("data_lancamento", fim);

      const receitas = (data ?? [])
        .filter((r) => r.tipo === "receita")
        .reduce((s, r) => s + Number(r.valor), 0);
      const despesas = (data ?? [])
        .filter((r) => r.tipo === "despesa")
        .reduce((s, r) => s + Number(r.valor), 0);

      return JSON.stringify({
        periodo: `${String(mes).padStart(2, "0")}/${ano}`,
        receitas,
        despesas,
        saldo: receitas - despesas,
      });
    }

    if (toolName === "listar_lancamentos_financeiros") {
      const mes = (args.mes as number) ?? mesPadrao;
      const ano = (args.ano as number) ?? anoPadrao;
      const limit = Math.min((args.limit as number) ?? 20, 50);
      const [inicio, fim] = dateRange(mes, ano);

      let q = sb
        .from("financeiro_lancamentos")
        .select("id, descricao, valor, tipo, data_lancamento, categoria_nome, status")
        .eq("tenant_id", tenantId)
        .gte("data_lancamento", inicio)
        .lte("data_lancamento", fim)
        .order("data_lancamento", { ascending: false })
        .limit(limit);

      if (args.tipo) q = q.eq("tipo", args.tipo as string);

      const { data } = await q;
      return JSON.stringify(data ?? []);
    }

    if (toolName === "listar_obras") {
      let q = sb
        .from("obras")
        .select("id, nome, status, endereco, data_inicio, data_previsao_fim")
        .eq("tenant_id", tenantId)
        .order("nome");

      if (args.status) q = q.eq("status", args.status as string);

      const { data } = await q;
      return JSON.stringify(data ?? []);
    }

    if (toolName === "listar_funcionarios") {
      let q = sb
        .from("funcionarios")
        .select("id, nome, funcao, ativo, data_admissao")
        .eq("tenant_id", tenantId)
        .order("nome");

      if (args.ativo !== undefined) q = q.eq("ativo", args.ativo as boolean);

      const { data } = await q;
      return JSON.stringify(data ?? []);
    }

    if (toolName === "despesas_por_categoria") {
      const mes = (args.mes as number) ?? mesPadrao;
      const ano = (args.ano as number) ?? anoPadrao;
      const [inicio, fim] = dateRange(mes, ano);

      const { data } = await sb
        .from("financeiro_lancamentos")
        .select("categoria_nome, valor")
        .eq("tenant_id", tenantId)
        .eq("tipo", "despesa")
        .gte("data_lancamento", inicio)
        .lte("data_lancamento", fim);

      const totais: Record<string, { total: number; quantidade: number }> = {};
      for (const r of data ?? []) {
        const cat = r.categoria_nome ?? "Sem categoria";
        if (!totais[cat]) totais[cat] = { total: 0, quantidade: 0 };
        totais[cat].total += Number(r.valor);
        totais[cat].quantidade += 1;
      }
      const categorias = Object.entries(totais)
        .map(([categoria, v]) => ({ categoria, ...v }))
        .sort((a, b) => b.total - a.total);

      return JSON.stringify({ periodo: `${String(mes).padStart(2, "0")}/${ano}`, categorias });
    }

    if (toolName === "contas_a_pagar") {
      const dias = (args.dias as number) ?? 30;
      const hoje = new Date().toISOString().split("T")[0];
      const ate = new Date(Date.now() + dias * 86400000).toISOString().split("T")[0];

      const { data } = await sb
        .from("financeiro_lancamentos")
        .select("id, descricao, valor, data_vencimento, status")
        .eq("tenant_id", tenantId)
        .eq("tipo", "despesa")
        .in("status", ["pendente", "a_vencer"])
        .gte("data_vencimento", hoje)
        .lte("data_vencimento", ate)
        .order("data_vencimento");

      return JSON.stringify(data ?? []);
    }

    return JSON.stringify({ erro: `Tool desconhecida: ${toolName}` });
  } catch (e) {
    return JSON.stringify({ erro: String(e) });
  }
}

// ── Contexto do tenant ────────────────────────────────────────
async function fetchTenantContext(sb: ReturnType<typeof createClient>, tenantId: string) {
  try {
    const [{ data: tenant }, { data: modules }] = await Promise.all([
      sb.from("tenants").select("name, short_name").eq("id", tenantId).single(),
      sb.from("tenant_modules").select("module_id").eq("tenant_id", tenantId).eq("enabled", true),
    ]);

    const name = tenant?.name ?? tenantId;
    const modulosAtivos: string[] = (modules ?? []).map((m) => m.module_id);
    return { name, modulosAtivos };
  } catch {
    return { name: tenantId, modulosAtivos: [] };
  }
}

function buildSystemPrompt(name: string, modulosAtivos: string[]): string {
  const modulosSection =
    modulosAtivos.length > 0
      ? `\nMÓDULOS ATIVOS NESTA EMPRESA:\n${modulosAtivos
          .map((m) => `  - ${MODULE_LABELS[m] ?? m}`)
          .join("\n")}`
      : "";

  return `Você é o assistente de gestão da empresa **${name}**, integrado ao sistema Controle de Obras.

REGRAS IMPORTANTES:
- Você SOMENTE tem acesso aos dados de ${name}. Nunca revele dados de outras empresas.
- Seja objetivo e direto. Use valores formatados em R$ quando falar de dinheiro.
- Se não encontrar dados, informe claramente sem inventar.
- Quando o usuário pedir informações que requerem consulta ao banco, use as ferramentas disponíveis.
- Responda sempre em português brasileiro.${modulosSection}

Se o usuário pedir algo fora dos módulos ativos acima, informe que essa funcionalidade não está disponível para ${name}.`;
}

// ── Agente principal ─────────────────────────────────────────
async function runChat(
  sb: ReturnType<typeof createClient>,
  message: string,
  history: { role: string; content: string }[],
  tenantId: string,
): Promise<string> {
  const { name, modulosAtivos } = await fetchTenantContext(sb, tenantId);
  const systemPrompt = buildSystemPrompt(name, modulosAtivos);

  const messages: unknown[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-10).filter((h) => h.role === "user" || h.role === "assistant"),
    { role: "user", content: message },
  ];

  // Loop de tool calling (máx. 5 rounds)
  for (let i = 0; i < 5; i++) {
    const resp = await fetch(`${GLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GLM_API_KEY}`,
      },
      body: JSON.stringify({ model: GLM_MODEL, messages, tools: TOOLS, tool_choice: "auto" }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`GLM API error ${resp.status}: ${err}`);
    }

    const data = await resp.json();
    const choice = data.choices?.[0];
    if (!choice) throw new Error("Resposta vazia da GLM");

    // Sem tool call — resposta final
    if (choice.finish_reason === "stop" || !choice.message?.tool_calls?.length) {
      return choice.message?.content ?? "(sem resposta)";
    }

    // Executa tool calls
    messages.push(choice.message);

    for (const tc of choice.message.tool_calls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments);
      } catch { /* usa {} */ }

      const result = await executeTool(sb, tc.function.name, args, tenantId);
      messages.push({ role: "tool", tool_call_id: tc.id, content: result });
    }
  }

  return "Não consegui processar sua solicitação. Tente novamente.";
}

// ── JWT validation ────────────────────────────────────────────
async function verifyJwt(token: string): Promise<{ userId: string; tenantId: string } | null> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const [_header, payload] = jwtDecode(token);
    const p = payload as Record<string, unknown>;
    const userId = String(p.sub ?? p.user_id ?? "");
    const tenantId = String(p.tenant_id ?? "");
    if (!userId || !tenantId) return null;

    // Verifica assinatura
    const parts = token.split(".");
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const sig = Uint8Array.from(atob(parts[2].replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sig, data);
    if (!valid) return null;

    return { userId, tenantId };
  } catch {
    return null;
  }
}

// ── Handler principal ─────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Autenticação
  const authHeader = req.headers.get("Authorization") ?? "";
  const xTenantId = req.headers.get("X-Tenant-ID") ?? "";

  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Token não fornecido." }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.slice(7).trim();
  const auth = await verifyJwt(token);

  if (!auth) {
    return new Response(JSON.stringify({ error: "Token inválido." }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // tenant_id: header X-Tenant-ID tem prioridade sobre o token
  const tenantId = xTenantId || auth.tenantId;
  if (!tenantId) {
    return new Response(JSON.stringify({ error: "tenant_id não fornecido." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Parse do body
  let body: { message?: string; history?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON inválido." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (!body.message?.trim()) {
    return new Response(JSON.stringify({ error: "Mensagem vazia." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Cria cliente Supabase com service role (acesso total, isolado por tenant na lógica)
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const response = await runChat(sb, body.message, body.history ?? [], tenantId);
    return new Response(JSON.stringify({ response, tenant_id: tenantId }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: "Erro interno. Tente novamente." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
