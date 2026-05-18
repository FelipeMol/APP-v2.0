---
applyTo: "**"
---

# Workflow de Frentes de Trabalho

Este projeto usa branches prefixadas com `frente/` para desenvolvimento paralelo.

## Regra fundamental
**Nenhuma frente de trabalho pode editar o mesmo arquivo que outra frente ativa.**
Antes de criar ou editar, verifique: `./scripts/branch-manager.sh status`

## Nomenclatura de branches
- Frentes de trabalho: `frente/<nome-descritivo>`  (ex: `frente/rh-atestados`)
- Branches permanentes: `main`, `V2.0`

## Ciclo de vida de uma frente
1. `./scripts/branch-manager.sh new <nome>` — cria a partir de `main`
2. Desenvolve, commita normalmente nessa branch
3. `./scripts/branch-manager.sh status` — confere antes de unir
4. Chame o **Merge Agent** para fazer a conferência e o merge

## Como invocar o Merge Agent
No VS Code Copilot Chat, selecione o agente **"Merge Agent"** e descreva o que quer fazer:
- "revisar todas as frentes ativas"
- "fazer merge de todas as frentes"
- "checar conflitos entre frentes"
