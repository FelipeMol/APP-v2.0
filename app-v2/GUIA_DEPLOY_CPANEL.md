# 🚀 Guia de Deploy no cPanel HostGator

## ✅ IMPLEMENTAÇÃO CONCLUÍDA

Todas as funcionalidades foram implementadas com sucesso:

### Módulo de Relatórios
- ✅ Service com agregações de dados ([relatoriosService.js](src/services/relatoriosService.js))
- ✅ Página completa com visualizações ([Relatorios.jsx](src/pages/Relatorios.jsx))
- ✅ Filtro de período (7 dias padrão, mês, customizado)
- ✅ Filtros adicionais (funcionário, obra)
- ✅ 3 visualizações: Top Funcionários, Por Obra, Por Dia
- ✅ **Drill-down**: Clicar no funcionário/obra mostra detalhes
- ✅ Exportação CSV e Excel (4 abas)
- ✅ Cards de estatísticas

### Configuração de Produção
- ✅ [.env.production](.env.production) configurado
- ✅ [public/.htaccess](public/.htaccess) para React Router
- ✅ [vite.config.js](vite.config.js) otimizado
- ✅ [build-production.bat](build-production.bat) criado
- ✅ Build testado e funcionando

---

## 📦 PASSO 1: BUILD LOCAL

1. **Abra o terminal/PowerShell** na pasta `e:\Planilha\app-v2`

2. **Execute o script de build**:
   ```bash
   build-production.bat
   ```

   Ou manualmente:
   ```bash
   npm run build
   ```

3. **Verifique o resultado** em `dist/`:
   - ✅ `index.html`
   - ✅ `.htaccess`
   - ✅ `assets/` (arquivos JS e CSS)
   - ✅ `logo.png`

4. **Criar ZIP para upload**:
   - Abra a pasta `dist/`
   - Selecione **TODO O CONTEÚDO** (não a pasta dist)
   - Clique com botão direito → Enviar para → Pasta compactada
   - Renomear para: `app-v2-build.zip`

---

## 📦 PASSO 2: BACKUP DO APP-V1 NO CPANEL

**IMPORTANTE**: Sempre faça backup antes de qualquer alteração!

### Via cPanel File Manager:

