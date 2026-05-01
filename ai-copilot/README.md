# IA Copilot — Controle de Obras

Servidor Python (FastAPI) que fornece um assistente de IA com acesso ao banco de dados da empresa.

## Arquitetura

```
ai-copilot/
├── main.py          # FastAPI server (endpoint /chat)
├── agent.py         # Orquestrador LLM (OpenAI ou Anthropic)
├── mcp_tools.py     # Ferramentas MCP: funções que consultam o banco
├── db.py            # Pool de conexão asyncpg (PostgreSQL)
├── auth.py          # Validação JWT + extração de tenant_id
├── config.py        # Settings via .env
├── requirements.txt
└── .env.example
```

## Isolamento por Tenant

Toda consulta ao banco inclui `WHERE tenant_id = $1`. O `tenant_id` vem do JWT ou do header `X-Tenant-ID` enviado pelo frontend. **A IA não consegue acessar dados de outra empresa mesmo que tente.**

## Setup

```bash
cd ai-copilot
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env           # Edite o .env com suas chaves
```

## Configuração (.env)

| Variável | Descrição |
|---|---|
| `LLM_PROVIDER` | `openai` (padrão) ou `anthropic` |
| `OPENAI_API_KEY` | Chave da OpenAI |
| `OPENAI_MODEL` | Modelo (ex: `gpt-4o-mini`) |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Mesmo segredo do backend principal |
| `CORS_ORIGINS` | URLs do frontend separadas por vírgula |

## Rodando

```bash
python main.py
# ou
uvicorn main:app --reload --port 8000
```

## Endpoint

### `POST /chat`

**Headers:**
- `Authorization: Bearer <jwt>`
- `X-Tenant-ID: <id_da_empresa>`

**Body:**
```json
{
  "message": "Qual o saldo do mês?",
  "history": [
    { "role": "user", "content": "Oi" },
    { "role": "assistant", "content": "Olá! Como posso ajudar?" }
  ]
}
```

**Response:**
```json
{
  "response": "O saldo de Maio/2026 é R$ 12.450,00...",
  "tenant_id": 3
}
```

## Adicionando novas ferramentas (MCP Tools)

1. Adicione a definição da função em `mcp_tools.py` dentro de `TOOLS`
2. Implemente a função `async def _minha_tool(tenant_id, ...)` no mesmo arquivo
3. Adicione o case em `execute_tool()`

A IA vai começar a usar a nova ferramenta automaticamente quando julgar necessário.

## Frontend

A variável de ambiente do Vite para apontar para este servidor:
```
VITE_AI_API_URL=http://localhost:8000
```
Em produção, substitua pelo endereço do servidor Python.
