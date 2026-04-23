# Plano: Cronograma Spreadsheet - Visão Completa (Custom)

## Resumo
Implementar um sistema de cronograma com visão de planilha completa que abre ao clicar em "Abrir visão completa". O sistema permitirá criar categorias, subcategorias, editar datas e informações inline, usando componentes customizados com Radix UI + Tailwind.

---

## Estrutura de Dados (Hierárquica)

```javascript
// Estrutura com categorias e subcategorias
const cronogramaItem = {
  id: number,
  obra_id: number,
  parent_id: number | null,  // null = categoria raiz
  nivel: number,             // 0 = categoria, 1+ = subcategoria
  fase: string,              // Nome
  descricao: string | null,
  ordem: number,
  data_inicio_planejada: "YYYY-MM-DD",
  data_fim_planejada: "YYYY-MM-DD",
  data_inicio_real: "YYYY-MM-DD" | null,
  data_fim_real: "YYYY-MM-DD" | null,
  progresso: number,         // 0-100
  status: "pendente" | "em_andamento" | "concluida" | "atrasada",
  responsavel_id: number | null,
  cor: string,               // Hex color
  children: CronogramaItem[] // Para renderização em árvore
};
```

---

## Arquivos a Criar

```
app-v2/src/components/cronograma/
├── index.js                    # Exports
├── CronogramaModal.jsx         # Modal fullscreen (~250 linhas)
├── CronogramaSpreadsheet.jsx   # Tabela com árvore (~350 linhas)
├── CronogramaTimeline.jsx      # Barras Gantt (~300 linhas)
├── CronogramaRow.jsx           # Linha editável (~180 linhas)
├── CronogramaHeader.jsx        # Header com escala de datas (~120 linhas)
├── CronogramaToolbar.jsx       # Barra de ferramentas (~100 linhas)
└── EditableCell.jsx            # Célula editável genérica (~80 linhas)

app-v2/src/store/
└── cronogramaStore.js          # Zustand store (~200 linhas)
```

---

## Arquivos a Modificar

| Arquivo | Modificações |
|---------|--------------|
| `app-v2/src/pages/Relatorios.jsx` | Adicionar state do modal, importar e renderizar CronogramaModal |
| `app-v2/src/services/relatoriosService.js` | Adicionar métodos para hierarquia |

---

## Componentes Detalhados

### 1. CronogramaModal.jsx
```jsx
// Dialog fullscreen usando @radix-ui/react-dialog
// Layout: Header + Toolbar + Split Panel (Spreadsheet | Timeline)
//
// Props:
// - open: boolean
// - onOpenChange: (open) => void
// - obraId: number

// Features:
// - Fullscreen (95vw x 90vh)
// - Resizable split panel
// - Keyboard: Escape fecha
```

### 2. CronogramaSpreadsheet.jsx
```jsx
// Tabela com estrutura de árvore expansível
//
// Colunas:
// | [▼] Nome        | Início Plan. | Fim Plan. | Início Real | Fim Real | Duração | Progresso | Status |
//
// Features:
// - Linhas expansíveis (categorias)
// - Indentação visual por nível
// - Clique duplo para editar célula
// - Scroll sincronizado com Timeline
```

### 3. CronogramaTimeline.jsx
```jsx
// Visualização das barras Gantt
//
// Features:
// - Header com escala de meses/semanas
// - Barra planejada (cinza) + barra real (colorida)
// - Linha vertical "hoje"
// - Scroll horizontal independente
// - Zoom: semana / mês / trimestre
```

### 4. CronogramaRow.jsx
```jsx
// Uma linha da tabela (categoria ou subcategoria)
//
// Props:
// - item: CronogramaItem
// - level: number
// - isExpanded: boolean
// - onToggle: () => void
// - onUpdate: (field, value) => void
// - onDelete: () => void
// - onAddChild: () => void

// Features:
// - Chevron para expandir/colapsar
// - Indentação: pl-{level * 6}
// - Células editáveis on double-click
// - Menu de ações (3 dots)
```

### 5. EditableCell.jsx
```jsx
// Célula editável genérica
//
// Props:
// - value: any
// - type: "text" | "date" | "number" | "select"
// - options?: [] (para select)
// - onSave: (value) => void
// - onCancel: () => void

// Features:
// - Click para editar
// - Enter para salvar
// - Escape para cancelar
// - Blur para salvar
```

### 6. cronogramaStore.js
```javascript
import { create } from 'zustand';

const useCronogramaStore = create((set, get) => ({
  // Estado
  items: [],
  expandedIds: new Set(),
  editingCell: null, // { id, field }
  isLoading: false,
  isSaving: false,
  obraId: null,

  // Configurações de visualização
  zoomLevel: 'month', // 'week' | 'month' | 'quarter'
  viewRange: { start: null, end: null },

  // Ações
  carregarCronograma: async (obraId) => {},
  adicionarCategoria: async (data) => {},
  adicionarSubcategoria: async (parentId, data) => {},
  atualizarItem: async (id, campo, valor) => {},
  excluirItem: async (id) => {},
  toggleExpand: (id) => {},
  setEditingCell: (id, field) => {},
  setZoom: (level) => {},

  // Helpers
  buildTree: () => {},
  getItemById: (id) => {},
  calcularDuracao: (inicio, fim) => {},
  calcularProgressoPai: (parentId) => {},
}));
```