1. **Acesse o cPanel** da HostGator
2. Clique em **File Manager**
3. Navegue até `public_html/`
4. **Selecione TODOS** os arquivos e pastas
5. Clique em **Compress** (no topo)
6. Escolha **Zip Archive**
7. Nome: `backup-app-v1-2026-01-14.zip`
8. Aguarde compactação
9. Clique com botão direito no ZIP → **Download**
10. Salve em local seguro (ex: `e:\Planilha\backups\`)

### OPCIONAL: Mover backup para fora de public_html

11. Selecione o backup ZIP
12. Clique em **Move** (no topo)
13. Novo caminho: `/` (raiz da conta)
14. Confirmar

---

## 📦 PASSO 3: DEPLOY DO APP-V2

### 3.1 Limpar public_html

**⚠️ ATENÇÃO**: NÃO delete a pasta `/api/`!

1. No **File Manager**, dentro de `public_html/`
2. Selecione **TODOS** os arquivos/pastas **EXCETO**:
   - ✅ Manter: `api/` (pasta com APIs PHP)
   - ✅ Manter: `backup-app-v1-2026-01-14.zip` (se ainda estiver aqui)
3. Clique em **Delete**
4. Confirme a exclusão

### 3.2 Upload do app-v2

5. Certifique-se de estar em `public_html/`
6. Clique em **Upload** (no topo)
7. Clique em **Select File**
8. Escolha `app-v2-build.zip` (criado no Passo 1)
9. Aguarde upload (100%)
10. Feche a janela de upload

### 3.3 Extrair arquivos

11. No File Manager, clique com botão direito em `app-v2-build.zip`
12. Escolha **Extract**
13. Caminho de extração: `/public_html/`
14. Confirmar
15. Aguarde extração
16. **Delete o arquivo ZIP** após extração

### 3.4 Verificar estrutura final

```
public_html/
├── index.html              ← App-v2 (React)
├── .htaccess               ← App-v2 (React Router)
├── assets/                 ← App-v2 (JS, CSS)
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
├── logo.png                ← App-v2
├── vite.svg                ← App-v2
└── api/                    ← App-v1 (mantido)
    ├── api_auth.php
    ├── api_lancamentos.php
    ├── api_funcionarios.php
    ├── config.php
    └── ... (todos os arquivos PHP)
```

### 3.5 Verificar permissões

**Geralmente não é necessário**, mas se houver problemas:

- Arquivos: `644` (rw-r--r--)
- Diretórios: `755` (rwxr-xr-x)

---

## ✅ PASSO 4: TESTE PÓS-DEPLOY

### Checklist de Verificação

Acesse seu domínio e teste:

1. ✅ **Homepage carrega** → Tela de login React (não o app-v1)
2. ✅ **Login funciona** → Credenciais válidas levam ao dashboard
3. ✅ **Dashboard** → KPIs carregando (API funcionando)
4. ✅ **Menu lateral** → Todos os módulos visíveis
5. ✅ **Lançamentos** → Listagem com filtros, CRUD funciona
6. ✅ **Relatórios** → Nova funcionalidade
   - Filtro de período (últimos 7 dias padrão)
   - Visualizações (Top Funcionários, Por Obra, Por Dia)
   - Clicar em funcionário abre detalhes (drill-down)
   - Exportar CSV e Excel funciona
7. ✅ **Funcionários, Obras, Empresas** → CRUD completo
8. ✅ **Módulo RH** → 8 tabs funcionando
9. ✅ **URLs amigáveis** → `/dashboard`, `/lancamentos`, `/relatorios` não dão 404

### Teste de URLs Específicas

- `seudominio.com` → Redirect automático para `/dashboard`
- `seudominio.com/login` → Tela de login
- `seudominio.com/lancamentos` → Página de lançamentos
- `seudominio.com/relatorios` → Página de relatórios (NOVA!)
- `seudominio.com/api/api_auth.php` → JSON (não HTML)

### Em caso de erro 404 nas rotas:

Verifique se o `.htaccess` está presente:
1. File Manager → `public_html/`
2. **Ativar "Show Hidden Files"** (Settings, canto superior direito)
3. Verificar se `.htaccess` existe
4. Se não existir, criar manualmente com o conteúdo de [public/.htaccess](public/.htaccess)

---

## 🔄 PASSO 5: ROLLBACK (SE NECESSÁRIO)

Se algo der errado, você pode voltar para o app-v1:

### Reverter para App-v1 (5 minutos)

1. **Remover app-v2**:
   - File Manager → `public_html/`
   - Selecionar TUDO **EXCETO** `/api/` e backup ZIP
   - Delete

2. **Restaurar backup**:
   - Localizar `backup-app-v1-2026-01-14.zip`
   - Botão direito → **Extract**
   - Caminho: `/public_html/`
   - Confirmar

3. **Testar**:
   - Acessar domínio
   - App-v1 deve estar funcionando

---

## 📊 TESTE DO MÓDULO DE RELATÓRIOS

### Funcionalidades para Testar

1. **Período Padrão (7 dias)**:
   - Ao acessar `/relatorios`, deve mostrar últimos 7 dias
   - Cards devem exibir estatísticas corretas

2. **Trocar Período**:
   - Clicar "Este mês" → Dados mudam
   - Clicar "Personalizado" → Inputs de data aparecem
   - Selecionar datas customizadas → Aplicar

3. **Filtros**:
   - Clicar "+ Adicionar filtro"
   - Selecionar um funcionário → Chip aparece
   - Dados filtrados exibidos
   - Clicar X no chip → Remove filtro

4. **Visualizações**:
   - **Tab "Top Funcionários"**:
     - Ranking decrescente por horas
     - Barras de progresso proporcionais
     - Mostra nome, função, horas, lançamentos
   - **Tab "Por Obra"**:
     - Ranking de obras
     - Mostra horas, funcionários, lançamentos
   - **Tab "Por Dia"**:
     - Timeline cronológica (mais recentes primeiro)
     - Mostra data, horas, lançamentos, funcionários, obras

5. **Drill-down (CRÍTICO)**:
   - Clicar em qualquer funcionário no ranking
   - Modal abre com detalhes
   - Tabela mostra TODOS os lançamentos do funcionário no período
   - Totalizadores: horas totais, lançamentos, obras

6. **Exportação**:
   - Clicar "Exportar CSV" → Arquivo baixa
   - Clicar "Exportar Excel" → Arquivo .xlsx baixa com 4 abas:
     - Detalhado
     - Por Funcionário
     - Por Obra
     - Por Dia

---

## 🎯 COMPARAÇÃO: APP-V1 vs APP-V2

### Funcionalidades Migradas (App-v2)
- ✅ Dashboard
- ✅ Lançamentos
- ✅ Funcionários, Obras, Empresas, Funções
- ✅ Usuários e Permissões
- ✅ Módulo RH (8 submódulos)
- ✅ **Relatórios** (NOVO - implementado hoje)

### Funcionalidades Futuras
- ⏳ Tarefas/Kanban (Semana 11)
- ⏳ Avaliações (Semana 7)
- ⏳ BASE (Semana 7)

### Melhorias no App-v2
- ✅ UI moderna (Tailwind + Radix UI)
- ✅ Responsivo (mobile-friendly)
- ✅ Permissões granulares por módulo
- ✅ Performance otimizada (React + Vite)
- ✅ Exportação Excel com múltiplas abas

---

## 🛠️ TROUBLESHOOTING

### Problema: Tela branca após deploy

**Solução**:
1. Abrir DevTools (F12) → Console
2. Verificar erros de carregamento de arquivos
3. Checar se `.htaccess` existe
4. Verificar se `base: '/'` está no `vite.config.js`

### Problema: APIs não funcionam (401 Unauthorized)

**Solução**:
1. Verificar se pasta `/api/` existe
2. Verificar permissões dos arquivos PHP (644)
3. Testar API diretamente: `seudominio.com/api/api_auth.php`
4. Verificar se `config.php` tem credenciais corretas do banco

### Problema: Relatórios não mostram dados

**Solução**:
1. Verificar se há lançamentos no banco de dados
2. Abrir DevTools → Network → Verificar chamada à API
3. Testar diretamente: `/api/api_lancamentos.php?inicio=2026-01-01&fim=2026-01-31`
4. Verificar permissão do módulo "relatorios" para o usuário

### Problema: Exportação Excel não funciona

**Solução**:
1. Verificar se biblioteca `xlsx` foi instalada (`package.json`)
2. Rebuild se necessário: `npm run build`
3. Checar console do navegador para erros

---

## 📝 CHECKLIST FINAL

Antes de considerar o deploy completo, verifique:

- [ ] Build gerado com sucesso (`dist/` existe)
- [ ] Backup do app-v1 baixado
- [ ] App-v2 carrega no navegador
- [ ] Login funciona
- [ ] Dashboard carrega dados
- [ ] Lançamentos CRUD completo
- [ ] **Relatórios funciona completamente**:
  - [ ] Período configurável
  - [ ] Filtros aplicam corretamente
  - [ ] 3 visualizações funcionam
  - [ ] Drill-down (clicar em funcionário)
  - [ ] Exportação CSV
  - [ ] Exportação Excel (4 abas)
- [ ] Permissões funcionam
- [ ] URLs amigáveis (sem 404)
- [ ] APIs respondendo

---

## 🎉 SUCESSO!

Se todos os itens acima estiverem OK, **parabéns**! O app-v2 está em produção com todas as funcionalidades do app-v1, incluindo o módulo de Relatórios Inteligentes.

### Próximos Passos Sugeridos:

1. **Monitorar uso** nos primeiros dias
2. **Coletar feedback** dos usuários
3. **Implementar módulo de Tarefas/Kanban** (próxima prioridade)
4. **Adicionar mais funcionalidades** (Avaliações, BASE)

---

## 📞 SUPORTE

Se encontrar problemas:

1. Verifique o console do navegador (F12 → Console)
2. Verifique logs do servidor (cPanel → Error Logs)
3. Teste APIs diretamente no navegador
4. Use o rollback para voltar ao app-v1 se necessário

**Lembre-se**: O backup do app-v1 está salvo e pode ser restaurado a qualquer momento!

---

**Data de Deploy**: 14/01/2026
**Versão**: v2.0.0
**Build Size**: ~716KB (minificado + gzipped: ~214KB)
