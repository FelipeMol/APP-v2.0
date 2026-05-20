import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Trash2, Save, FileSpreadsheet, Copy, ChevronDown, ChevronRight,
  Layers, BookOpen, X, Check, AlertTriangle, GripVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import orcamentoConstrucaoService from '@/services/orcamentoConstrucaoService';
import obrasService from '@/services/obrasService';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const UNIDADES = ['un', 'm²', 'm³', 'm', 'kg', 'l', 'h', 'vb', 'sc', 'pc', 'cx', 'jg', 'par', 'gl'];

const CORES = [
  '#4F46E5', '#059669', '#D97706', '#DC2626',
  '#7C3AED', '#0284C7', '#DB2777', '#475569',
];

const COLS = ['descricao', 'unidade', 'quantidade', 'valor_unitario'];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function brl(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
  }).format(v || 0);
}

function calcItemTotal(item) {
  return (parseFloat(item.quantidade) || 0) * (parseFloat(item.valor_unitario) || 0);
}

function calcGrupoTotal(grupo) {
  return (grupo.itens || []).reduce((s, i) => s + calcItemTotal(i), 0);
}

function calcGrandTotal(grupos) {
  return (grupos || []).reduce((s, g) => s + calcGrupoTotal(g), 0);
}

let _uid = 1;
function uid() { return `tmp-${_uid++}`; }

function newItem(ordem = 0) {
  return { _uid: uid(), descricao: '', unidade: 'un', quantidade: 1, valor_unitario: 0, ordem };
}