---

## Passos de Implementação

### Fase 1: Estrutura Base
1. Criar pasta `app-v2/src/components/cronograma/`
2. Criar `cronogramaStore.js` com estado e ações básicas
3. Criar `CronogramaModal.jsx` com layout skeleton
4. Conectar botão em Relatorios.jsx para abrir modal

### Fase 2: Spreadsheet
1. Criar `CronogramaSpreadsheet.jsx` com tabela básica
2. Criar `CronogramaRow.jsx` com estrutura expansível
3. Implementar renderização em árvore (recursiva)
4. Adicionar indentação visual por nível

### Fase 3: Edição Inline
1. Criar `EditableCell.jsx` genérico
2. Implementar edição de texto (nome)
3. Implementar edição de datas (input date)
4. Implementar edição de progresso (slider)
5. Implementar edição de status (select)

### Fase 4: Timeline
1. Criar `CronogramaHeader.jsx` com escala de datas
2. Criar `CronogramaTimeline.jsx` com barras
3. Calcular posição/largura das barras baseado em datas
4. Sincronizar scroll vertical com Spreadsheet
5. Adicionar linha "hoje"

### Fase 5: CRUD
1. Implementar "Adicionar Categoria" (nova linha raiz)
2. Implementar "Adicionar Subcategoria" (nova linha filha)
3. Implementar exclusão com confirmação
4. Implementar ordenação (drag-and-drop com @dnd-kit)

### Fase 6: Persistência
1. Conectar com `relatoriosService`
2. Salvar alterações no backend
3. Loading states e tratamento de erros

---

## Layout Visual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Cronograma Detalhado                                    [Semana ▾] [✕]   │
├─────────────────────────────────────────────────────────────────────────────┤
│ [+ Categoria]  [📥 Exportar]                                                │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ Nome              │ Início │ Fim     │  JAN  │  FEV  │  MAR  │  ABR  │ ... │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ ▼ Fundação        │ 01/06  │ 15/07   │░░░░░░░░░░░░░░░                      │
│   ├ Escavação     │ 01/06  │ 20/06   │░░░░░                                 │
│   └ Concretagem   │ 21/06  │ 15/07   │      ░░░░░░░░░                       │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ ▼ Estrutura       │ 15/07  │ 30/09   │               ░░░░░░░░░░░░░░░░      │
│   ├ Pilares       │ 15/07  │ 15/08   │               ░░░░░                  │
│   └ Lajes         │ 16/08  │ 30/09   │                     ░░░░░░░░░░░     │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ ▶ Alvenaria       │ 01/10  │ 15/12   │                              ░░░░░░░│
│ ▶ Inst. Elétricas │ 01/11  │ 30/12   │                                  ░░░│
└──────────────────────────────────────┴──────────────────────────────────────┘
                                       │← hoje
```

---

## Colunas do Spreadsheet

| Coluna | Tipo | Largura | Editável |
|--------|------|---------|----------|
| Expand (▼/▶) | icon | 32px | - |
| Nome | text | flex | ✅ |
| Início Plan. | date | 100px | ✅ |
| Fim Plan. | date | 100px | ✅ |
| Duração | calc | 80px | ❌ (auto) |
| Progresso | slider | 100px | ✅ |
| Status | badge | 100px | ✅ |
| Ações | menu | 40px | - |

---

## Cores dos Status

| Status | Cor Background | Cor Texto |
|--------|---------------|-----------|
| pendente | gray-100 | gray-700 |
| em_andamento | blue-100 | blue-700 |
| concluida | emerald-100 | emerald-700 |
| atrasada | rose-100 | rose-700 |

---

## Verificação

### Como testar:
1. `cd app-v2 && npm run dev`
2. Navegar para Relatórios
3. Selecionar uma obra
4. Clicar em "Abrir visão completa" no card Cronograma
5. Testar todas as funcionalidades abaixo

### Checklist de testes:
- [ ] Modal abre em fullscreen
- [ ] Categorias mostram seta para expandir/colapsar
- [ ] Clicar na seta expande/colapsa subcategorias
- [ ] Duplo-clique em célula ativa edição
- [ ] Enter salva edição, Escape cancela
- [ ] Barras do timeline refletem datas corretas
- [ ] "Adicionar Categoria" cria nova linha raiz
- [ ] Menu de ações permite adicionar subcategoria
- [ ] Excluir categoria remove ela e subcategorias
- [ ] Scroll vertical sincroniza tabela e timeline
- [ ] Zoom altera escala de tempo
- [ ] Dados persistem após salvar

---

## Dependências
Não precisa instalar nada novo. Usa:
- `@radix-ui/react-dialog` (já instalado)
- `@dnd-kit/sortable` (já instalado)
- `date-fns` (já instalado)
- `lucide-react` (já instalado)
- `zustand` (já instalado)
