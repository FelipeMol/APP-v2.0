import { useMemo, useState, useEffect } from 'react';
import { X, Settings2, Plus, GripVertical, Calendar, Star, FileText, Save, Trash2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

function generateDefaultTabs() {
  return [
    {
      id: 'avaliacoes',
      title: 'Avaliações',
      fields: [
        { key: 'ultima_avaliacao', label: 'Última avaliação', placeholder: 'Ex: 10/01/2026', value: '' },
        { key: 'proxima_avaliacao', label: 'Próxima avaliação', placeholder: 'Ex: 10/04/2026', value: '' },
        { key: 'nota_media', label: 'Nota média', placeholder: 'Ex: 8,5', value: '' },
      ],
    },
    {
      id: 'entrada',
      title: 'Entrada',
      fields: [
        { key: 'data_entrada', label: 'Data de entrada', placeholder: 'Ex: 05/03/2024', value: '' },
        { key: 'tipo_contrato', label: 'Tipo de contrato', placeholder: 'CLT / PJ / ...', value: '' },
      ],
    },
    {
      id: 'faltas',
      title: 'Faltas',
      fields: [
        { key: 'faltas_mes', label: 'Faltas no mês', placeholder: 'Ex: 0', value: '' },
        { key: 'observacoes_faltas', label: 'Observações', placeholder: 'Detalhes...', value: '' },
      ],
    },
    {
      id: 'atestados',
      title: 'Atestados',
      fields: [
        { key: 'atestados_mes', label: 'Atestados no mês', placeholder: 'Ex: 1', value: '' },
        { key: 'dias_afastado', label: 'Dias afastado', placeholder: 'Ex: 2', value: '' },
      ],
    },
  ];
}

function storageKey(funcionarioId) {
  return `rh.funcionario.${funcionarioId}.tabs.v1`;
}

function evalStorageKey(funcionarioId) {
  return `rh.funcionario.${funcionarioId}.avaliacoes.v1`;
}

function readAvaliacoes(funcionarioId) {
  if (!funcionarioId) return [];
  try {
    const raw = localStorage.getItem(evalStorageKey(funcionarioId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistAvaliacoes(funcionarioId, list) {
  if (!funcionarioId) return;
  localStorage.setItem(evalStorageKey(funcionarioId), JSON.stringify(list));
}

function formatDateBR(dateStr) {
  if (!dateStr) return '';
  // aceita YYYY-MM-DD ou DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(dateStr);
  if (m) return `${m[2]}/${m[1]}/${dateStr.slice(0, 4)}`;
  return dateStr;
}

export default function FuncionarioDrawer({ open, onOpenChange, funcionario }) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const initialTabs = useMemo(() => {
    if (!funcionario?.id) return generateDefaultTabs();

    try {
      const raw = localStorage.getItem(storageKey(funcionario.id));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }

    return generateDefaultTabs();
  }, [funcionario?.id]);

  const [tabs, setTabs] = useState(initialTabs);
  const [activeTab, setActiveTab] = useState(initialTabs?.[0]?.id || 'avaliacoes');

  const [avaliacoes, setAvaliacoes] = useState(() => readAvaliacoes(funcionario?.id));
  const [selectedAvaliacao, setSelectedAvaliacao] = useState(null);
  const [isAvaliacaoModalOpen, setIsAvaliacaoModalOpen] = useState(false);
  const [avaliacaoDraft, setAvaliacaoDraft] = useState(null);

  if (!funcionario) return null;

  function openAvaliacaoModal(av) {
    setSelectedAvaliacao(av);
    setAvaliacaoDraft({
      id: av?.id,
      data: av?.data || '',
      nota: av?.nota || '',
      titulo: av?.titulo || 'Avaliação',
      resumo: av?.resumo || '',
      texto: av?.texto || '',
    });
    setIsAvaliacaoModalOpen(true);
  }

  function closeAvaliacaoModal() {
    setIsAvaliacaoModalOpen(false);
    setSelectedAvaliacao(null);
    setAvaliacaoDraft(null);
  }

  function addAvaliacao() {
    const now = new Date();
    const novo = {
      id: undefined,
      data: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      nota: '',
      titulo: 'Avaliação',
      resumo: '',
      texto: '',
    };
    openAvaliacaoModal(novo);
  }

  function saveAvaliacaoDraft() {
    const funcionarioId = funcionario?.id;
    if (!funcionarioId || !avaliacaoDraft) return;

    const isEdit = Boolean(avaliacaoDraft.id);
    const item = {
      id: avaliacaoDraft.id || `av_${Date.now()}`,
      data: avaliacaoDraft.data || '',
      nota: avaliacaoDraft.nota || '',
      titulo: avaliacaoDraft.titulo || 'Avaliação',
      resumo: avaliacaoDraft.resumo || '',
      texto: avaliacaoDraft.texto || '',
    };

    const nextList = isEdit
      ? avaliacoes.map((x) => (x.id === item.id ? item : x))
      : [item, ...avaliacoes];

    setAvaliacoes(nextList);
    persistAvaliacoes(funcionarioId, nextList);

    setSelectedAvaliacao(item);
    setAvaliacaoDraft({ ...item });
    setIsAvaliacaoModalOpen(false);
  }

  function removeAvaliacao(avId) {
    const funcionarioId = funcionario?.id;
    if (!funcionarioId) return;
    const next = avaliacoes.filter((x) => x.id !== avId);
    setAvaliacoes(next);
    persistAvaliacoes(funcionarioId, next);
    closeAvaliacaoModal();
  }

  function onDrawerOpenChange(nextOpen) {
    onOpenChange(nextOpen);
    // recarregar avaliações ao trocar de funcionário / abrir
    if (nextOpen) {
      setAvaliacoes(readAvaliacoes(funcionario?.id));
    }
  }

  function persist(nextTabs) {
    if (!funcionario?.id) return;
    localStorage.setItem(storageKey(funcionario.id), JSON.stringify(nextTabs));
  }

  function updateField(tabId, fieldKey, value) {
    const next = tabs.map((t) => {
      if (t.id !== tabId) return t;
      return {
        ...t,
        fields: (t.fields || []).map((f) => (f.key === fieldKey ? { ...f, value } : f)),
      };
    });
    setTabs(next);
    persist(next);
  }

  function addTab() {
    const id = `custom_${Date.now()}`;
    const next = [
      ...tabs,
      {
        id,
        title: 'Nova aba',
        fields: [{ key: 'campo_1', label: 'Campo', placeholder: 'Digite...', value: '' }],
      },
    ];
    setTabs(next);
    persist(next);
    setActiveTab(id);
  }

  function renameTab(tabId, title) {
    const next = tabs.map((t) => (t.id === tabId ? { ...t, title } : t));
    setTabs(next);
    persist(next);
  }

  function removeTab(tabId) {
    const next = tabs.filter((t) => t.id !== tabId);
    setTabs(next);
    persist(next);

    if (activeTab === tabId) {
      setActiveTab(next?.[0]?.id || '');
    }
  }

  function addField(tabId) {
    const next = tabs.map((t) => {
      if (t.id !== tabId) return t;
      const fields = Array.isArray(t.fields) ? t.fields : [];
      const idx = fields.length + 1;
      return {
        ...t,
        fields: [
          ...fields,
          { key: `campo_${idx}`, label: `Campo ${idx}`, placeholder: 'Digite...', value: '' },
        ],
      };
    });
    setTabs(next);
    persist(next);
  }

  function updateFieldMeta(tabId, fieldKey, patch) {
    const next = tabs.map((t) => {
      if (t.id !== tabId) return t;
      return {
        ...t,
        fields: (t.fields || []).map((f) => (f.key === fieldKey ? { ...f, ...patch } : f)),
      };
    });
    setTabs(next);
    persist(next);
  }

  function removeField(tabId, fieldKey) {
    const next = tabs.map((t) => {
      if (t.id !== tabId) return t;
      return {
        ...t,
        fields: (t.fields || []).filter((f) => f.key !== fieldKey),
      };
    });
    setTabs(next);
    persist(next);
  }

  // Recarregar avaliações ao trocar o funcionário (evita "vai para todos")
  useEffect(() => {
    if (!funcionario?.id) return;
    setAvaliacoes(readAvaliacoes(funcionario.id));
    // fecha modal/draft ao trocar de funcionário
    setIsAvaliacaoModalOpen(false);
    setSelectedAvaliacao(null);
    setAvaliacaoDraft(null);
  }, [funcionario?.id]);

  // Manter tabs/aba ativa consistentes ao trocar funcionário
  useEffect(() => {
    setTabs(initialTabs);
    setActiveTab(initialTabs?.[0]?.id || 'avaliacoes');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcionario?.id]);

  function clampNota(raw) {
    if (raw === '' || raw == null) return '';
    const cleaned = String(raw).replace(',', '.').replace(/[^0-9.]/g, '');
    const n = Number(cleaned);
    if (Number.isNaN(n)) return '';
    return String(Math.max(0, Math.min(10, n)));
  }

  return (
    <Dialog open={open} onOpenChange={onDrawerOpenChange}>
      <DialogContent className="max-w-[1100px] h-[90vh] overflow-hidden p-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Funcionário</div>
              <div className="text-xl font-semibold text-foreground truncate">{funcionario.nome}</div>
              <div className="text-sm text-muted-foreground truncate">
                {funcionario.funcao || '—'} • {funcionario.empresa || '—'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'avaliacoes' && (
                <Button type="button" variant="outline" size="sm" onClick={addAvaliacao}>
                  <Plus className="w-4 h-4" />
                  Nova avaliação
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={addTab}>
                <Plus className="w-4 h-4" />
                Nova aba
              </Button>
              <Button
                type="button"
                variant={isConfigOpen ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsConfigOpen((v) => !v)}
              >
                <Settings2 className="w-4 h-4" />
                Editar abas
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => onDrawerOpenChange(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="px-6 pt-4">
                <TabsList className="w-full justify-start overflow-x-auto">
                  {tabs.map((t) => (
                    <TabsTrigger key={t.id} value={t.id}>
                      {t.title}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {tabs.map((t) => (
                  <TabsContent key={t.id} value={t.id}>
                    {/* Layout especial para Avaliações (tipo imagem) */}
                    {t.id === 'avaliacoes' ? (
                      <div className="space-y-4">
                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <div className="text-lg font-semibold">Avaliações</div>
                            <div className="text-sm text-muted-foreground">
                              Registros em formato de cards (salvos neste navegador)
                            </div>
                          </div>
                        </div>

                        {avaliacoes.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-8 text-center text-muted-foreground">
                            Nenhuma avaliação cadastrada.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {avaliacoes
                              .slice()
                              .sort((a, b) => (String(b.data || '').localeCompare(String(a.data || ''))))
                              .map((av) => (
                                <div
                                  key={av.id}
                                  className="rounded-xl border border-border/60 bg-background hover:bg-muted/20 transition-colors"
                                >
                                  <div className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <FileText className="w-4 h-4 text-muted-foreground" />
                                          <div className="font-semibold text-foreground truncate">
                                            {av.titulo || 'Avaliação'}
                                          </div>
                                        </div>

                                        <div className="mt-2 text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                                          {av.resumo || av.texto || 'Sem descrição'}
                                        </div>
                                      </div>

                                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Calendar className="w-4 h-4" />
                                          <span>{formatDateBR(av.data)}</span>
                                        </div>

                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Star className="w-4 h-4" />
                                          <span>{av.nota ? `${av.nota}/10` : '—/10'}</span>
                                        </div>

                                        <Button type="button" variant="outline" size="sm" onClick={() => openAvaliacaoModal(av)}>
                                          Ler mais
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-semibold">{t.title}</div>
                            <div className="text-sm text-muted-foreground">Campos editáveis (salvos neste navegador)</div>
                          </div>
                          {isConfigOpen && (
                            <div className="flex items-center gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => addField(t.id)}>
                                <Plus className="w-4 h-4" />
                                Campo
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeTab(t.id)}
                                disabled={tabs.length <= 1}
                              >
                                Remover aba
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(t.fields || []).map((f) => (
                            <Card key={f.key} className="p-4 border-border/60">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1 flex-1 min-w-0">
                                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                                  <Input
                                    value={f.value || ''}
                                    onChange={(e) => updateField(t.id, f.key, e.target.value)}
                                    placeholder={f.placeholder}
                                  />
                                  {f.helper && <div className="text-xs text-muted-foreground">{f.helper}</div>}
                                </div>

                                {isConfigOpen && (
                                  <div className="flex items-center gap-2">
                                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                )}
                              </div>

                              {isConfigOpen && (
                                <div className="mt-3 border-t pt-3 space-y-2">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Título do campo</Label>
                                      <Input
                                        value={f.label || ''}
                                        onChange={(e) => updateFieldMeta(t.id, f.key, { label: e.target.value })}
                                        placeholder="Título"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Placeholder</Label>
                                      <Input
                                        value={f.placeholder || ''}
                                        onChange={(e) => updateFieldMeta(t.id, f.key, { placeholder: e.target.value })}
                                        placeholder="Placeholder"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateFieldMeta(t.id, f.key, { helper: f.helper ? '' : 'Dica / observação...' })}
                                    >
                                      {f.helper ? 'Remover dica' : 'Adicionar dica'}
                                    </Button>

                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => removeField(t.id, f.key)}
                                    >
                                      Remover campo
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </Card>
                          ))}
                        </div>

                        {isConfigOpen && (
                          <div className="mt-2 rounded-lg border border-border/60 bg-muted/20 p-4">
                            <div className="text-sm font-semibold">Editar título da aba</div>
                            <div className="mt-2">
                              <Input
                                value={t.title}
                                onChange={(e) => renameTab(t.id, e.target.value)}
                                placeholder="Nome da aba"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>

          {/* Modal de avaliação (Ler mais / editar) */}
          <Dialog open={isAvaliacaoModalOpen} onOpenChange={(v) => (v ? null : closeAvaliacaoModal())}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/10 via-muted/20 to-accent/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>Avaliação</span>
                    </div>
                    <div className="text-lg font-semibold truncate">
                      {avaliacaoDraft?.titulo || 'Avaliação'}
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={closeAvaliacaoModal}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="px-6 py-5 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      Data
                    </Label>
                    <Input
                      type="date"
                      value={avaliacaoDraft?.data ? String(avaliacaoDraft.data).slice(0, 10) : ''}
                      onChange={(e) => setAvaliacaoDraft((d) => ({ ...d, data: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-muted-foreground" />
                      Nota (0 a 10)
                    </Label>
                    <Input
                      inputMode="decimal"
                      value={avaliacaoDraft?.nota != null ? String(avaliacaoDraft.nota) : ''}
                      onChange={(e) => setAvaliacaoDraft((d) => ({ ...d, nota: clampNota(e.target.value) }))}
                      placeholder="Ex: 7"
                    />
                    <div className="text-xs text-muted-foreground">Aceita 0 a 10 (ex.: 7,5)</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    value={avaliacaoDraft?.titulo || ''}
                    onChange={(e) => setAvaliacaoDraft((d) => ({ ...d, titulo: e.target.value }))}
                    placeholder="Ex: Avaliação - Janeiro"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Resumo</Label>
                  <Input
                    value={avaliacaoDraft?.resumo || ''}
                    onChange={(e) => setAvaliacaoDraft((d) => ({ ...d, resumo: e.target.value }))}
                    placeholder="Resumo curto para aparecer no card"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Texto completo</Label>
                  <textarea
                    className="min-h-[240px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
                    value={avaliacaoDraft?.texto || ''}
                    onChange={(e) => setAvaliacaoDraft((d) => ({ ...d, texto: e.target.value }))}
                    placeholder="Escreva aqui a avaliação completa..."
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t bg-muted/10 flex items-center justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (avaliacaoDraft?.id && confirm('Remover esta avaliação?')) {
                      removeAvaliacao(avaliacaoDraft.id);
                    }
                  }}
                  disabled={!avaliacaoDraft?.id}
                >
                  <Trash2 className="w-4 h-4" />
                  Remover
                </Button>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={closeAvaliacaoModal}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={saveAvaliacaoDraft}>
                    <Save className="w-4 h-4" />
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}