function newGrupo(ordem = 0, cor = '#4F46E5') {
  return { _uid: uid(), nome: 'Novo Grupo', cor, ordem, collapsed: false, itens: [newItem(0)] };
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Salvar como Modelo
// ─────────────────────────────────────────────────────────────────────────────

function SalvarModeloModal({ open, onClose, onSave }) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setNome(''); setDescricao(''); } }, [open]);

  async function handleSave() {
    if (!nome.trim()) { toast.error('Nome obrigatório'); return; }
    setSaving(true);
    try {
      await onSave(nome.trim(), descricao.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            Salvar como Modelo
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-500">
            Salve este orçamento como um modelo reutilizável em outras obras.
          </p>
          <div className="space-y-1">
            <Label>Nome do modelo *</Label>
            <Input
              placeholder="Ex: Residência Padrão, Galpão Industrial…"
              value={nome}
              onChange={e => setNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label>Descrição (opcional)</Label>
            <textarea
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
              rows={3}
              placeholder="Descreva quando usar este modelo…"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {saving ? 'Salvando…' : 'Salvar Modelo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Carregar Modelo
// ─────────────────────────────────────────────────────────────────────────────

function CarregarModeloModal({ open, onClose, onSelect }) {
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (open) loadModelos();
  }, [open]);

  async function loadModelos() {
    setLoading(true);
    try {
      const data = await orcamentoConstrucaoService.listModelos();
      setModelos(data);
    } catch (e) {
      toast.error('Erro ao carregar modelos');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!window.confirm('Excluir este modelo permanentemente?')) return;
    setDeleting(id);
    try {
      await orcamentoConstrucaoService.deleteModelo(id);
      setModelos(prev => prev.filter(m => m.id !== id));
      toast.success('Modelo excluído');
    } catch (e) {
      toast.error('Erro ao excluir');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Modelos de Orçamento
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-sm text-gray-500 mb-4">
            Clique em um modelo para substituir o orçamento atual por ele.
          </p>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 skeleton rounded-lg" />)}
            </div>
          ) : modelos.length === 0 ? (
            <div className="text-center py-10">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-500">Nenhum modelo salvo ainda.</p>
              <p className="text-xs text-gray-400 mt-1">Monte um orçamento e salve como modelo.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {modelos.map(m => (
                <button
                  key={m.id}
                  onClick={() => onSelect(m.id)}
                  className="w-full text-left rounded-lg border border-gray-200 px-4 py-3 hover:border-indigo-400 hover:bg-indigo-50 transition-colors group relative"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-900 group-hover:text-indigo-700">{m.nome}</p>
                      {m.descricao && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{m.descricao}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(m.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <button
                      onClick={e => handleDelete(m.id, e)}
                      disabled={deleting === m.id}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                      title="Excluir modelo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Copiar para Obra
// ─────────────────────────────────────────────────────────────────────────────

function CopiarParaObraModal({ open, onClose, onConfirm, obraAtualId }) {
  const [obras, setObras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    if (open) loadObras();
  }, [open]);

  async function loadObras() {
    setLoading(true);
    try {
      const res = await obrasService.list();
      setObras((res.dados || []).filter(o => o.id !== obraAtualId));
    } catch {
      toast.error('Erro ao carregar obras');
    } finally {
      setLoading(false);
    }
  }

  const filtered = obras.filter(o =>
    o.nome?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSelect(obra) {
    if (!window.confirm(`Copiar orçamento para "${obra.nome}"? O orçamento atual dessa obra será substituído.`)) return;
    setCopying(true);
    try {
      await onConfirm(obra.id, obra.nome);
    } finally {
      setCopying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-indigo-600" />
            Copiar para outra Obra
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              O orçamento da obra de destino será <strong>substituído</strong> pelo atual.
              Esta ação não pode ser desfeita.
            </p>
          </div>
          <Input
            placeholder="Buscar obra…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-12 skeleton rounded-lg" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma obra encontrada</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {filtered.map(o => (
                <button
                  key={o.id}
                  onClick={() => handleSelect(o)}
                  disabled={copying}
                  className="w-full text-left rounded-lg border border-gray-200 px-3 py-2.5 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900">{o.nome}</p>
                  {o.cidade && <p className="text-xs text-gray-500">{o.cidade}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal: OrcamentoBuilder
// ─────────────────────────────────────────────────────────────────────────────

export default function OrcamentoBuilder({ obraId, obraNome }) {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [salvarModeloOpen, setSalvarModeloOpen] = useState(false);
  const [carregarModeloOpen, setCarregarModeloOpen] = useState(false);
  const [copiarObraOpen, setCopiarObraOpen] = useState(false);
  const cellRefs = useRef({});

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => { loadData(); }, [obraId]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await orcamentoConstrucaoService.getByObra(obraId);
      setGrupos(
        data.length > 0
          ? data.map(g => ({ ...g, _uid: uid(), collapsed: false, itens: (g.itens || []).map(i => ({ ...i, _uid: uid() })) }))
          : [newGrupo(0)]
      );
      setDirty(false);
    } catch (e) {
      console.error(e);
      setGrupos([newGrupo(0)]);
    } finally {
      setLoading(false);
    }
  }

  const markDirty = () => setDirty(true);

  // ── Mutation helpers ───────────────────────────────────────────────────────

  const updateGrupoField = useCallback((gi, field, value) => {
    setGrupos(prev => {
      const next = [...prev];
      next[gi] = { ...next[gi], [field]: value };
      return next;
    });
    markDirty();
  }, []);

  const updateItem = useCallback((gi, ii, field, value) => {
    setGrupos(prev => {
      const next = [...prev];
      const g = { ...next[gi] };
      const itens = [...g.itens];
      itens[ii] = { ...itens[ii], [field]: value };
      g.itens = itens;
      next[gi] = g;
      return next;
    });
    markDirty();
  }, []);

  const toggleCollapse = (gi) => {
    setGrupos(prev => {
      const next = [...prev];
      next[gi] = { ...next[gi], collapsed: !next[gi].collapsed };
      return next;
    });
  };

  const addGrupo = () => {
    const cor = CORES[grupos.length % CORES.length];
    setGrupos(prev => [...prev, newGrupo(prev.length, cor)]);
    markDirty();
  };

  const removeGrupo = (gi) => {
    if (grupos.length === 1) { toast.error('O orçamento precisa ter ao menos um grupo'); return; }
    setGrupos(prev => prev.filter((_, i) => i !== gi));
    markDirty();
  };

  const addItem = useCallback((gi) => {
    setGrupos(prev => {
      const next = [...prev];
      const g = { ...next[gi] };
      g.itens = [...g.itens, newItem(g.itens.length)];
      next[gi] = g;
      return next;
    });
    markDirty();
  }, []);

  const removeItem = useCallback((gi, ii) => {
    setGrupos(prev => {
      const next = [...prev];
      const g = { ...next[gi] };
      g.itens = g.itens.filter((_, i) => i !== ii);
      // Keep at least one blank row per group
      if (g.itens.length === 0) g.itens = [newItem(0)];
      next[gi] = g;
      return next;
    });
    markDirty();
  }, []);

  const duplicateItem = useCallback((gi, ii) => {
    setGrupos(prev => {
      const next = [...prev];
      const g = { ...next[gi] };
      const original = g.itens[ii];
      const clone = { ...original, _uid: uid(), id: undefined, ordem: ii + 1 };
      const itens = [...g.itens];
      itens.splice(ii + 1, 0, clone);
      g.itens = itens.map((it, idx) => ({ ...it, ordem: idx }));
      next[gi] = g;
      return next;
    });
    markDirty();
  }, []);

  const moveGrupo = (gi, dir) => {
    const target = gi + dir;
    if (target < 0 || target >= grupos.length) return;
    setGrupos(prev => {
      const next = [...prev];
      [next[gi], next[target]] = [next[target], next[gi]];
      return next;
    });
    markDirty();
  };

  const moveItem = useCallback((gi, ii, dir) => {
    setGrupos(prev => {
      const next = [...prev];
      const g = { ...next[gi] };
      const itens = [...g.itens];
      const target = ii + dir;
      if (target < 0 || target >= itens.length) return prev;
      [itens[ii], itens[target]] = [itens[target], itens[ii]];
      g.itens = itens;
      next[gi] = g;
      return next;
    });
    markDirty();
  }, []);

  // ── Keyboard navigation ────────────────────────────────────────────────────

  const refKey = (gi, ii, col) => `${gi}-${ii}-${col}`;

  const handleCellKeyDown = useCallback((e, gi, ii, col) => {
    const colIdx = COLS.indexOf(col);

    if (e.key === 'Tab') {
      e.preventDefault();
      const dir = e.shiftKey ? -1 : 1;
      let ngi = gi, nii = ii, nci = colIdx + dir;

      if (nci >= COLS.length) {
        nci = 0; nii++;
        if (nii >= grupos[gi].itens.length) { ngi++; nii = 0; }
      } else if (nci < 0) {
        nci = COLS.length - 1; nii--;
        if (nii < 0) { ngi--; if (ngi >= 0) nii = grupos[ngi].itens.length - 1; }
      }

      if (ngi >= 0 && ngi < grupos.length) {
        const el = cellRefs.current[refKey(ngi, nii, COLS[nci])];
        el?.focus();
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const nii = ii + 1;
      if (nii < grupos[gi].itens.length) {
        cellRefs.current[refKey(gi, nii, col)]?.focus();
      } else {
        addItem(gi);
        // Focus will shift on next render — use a tiny timeout
        setTimeout(() => {
          const len = grupos[gi].itens.length;
          cellRefs.current[refKey(gi, len, col)]?.focus();
        }, 50);
      }
    }
  }, [grupos, addItem]);

  // ── Persistência ──────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      await orcamentoConstrucaoService.saveByObra(obraId, grupos);
      setDirty(false);
      toast.success('Orçamento salvo com sucesso!');
    } catch (e) {
      toast.error('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSalvarModelo(nome, descricao) {
    await orcamentoConstrucaoService.salvarComoModelo(nome, descricao, grupos);
    toast.success(`Modelo "${nome}" salvo!`);
    setSalvarModeloOpen(false);
  }

  async function handleCarregarModelo(modeloId) {
    try {
      const gruposModelo = await orcamentoConstrucaoService.getModelo(modeloId);
      setGrupos(gruposModelo.map(g => ({
        ...g,
        _uid: uid(),
        collapsed: false,
        itens: (g.itens || []).map(i => ({ ...i, _uid: uid() })),
      })));
      setCarregarModeloOpen(false);
      setDirty(true);
      toast.success('Modelo carregado! Revise e salve.');
    } catch (e) {
      toast.error('Erro ao carregar modelo: ' + e.message);
    }
  }

  async function handleCopiarParaObra(targetId, targetNome) {
    await orcamentoConstrucaoService.saveByObra(targetId, grupos);
    toast.success(`Orçamento copiado para "${targetNome}"!`);
    setCopiarObraOpen(false);
  }

  // ── Export XLSX ────────────────────────────────────────────────────────────

  function handleExportXLSX() {
    const wb = XLSX.utils.book_new();
    const rows = [
      [`Orçamento — ${obraNome}`],
      [],
      ['GRUPO / ITEM', 'UNID', 'QTD', 'VALOR UNIT.', 'TOTAL (R$)'],
    ];

    grupos.forEach((g, gi) => {
      const gTotal = calcGrupoTotal(g);
      rows.push([`${String(gi + 1).padStart(2, '0')}. ${g.nome.toUpperCase()}`, '', '', '', gTotal]);
      (g.itens || []).forEach(item => {
        rows.push([
          `   ${item.descricao}`,
          item.unidade,
          parseFloat(item.quantidade) || 0,
          parseFloat(item.valor_unitario) || 0,
          calcItemTotal(item),
        ]);
      });
      rows.push([]);
    });

    rows.push(['', '', '', 'TOTAL GERAL', calcGrandTotal(grupos)]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 48 }, { wch: 8 }, { wch: 12 }, { wch: 16 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Orçamento');
    XLSX.writeFile(wb, `Orcamento_${(obraNome || 'obra').replace(/\s+/g, '_')}.xlsx`);
  }

  // ── Grand total ────────────────────────────────────────────────────────────

  const grandTotal = calcGrandTotal(grupos);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton rounded-xl h-14" />
        ))}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Orçamento Detalhado</h3>
          <p className="text-sm text-gray-500">
            Monte o orçamento por etapas · edite diretamente nas células
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Total badge */}
          <div className="px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-center min-w-[140px]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">Total Geral</p>
            <p className="text-lg font-bold text-indigo-900 tabular-nums">{brl(grandTotal)}</p>
          </div>

          {/* Actions */}
          <Button variant="outline" size="sm" onClick={() => setCarregarModeloOpen(true)}>
            <Layers className="w-4 h-4 mr-1.5" />
            Modelos
          </Button>

          <Button variant="outline" size="sm" onClick={() => setSalvarModeloOpen(true)}>
            <BookOpen className="w-4 h-4 mr-1.5" />
            Salvar Modelo
          </Button>

          <Button variant="outline" size="sm" onClick={() => setCopiarObraOpen(true)}>
            <Copy className="w-4 h-4 mr-1.5" />
            Copiar para Obra
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportXLSX}>
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Excel
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !dirty}
            className={dirty
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
          >
            {saving ? (
              <>
                <span className="animate-spin mr-1.5">⟳</span> Salvando…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                {dirty ? 'Salvar' : 'Salvo'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">

        {/* Column headers */}
        <div
          className="grid bg-gray-50 border-b border-gray-200 select-none"
          style={{ gridTemplateColumns: '1fr 72px 96px 140px 130px 72px' }}
        >
          {[
            { label: 'Descrição / Item', align: 'left' },
            { label: 'Unid.', align: 'center' },
            { label: 'Qtd.', align: 'right' },
            { label: 'Valor Unit.', align: 'right' },
            { label: 'Total', align: 'right' },
            { label: '', align: 'right' },
          ].map((h, i) => (
            <div
              key={i}
              className={`px-3 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider
                ${h.align === 'right' ? 'text-right' : h.align === 'center' ? 'text-center' : ''}`}
            >
              {h.label}
            </div>
          ))}
        </div>

        {/* Groups */}
        {grupos.map((grupo, gi) => {
          const grupoTotal = calcGrupoTotal(grupo);
          return (
            <div
              key={grupo.id || grupo._uid}
              className="border-b border-gray-100 last:border-b-0"
            >
              {/* ── Group header ── */}
              <div
                className="grid items-center"
                style={{
                  gridTemplateColumns: '1fr 72px 96px 140px 130px 72px',
                  background: grupo.cor + '14',
                  borderLeft: `3px solid ${grupo.cor}`,
                }}
              >
                {/* Name */}
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    onClick={() => toggleCollapse(gi)}
                    className="flex-shrink-0 transition-transform"
                    style={{ color: grupo.cor }}
                  >
                    {grupo.collapsed
                      ? <ChevronRight className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />
                    }
                  </button>

                  <input
                    className="flex-1 bg-transparent border-none outline-none font-semibold text-sm
                      focus:bg-white focus:ring-2 focus:ring-indigo-400 focus:rounded px-1 py-0.5 min-w-0"
                    style={{ color: grupo.cor }}
                    value={grupo.nome}
                    onChange={e => updateGrupoField(gi, 'nome', e.target.value)}
                    title="Clique para renomear o grupo"
                  />

                  <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                    {grupo.itens?.length || 0} {grupo.itens?.length === 1 ? 'item' : 'itens'}
                  </span>

                  {/* Color pickers */}
                  <div className="flex gap-1 flex-shrink-0">
                    {CORES.map(cor => (
                      <button
                        key={cor}
                        onClick={() => updateGrupoField(gi, 'cor', cor)}
                        className="w-3 h-3 rounded-full transition-transform hover:scale-125 ring-offset-1"
                        style={{
                          background: cor,
                          outline: grupo.cor === cor ? `2px solid ${cor}` : undefined,
                          outlineOffset: 2,
                          opacity: grupo.cor === cor ? 1 : 0.45,
                        }}
                        title={cor}
                      />
                    ))}
                  </div>
                </div>

                {/* Spacer cols */}
                <div className="px-3 py-2.5 col-span-3" />

                {/* Group total */}
                <div className="px-3 py-2.5 text-right">
                  <span className="text-sm font-bold tabular-nums" style={{ color: grupo.cor }}>
                    {brl(grupoTotal)}
                  </span>
                </div>

                {/* Group actions */}
                <div className="px-2 py-2 flex items-center justify-end gap-0.5">
                  <button
                    onClick={() => moveGrupo(gi, -1)}
                    disabled={gi === 0}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs leading-none"
                    title="Mover grupo para cima"
                  >▲</button>
                  <button
                    onClick={() => moveGrupo(gi, 1)}
                    disabled={gi === grupos.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 text-xs leading-none"
                    title="Mover grupo para baixo"
                  >▼</button>
                  <button
                    onClick={() => removeGrupo(gi)}
                    className="p-1 text-rose-400 hover:text-rose-600 transition-colors"
                    title="Remover grupo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ── Items ── */}
              {!grupo.collapsed && (
                <>
                  {(grupo.itens || []).map((item, ii) => {
                    const itemTotal = calcItemTotal(item);
                    return (
                      <div
                        key={item.id || item._uid}
                        className="grid items-center border-t border-gray-50 hover:bg-slate-50 transition-colors group/row"
                        style={{ gridTemplateColumns: '1fr 72px 96px 140px 130px 72px' }}
                      >
                        {/* Descrição */}
                        <div className="px-3 py-1 flex items-center gap-2">
                          <span className="text-[11px] text-gray-300 w-5 text-right flex-shrink-0 select-none">
                            {ii + 1}
                          </span>
                          <input
                            ref={el => { if (el) cellRefs.current[refKey(gi, ii, 'descricao')] = el; }}
                            className="w-full bg-transparent border-none outline-none text-sm text-gray-800
                              placeholder:text-gray-300 focus:bg-indigo-50 focus:ring-1 focus:ring-indigo-300
                              rounded px-1.5 py-0.5 min-w-0"
                            value={item.descricao}
                            placeholder="Serviço ou material…"
                            onChange={e => updateItem(gi, ii, 'descricao', e.target.value)}
                            onKeyDown={e => handleCellKeyDown(e, gi, ii, 'descricao')}
                          />
                        </div>

                        {/* Unidade */}
                        <div className="px-1.5 py-1">
                          <select
                            ref={el => { if (el) cellRefs.current[refKey(gi, ii, 'unidade')] = el; }}
                            className="w-full bg-transparent border-none outline-none text-sm text-center
                              text-gray-600 focus:bg-indigo-50 focus:ring-1 focus:ring-indigo-300
                              rounded cursor-pointer py-0.5"
                            value={item.unidade}
                            onChange={e => updateItem(gi, ii, 'unidade', e.target.value)}
                            onKeyDown={e => handleCellKeyDown(e, gi, ii, 'unidade')}
                          >
                            {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>

                        {/* Quantidade */}
                        <div className="px-2 py-1">
                          <input
                            ref={el => { if (el) cellRefs.current[refKey(gi, ii, 'quantidade')] = el; }}
                            type="number"
                            min="0"
                            step="any"
                            className="w-full bg-transparent border-none outline-none text-sm text-right
                              text-gray-800 focus:bg-indigo-50 focus:ring-1 focus:ring-indigo-300
                              rounded px-1.5 py-0.5 tabular-nums"
                            value={item.quantidade === 0 ? '' : item.quantidade}
                            placeholder="0"
                            onChange={e => updateItem(gi, ii, 'quantidade', e.target.value)}
                            onKeyDown={e => handleCellKeyDown(e, gi, ii, 'quantidade')}
                          />
                        </div>

                        {/* Valor Unitário */}
                        <div className="px-2 py-1">
                          <input
                            ref={el => { if (el) cellRefs.current[refKey(gi, ii, 'valor_unitario')] = el; }}
                            type="number"
                            min="0"
                            step="any"
                            className="w-full bg-transparent border-none outline-none text-sm text-right
                              text-gray-800 focus:bg-indigo-50 focus:ring-1 focus:ring-indigo-300
                              rounded px-1.5 py-0.5 tabular-nums"
                            value={item.valor_unitario === 0 ? '' : item.valor_unitario}
                            placeholder="0,00"
                            onChange={e => updateItem(gi, ii, 'valor_unitario', e.target.value)}
                            onKeyDown={e => handleCellKeyDown(e, gi, ii, 'valor_unitario')}
                          />
                        </div>

                        {/* Total (read-only) */}
                        <div className="px-3 py-1 text-right">
                          <span className={`text-sm tabular-nums ${itemTotal > 0 ? 'font-semibold text-gray-900' : 'text-gray-300'}`}>
                            {itemTotal > 0 ? brl(itemTotal) : '—'}
                          </span>
                        </div>

                        {/* Item actions */}
                        <div className="px-1.5 py-1 flex items-center justify-end gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveItem(gi, ii, -1)}
                            disabled={ii === 0}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 text-[10px] leading-none"
                            title="Subir"
                          >▲</button>
                          <button
                            onClick={() => moveItem(gi, ii, 1)}
                            disabled={ii === grupo.itens.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 text-[10px] leading-none"
                            title="Descer"
                          >▼</button>
                          <button
                            onClick={() => duplicateItem(gi, ii)}
                            className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                            title="Duplicar linha"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeItem(gi, ii)}
                            className="p-1 text-gray-400 hover:text-rose-500 transition-colors"
                            title="Remover linha"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add item row */}
                  <div className="border-t border-gray-50">
                    <button
                      onClick={() => addItem(gi)}
                      className="w-full flex items-center gap-2 px-10 py-1.5 text-xs text-gray-400
                        hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar item
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Add group */}
        <div className="border-t border-gray-100">
          <button
            onClick={addGrupo}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-400
              hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar grupo / etapa
          </button>
        </div>

        {/* Grand total footer */}
        <div
          className="grid items-center bg-gray-900"
          style={{ gridTemplateColumns: '1fr 72px 96px 140px 130px 72px' }}
        >
          <div className="px-4 py-3 col-span-4 text-right">
            <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Total Geral
            </span>
          </div>
          <div className="px-3 py-3 text-right">
            <span className="text-base font-bold text-white tabular-nums">{brl(grandTotal)}</span>
          </div>
          <div />
        </div>
      </div>

      {/* Dica de teclado */}
      <p className="text-xs text-gray-400 text-center">
        Tab / Shift+Tab para navegar entre células · Enter para próxima linha
      </p>

      {/* ── Modals ── */}
      <SalvarModeloModal
        open={salvarModeloOpen}
        onClose={() => setSalvarModeloOpen(false)}
        onSave={handleSalvarModelo}
      />

      <CarregarModeloModal
        open={carregarModeloOpen}
        onClose={() => setCarregarModeloOpen(false)}
        onSelect={handleCarregarModelo}
      />

      <CopiarParaObraModal
        open={copiarObraOpen}
        onClose={() => setCopiarObraOpen(false)}
        onConfirm={handleCopiarParaObra}
        obraAtualId={obraId}
      />
    </div>
  );
}
