# Módulo RH — Plano de Implementação

> Legenda: ✅ Concluído · 🔄 Em andamento · ⬜ Pendente

---

## FASE 1 — DESIGN (artboards no RH.html)

| # | Artboard | Componente | Status |
|---|----------|-----------|--------|
| D1 | Ficha → Aba Exames Ocupacionais | `RhFichaExames` em `rh-ficha.jsx` | ✅ |
| D2 | Ficha → Aba Experiência (D-10 + form avaliação gestor) | `RhFichaExperiencia` em `rh-ficha.jsx` | ✅ |
| D3 | Ficha → Aba Histórico de Obras (timeline) | `RhFichaObras` em `rh-ficha.jsx` | ✅ |
| D4 | Ficha → Aba Histórico Disciplinar | `RhFichaDisciplinar` em `rh-ficha.jsx` | ✅ |
| D5 | Ficha → Aba Integração & EPIs | `RhFichaEPIs` em `rh-ficha-epis.jsx` | ✅ |
| D6 | Configurações / Perfis de Acesso | `RhConfiguracoes` em `rh-config.jsx` | ✅ |

---

## FASE 2 — PROGRAMAÇÃO (app-v2, página por página)

### P1 · Painel RH
- **Arquivo:** `app-v2/src/pages/rh/DashboardRH.jsx`
- **Design:** artboard `painel` no RH.html
- **Conteúdo:** banner headcount, 6 KPI cards (NA META/FORA), alertas, gráfico movimentação, vagas abertas, headcount por empresa
- **Status:** ✅

### P2 · Requisições de Vaga (lista)
- **Arquivo:** `app-v2/src/pages/rh/RequisicoesVagas.jsx`
- **Design:** artboard `requisicoes` no RH.html
- **Conteúdo:** barra de status (5 counts), filtros (search + Obra + Status + Urgência + Período), tabela completa
- **Status:** ⬜

### P3 · Nova Requisição (formulário)
- **Arquivo:** `app-v2/src/pages/rh/NovaRequisicao.jsx` *(novo)*
- **Design:** artboard `nova-req` no RH.html
- **Conteúdo:** Obra, Função, Perfil técnico, Justificativa, Salário (sugerido + min + max), Urgência (4 níveis), Data estimada, Responsável, Assinatura digital
- **Status:** ⬜

### P4 · Processo Seletivo (stepper 7 etapas)
- **Arquivo:** `app-v2/src/pages/rh/ProcessoSeletivo.jsx` *(novo)*
- **Design:** artboard `processo` no RH.html
- **Conteúdo:** stepper visual 7 etapas com bloqueio sequencial, etapa diretoria com amber blocker
- **Status:** ⬜

### P5 · Ficha do Colaborador (8 abas)
- **Arquivo:** `app-v2/src/pages/rh/FichaColaborador.jsx` *(novo)*
- **Design:** artboards `ficha`, `ficha-docs`, `ficha-aval` + D1–D5

| Aba | Design ref | Status |
|-----|-----------|--------|
| P5a · Identificação | artboard `ficha` | ⬜ |
| P5b · Documentação | artboard `ficha-docs` | ⬜ |
| P5c · Exames Ocupacionais | artboard D1 | ⬜ |
| P5d · Período de Experiência | artboard D2 | ⬜ |
| P5e · Avaliações (6 critérios) | artboard `ficha-aval` | ⬜ |
| P5f · Histórico de Obras | artboard D3 | ⬜ |
| P5g · Histórico Disciplinar | artboard D4 | ⬜ |
| P5h · Integração & EPIs | artboard D5 | ⬜ |

### P6 · Desligamentos
- **Arquivo:** `app-v2/src/pages/rh/Desligamentos.jsx`
- **Design:** artboard `desligamento` no RH.html
- **Conteúdo:** banner navy, blocker justa causa, checklist digital 9 itens, docs rescisão
- **Status:** ⬜

### P7 · Painel da Obra (visão do gestor)
- **Arquivo:** `app-v2/src/pages/rh/PainelObra.jsx` *(novo)*
- **Design:** artboard `obra` no RH.html
- **Conteúdo:** banner lotação, tabela equipe com status, card avaliações pendentes com prazo
- **Status:** ⬜

### P8 · KPIs Diretoria
- **Arquivo:** `app-v2/src/pages/rh/KPIsDiretoria.jsx` *(novo)*
- **Design:** artboard `kpis` no RH.html
- **Conteúdo:** 6 KPI cards com sparkline + NA META/FORA, tabela turnover por obra, 6 relatórios exportáveis
- **Status:** ⬜

---

## Notas técnicas

- **Paleta:** `--navy: #17273C` · `--amber: #E8A628` · `--ok: #3D7A50` · `--warn: #B8862C` · `--error: #B84A33`
- **Tipografia:** Inter · Libre Caslon Text (números grandes) · JetBrains Mono (códigos/matrículas)
- **Pattern:** shadcn/ui + Tailwind + `rhService.js` + `tenantStore` (`tenant_id` em todas as queries)
- **Design source:** `C:\PROJETOS\DESIGNS\FINANCEIRO\RH.html` + `components/rh-*.jsx`

---

## Verificação por página

1. Abrir no navegador lado a lado com o artboard do `RH.html`
2. Conferir pills de status, alertas, campos obrigatórios do regimento
3. Testar com dados reais do Supabase (tenant ativo)
4. Marcar ✅ → avançar
