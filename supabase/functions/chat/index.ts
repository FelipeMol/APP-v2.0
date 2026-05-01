// Supabase Edge Function — AI Copilot Chat
// Deploy: supabase functions deploy chat
// Variáveis necessárias (supabase secrets set):
//   GLM_API_KEY, JWT_SECRET

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = "sb_publishable_JjS4xfCV-i7B3orHHNi0bw_ALiM2e-5";
const GLM_API_KEY = Deno.env.get("GLM_API_KEY") ?? "374fbf9ba3d9464eb271f2b12a87938f.ZHxVFLgwp45h1txM";
const GLM_MODEL = "glm-4.5-air";
const GLM_BASE_URL = "https://api.z.ai/api/paas/v4";

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
        "Lista lançamentos financeiros com filtros opcionais. Use quando pedirem lançamentos, transações, pagamentos, recebimentos. Para datas específicas como 'última quinta', 'ontem', 'semana passada', calcule data_inicio e data_fim e passe-as diretamente.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["receita", "despesa"] },
          mes: { type: "integer", description: "Mês (1-12). Ignorado se data_inicio/data_fim forem fornecidos." },
          ano: { type: "integer", description: "Ano. Ignorado se data_inicio/data_fim forem fornecidos." },
          data_inicio: { type: "string", description: "Data inicial no formato YYYY-MM-DD para filtro de período específico." },
          data_fim: { type: "string", description: "Data final no formato YYYY-MM-DD para filtro de período específico." },
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
        .gte("data_vencimento", inicio)
        .lte("data_vencimento", fim);

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
      const limit = Math.min((args.limit as number) ?? 20, 50);
      let inicio: string;
      let fim: string;
      if (args.data_inicio && args.data_fim) {
        inicio = args.data_inicio as string;
        fim = args.data_fim as string;
      } else {
        const mes = (args.mes as number) ?? mesPadrao;
        const ano = (args.ano as number) ?? anoPadrao;
        [inicio, fim] = dateRange(mes, ano);
      }

      let q = sb
        .from("financeiro_lancamentos")
        .select("id, descricao, valor, tipo, data_vencimento, status, financeiro_categorias(nome)")
        .eq("tenant_id", tenantId)
        .gte("data_vencimento", inicio)
        .lte("data_vencimento", fim)
        .order("data_vencimento", { ascending: false })
        .limit(limit);

      if (args.tipo) q = q.eq("tipo", args.tipo as string);

      const { data } = await q;
      return JSON.stringify(data ?? []);
    }

    if (toolName === "listar_obras") {
      let q = sb
        .from("obras")
        .select("id, nome, status, cidade, data_inicio, data_prevista, progresso, orcamento, custo_atual")
        .eq("tenant_id", tenantId)
        .order("nome");

      if (args.status) q = q.eq("status", args.status as string);

      const { data } = await q;
      return JSON.stringify(data ?? []);
    }

    if (toolName === "listar_funcionarios") {
      let q = sb
        .from("funcionarios")
        .select("id, nome, funcao, status, data_admissao")
        .eq("tenant_id", tenantId)
        .order("nome");

      if (args.ativo !== undefined) q = q.eq("status", args.ativo ? "ativo" : "inativo");

      const { data } = await q;
      return JSON.stringify(data ?? []);
    }

    if (toolName === "despesas_por_categoria") {
      const mes = (args.mes as number) ?? mesPadrao;
      const ano = (args.ano as number) ?? anoPadrao;
      const [inicio, fim] = dateRange(mes, ano);

      const { data } = await sb
        .from("financeiro_lancamentos")
        .select("valor, financeiro_categorias(nome)")
        .eq("tenant_id", tenantId)
        .eq("tipo", "despesa")
        .gte("data_vencimento", inicio)
        .lte("data_vencimento", fim);

      const totais: Record<string, { total: number; quantidade: number }> = {};
      for (const r of data ?? []) {
        const cat = (r as Record<string, unknown> & { financeiro_categorias?: { nome?: string } }).financeiro_categorias?.nome ?? "Sem categoria";
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
        .select("id, descricao, valor, data_vencimento, status, financeiro_categorias(nome)")
        .eq("tenant_id", tenantId)
        .eq("tipo", "despesa")
        .in("status", ["pendente", "a_vencer", "aberto"])
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

// ── Snapshot completo do banco ────────────────────────────────
interface DbSnapshot {
  obras: Array<{ nome: string; status: string; cidade: string | null; progresso: number | null; orcamento: number | null; custo_atual: number | null }>;
  funcionarios: Array<{ nome: string; funcao: string | null; status: string }>;
  lancamentos: { total: number; data_min: string; data_max: string; receitas_mes: number; despesas_mes: number };
  categorias: string[];
}

async function fetchDatabaseSnapshot(sb: ReturnType<typeof createClient>, tenantId: string): Promise<DbSnapshot> {
  const { mes, ano } = currentMonthYear();
  const [inicio, fim] = dateRange(mes, ano);

  const [obrasRes, funcRes, lancCountRes, lancMinRes, lancMaxRes, lancMesRes, catRes] = await Promise.all([
    sb.from("obras").select("nome, status, cidade, progresso, orcamento, custo_atual").eq("tenant_id", tenantId).order("nome"),
    sb.from("funcionarios").select("nome, funcao, status").eq("tenant_id", tenantId).order("nome"),
    sb.from("financeiro_lancamentos").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
    sb.from("financeiro_lancamentos").select("data_vencimento").eq("tenant_id", tenantId).order("data_vencimento", { ascending: true }).limit(1),
    sb.from("financeiro_lancamentos").select("data_vencimento").eq("tenant_id", tenantId).order("data_vencimento", { ascending: false }).limit(1),
    sb.from("financeiro_lancamentos").select("tipo, valor").eq("tenant_id", tenantId).gte("data_vencimento", inicio).lte("data_vencimento", fim),
    sb.from("financeiro_categorias").select("nome").eq("tenant_id", tenantId).order("nome"),
  ]);

  const lancMesData = lancMesRes.data ?? [];
  const receitas_mes = lancMesData.filter((r) => r.tipo === "receita").reduce((s, r) => s + Number(r.valor), 0);
  const despesas_mes = lancMesData.filter((r) => r.tipo === "despesa").reduce((s, r) => s + Number(r.valor), 0);

  return {
    obras: (obrasRes.data ?? []) as DbSnapshot["obras"],
    funcionarios: (funcRes.data ?? []) as DbSnapshot["funcionarios"],
    lancamentos: {
      total: lancCountRes.count ?? 0,
      data_min: (lancMinRes.data?.[0] as { data_vencimento: string } | undefined)?.data_vencimento ?? "",
      data_max: (lancMaxRes.data?.[0] as { data_vencimento: string } | undefined)?.data_vencimento ?? "",
      receitas_mes,
      despesas_mes,
    },
    categorias: ((catRes.data ?? []) as Array<{ nome: string }>).map((c) => c.nome),
  };
}

function buildSystemPrompt(name: string, modulosAtivos: string[], snapshot: DbSnapshot | null): string {
  const modulosSection =
    modulosAtivos.length > 0
      ? `\nMÓDULOS ATIVOS NESTA EMPRESA:\n${modulosAtivos
          .map((m) => `  - ${MODULE_LABELS[m] ?? m}`)
          .join("\n")}`
      : "";

  const agora = new Date();
  const dataHoje = agora.toISOString().split("T")[0];
  const mesPadrao = agora.getMonth() + 1;
  const anoPadrao = agora.getFullYear();
  const diaSemana = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"][agora.getDay()];

  let snapshotSection = "";
  if (snapshot) {
    const { obras, funcionarios, lancamentos, categorias } = snapshot;

    // Obras
    const obrasLinhas = obras.map((o) => {
      const prog = o.progresso != null ? `${o.progresso}%` : "—";
      const orc = o.orcamento != null ? `R$ ${Number(o.orcamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—";
      const cidade = o.cidade ?? "—";
      return `  • ${o.nome} | ${o.status} | ${cidade} | progresso: ${prog} | orçado: ${orc}`;
    }).join("\n");

    // Funcionários
    const ativos = funcionarios.filter((f) => f.status === "ativo");
    const inativos = funcionarios.filter((f) => f.status !== "ativo");
    const funcLinhas = funcionarios.map((f) => `  • ${f.nome} | ${f.funcao ?? "—"} | ${f.status}`).join("\n");

    // Financeiro
    const periodoLanc = lancamentos.data_min && lancamentos.data_max
      ? `${lancamentos.data_min} a ${lancamentos.data_max}`
      : "sem dados";
    const recMes = lancamentos.receitas_mes.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const despMes = lancamentos.despesas_mes.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const saldoMes = (lancamentos.receitas_mes - lancamentos.despesas_mes).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    const catLista = categorias.join(", ") || "nenhuma";

    snapshotSection = `

DADOS ATUAIS DA EMPRESA (use para responder perguntas diretas sem precisar chamar ferramentas):

OBRAS (${obras.length} cadastradas):
${obrasLinhas || "  (nenhuma obra cadastrada)"}

EQUIPE (${funcionarios.length} total | ${ativos.length} ativas | ${inativos.length} inativas):
${funcLinhas || "  (nenhum funcionário cadastrado)"}

FINANCEIRO:
  Total de lançamentos: ${lancamentos.total} (período: ${periodoLanc})
  ${String(mesPadrao).padStart(2,"0")}/${anoPadrao}: Receitas R$ ${recMes} | Despesas R$ ${despMes} | Saldo R$ ${saldoMes}
  Categorias disponíveis: ${catLista}`;
  }

  return `Você é o assistente de gestão da empresa **${name}**, integrado ao sistema Controle de Obras.

DATA ATUAL: ${dataHoje} (${diaSemana})
Use essa data para calcular referências relativas como "ontem", "semana passada", "última quinta-feira", etc. Ao usar a tool listar_lancamentos_financeiros para datas específicas, passe data_inicio e data_fim no formato YYYY-MM-DD.

REGRAS IMPORTANTES:
- Você SOMENTE tem acesso aos dados de ${name}. Nunca revele dados de outras empresas.
- Seja objetivo e direto. Use valores formatados em R$ quando falar de dinheiro.
- Se não encontrar dados, informe claramente sem inventar.
- Para detalhes específicos (listar lançamentos de um período, filtrar por categoria etc.), use as ferramentas disponíveis.
- Responda sempre em português brasileiro.${modulosSection}${snapshotSection}

Se o usuário pedir algo fora dos módulos ativos acima, informe que essa funcionalidade não está disponível para ${name}.`;
}

// ── Agente principal ─────────────────────────────────────────
async function runChat(
  sb: ReturnType<typeof createClient>,
  message: string,
  history: { role: string; content: string }[],
  tenantId: string,
): Promise<string> {
  const [{ name, modulosAtivos }, snapshot] = await Promise.all([
    fetchTenantContext(sb, tenantId),
    fetchDatabaseSnapshot(sb, tenantId).catch(() => null),
  ]);
  const systemPrompt = buildSystemPrompt(name, modulosAtivos, snapshot);

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
      body: JSON.stringify({ model: GLM_MODEL, messages, tools: TOOLS, tool_choice: "auto", max_tokens: 2048 }),
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

// ── JWT validation via Supabase Auth ─────────────────────────
async function verifyJwt(token: string): Promise<{ userId: string } | null> {
  try {
    const sbAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user }, error } = await sbAuth.auth.getUser(token);
    if (error || !user) return null;
    return { userId: user.id };
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

  // tenant_id vem obrigatoriamente do header X-Tenant-ID
  const tenantId = xTenantId;
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
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("Chat error:", errMsg);
    return new Response(JSON.stringify({ error: "Erro interno.", detail: errMsg }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
