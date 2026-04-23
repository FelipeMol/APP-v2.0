import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Link2, Link2Off, EyeOff, Trash2, Upload, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { extratoService, lancamentosFinService, contasService } from '@/services/financeiroService'
import useAuthStore from '@/store/authStore'
import { cn } from '@/lib/utils'

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}
function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}
function makeHash(contaId, data, descricao, valor) {
  return btoa(unescape(encodeURIComponent(`${contaId}${data}${descricao}${valor}`))).slice(0, 64)
}

export default function Extrato() {
  const { isAdmin, hasPermission } = useAuthStore()
  const canCreate = isAdmin() || hasPermission('financeiro', 'criar')
  const canEdit   = isAdmin() || hasPermission('financeiro', 'editar')

  const [contas, setContas]         = useState([])
  const [contaId, setContaId]       = useState('')
  const [extrato, setExtrato]       = useState([])
  const [pendentes, setPendentes]   = useState([])
  const [loading, setLoading]       = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('nao_conciliado')

  const [addOpen, setAddOpen]       = useState(false)
  const [addForm, setAddForm]       = useState({ data: '', descricao: '', valor: '', tipo: 'debito' })
  const [saving, setSaving]         = useState(false)

  const [concOpen, setConcOpen]     = useState(false)
  const [linhaConc, setLinhaConc]   = useState(null)
  const [lancSel, setLancSel]       = useState('')

  const [csvText, setCsvText]       = useState('')
  const [csvPreview, setCsvPreview] = useState(null)

  useEffect(() => { contasService.list().then(setContas) }, [])
  useEffect(() => { if (contaId) { loadExtrato(); loadPendentes() } }, [contaId, filtroStatus])

  async function loadExtrato() {
    setLoading(true)
    try { setExtrato(await extratoService.list(contaId, filtroStatus || null)) }
    catch (err) { toast.error(err.message) }
    setLoading(false)
  }

  async function loadPendentes() {
    try {
      const data = await lancamentosFinService.list({ status: 'pendente' })
      setPendentes(data)
    } catch {}
  }

  const saldo = extrato.reduce((acc, l) => acc + (l.tipo === 'credito' ? +l.valor : -l.valor), 0)

  // ── Linha manual ───────────────────────────────────────

  async function salvarLinha(e) {
    e.preventDefault()
    if (!contaId) { toast.error('Selecione uma conta'); return }
    setSaving(true)
    try {
      const valor = parseFloat(addForm.valor)
      await extratoService.addLinha({
        conta_id: contaId, data: addForm.data, descricao: addForm.descricao,
        valor: Math.abs(valor), tipo: addForm.tipo,
        hash_linha: makeHash(contaId, addForm.data, addForm.descricao, valor)
      })
      toast.success('Linha adicionada!')
      setAddOpen(false)
      setAddForm({ data: '', descricao: '', valor: '', tipo: 'debito' })
      loadExtrato()
    } catch (err) { toast.error(err.code === '23505' ? 'Linha duplicada' : err.message) }
    setSaving(false)
  }

  // ── Conciliação ────────────────────────────────────────

  function abrirConc(linha) { setLinhaConc(linha); setLancSel(''); setConcOpen(true) }

  async function conciliar() {
    if (!lancSel) { toast.error('Selecione um lançamento'); return }
    try {
      await extratoService.conciliar(linhaConc.id, parseInt(lancSel), linhaConc.data)
      toast.success('Conciliado! ✅')
      setConcOpen(false)
      loadExtrato(); loadPendentes()
    } catch (err) { toast.error(err.message) }
  }

  async function desconciliar(linha) {
    if (!confirm('Desfazer conciliação?')) return
    try {
      await extratoService.desconciliar(linha.id, linha.lancamento_id)
      toast.success('Desfeita'); loadExtrato(); loadPendentes()
    } catch (err) { toast.error(err.message) }
  }

  async function ignorar(id) {
    try { await extratoService.ignorar(id); loadExtrato() }
    catch (err) { toast.error(err.message) }
  }

  async function remover(id) {
    if (!confirm('Remover esta linha?')) return
    try { await extratoService.remove(id); loadExtrato() }
    catch (err) { toast.error(err.message) }
  }

  // ── CSV ────────────────────────────────────────────────

  function processarCSV() {
    if (!csvText.trim()) { toast.error('Cole o conteúdo CSV'); return }
    if (!contaId) { toast.error('Selecione uma conta'); return }
    const linhas = csvText.trim().split('\n').filter(l => l.trim())
    const ok = [], erros = []
    linhas.forEach((linha, i) => {
      const sep = linha.includes(';') ? ';' : ','
      const [rawData, desc, rawVal] = linha.split(sep).map(p => p.trim().replace(/^["']|["']$/g, ''))
      if (!rawData || !desc || !rawVal) { erros.push(`Linha ${i+1}: dados incompletos`); return }
      const valor = parseFloat(rawVal.replace('R$','').replace(/\./g,'').replace(',','.').trim())
      if (isNaN(valor)) { erros.push(`Linha ${i+1}: valor inválido`); return }
      let data = rawData
      if (rawData.includes('/')) {
        const [d, m, y] = rawData.split('/')
        data = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) { erros.push(`Linha ${i+1}: data inválida (use AAAA-MM-DD)`); return }
      ok.push({ data, descricao: desc, valor: Math.abs(valor), tipo: valor >= 0 ? 'credito' : 'debito' })
    })
    setCsvPreview({ ok, erros })
  }

  async function importarCSV() {
    if (!csvPreview?.ok?.length) return
    try {
      const rows = csvPreview.ok.map(l => ({
        conta_id: contaId, ...l,
        hash_linha: makeHash(contaId, l.data, l.descricao, l.valor)
      }))
      const inserted = await extratoService.importarLinhas(rows)
      toast.success(`${inserted.length} linhas importadas!`)
      setCsvText(''); setCsvPreview(null); loadExtrato()
    } catch (err) { toast.error(err.message) }
  }

  const sugestoes = linhaConc
    ? pendentes.filter(l => l.tipo === (linhaConc.tipo === 'credito' ? 'receita' : 'despesa')
        && Math.abs(parseFloat(l.valor) - parseFloat(linhaConc.valor)) < 0.01)
    : []

  const pendentesDoTipo = linhaConc
    ? pendentes.filter(l => l.tipo === (linhaConc.tipo === 'credito' ? 'receita' : 'despesa'))
    : []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Extrato & Conciliação</h1>
        <p className="text-gray-500 text-sm mt-1">Importe o extrato do banco e concilie com seus lançamentos</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Coluna principal: extrato */}
        <div className="xl:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <select className="select-field flex-1 min-w-48" value={contaId} onChange={e => setContaId(e.target.value)}>
                <option value="">Selecione uma conta</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <select className="select-field w-44" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                <option value="">Todos</option>
                <option value="nao_conciliado">Não conciliados</option>
                <option value="conciliado">Conciliados</option>
                <option value="ignorado">Ignorados</option>
              </select>
              {canCreate && (
                <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} disabled={!contaId}>
                  <Plus className="w-3.5 h-3.5" /> Manual
                </Button>
              )}
            </CardContent>
          </Card>

          {contaId && (
            <div className={cn('rounded-lg px-4 py-2.5 text-white text-sm font-medium flex items-center justify-between', saldo >= 0 ? 'bg-green-600' : 'bg-red-600')}>
              <span>Saldo do extrato filtrado</span>
              <span className="text-lg font-bold">{fmt(saldo)}</span>
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              {!contaId ? (
                <div className="p-12 text-center text-gray-400">Selecione uma conta acima</div>
              ) : loading ? (
                <div className="p-8 text-center text-gray-400">Carregando...</div>
              ) : extrato.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <Upload className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p>Nenhuma linha encontrada</p>
                </div>
              ) : (
                extrato.map(linha => (
                  <div key={linha.id} className={cn(
                    'flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50',
                    linha.status === 'conciliado' && 'bg-green-50/40',
                    linha.status === 'ignorado' && 'opacity-50'
                  )}>
                    <div className="w-20 text-xs text-gray-400 shrink-0">{fmtDate(linha.data)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{linha.descricao}</p>
                      {linha.financeiro_lancamentos && (
                        <p className="text-xs text-green-600">✅ {linha.financeiro_lancamentos.descricao}</p>
                      )}
                    </div>
                    <span className={cn('text-sm font-bold shrink-0', linha.tipo === 'credito' ? 'text-green-700' : 'text-red-700')}>
                      {linha.tipo === 'credito' ? '+' : '-'}{fmt(linha.valor)}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {linha.status === 'nao_conciliado' && canEdit && (
                        <>
                          <button onClick={() => abrirConc(linha)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" title="Conciliar"><Link2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => ignorar(linha.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Ignorar"><EyeOff className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                      {linha.status === 'conciliado' && canEdit && (
                        <button onClick={() => desconciliar(linha)} className="p-1.5 rounded hover:bg-amber-50 text-green-500 hover:text-amber-600" title="Desfazer"><Link2Off className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={() => remover(linha.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna: importar CSV */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Upload className="w-4 h-4" /> Importar CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-400 leading-relaxed">
              Formato: <code className="bg-gray-100 px-1 rounded">AAAA-MM-DD;Descrição;Valor</code><br/>
              Negativos = débito. Separador <code className="bg-gray-100 px-1 rounded">;</code> ou <code className="bg-gray-100 px-1 rounded">,</code>
            </p>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              rows={7}
              placeholder={'2024-01-15;Pag. cimento;-1500.00\n2024-01-16;Recebimento;5000.00'}
              value={csvText}
              onChange={e => { setCsvText(e.target.value); setCsvPreview(null) }}
            />
            <Button size="sm" variant="outline" className="w-full" onClick={processarCSV}>Processar</Button>
            {csvPreview && (
              <div className="space-y-2">
                {csvPreview.erros.length > 0 && (
                  <div className="text-xs text-red-600 bg-red-50 rounded p-2">{csvPreview.erros.join(' · ')}</div>
                )}
                {csvPreview.ok.length > 0 && (
                  <>
                    <div className="text-xs text-green-700 bg-green-50 rounded p-2">✅ {csvPreview.ok.length} linhas prontas</div>
                    <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                      {csvPreview.ok.slice(0,4).map((l,i) => (
                        <div key={i} className="flex justify-between text-gray-600 border-b pb-0.5">
                          <span className="truncate">{l.descricao}</span>
                          <span className={cn('ml-2 shrink-0', l.tipo === 'credito' ? 'text-green-600' : 'text-red-600')}>
                            {l.tipo === 'credito' ? '+' : '-'}{fmt(l.valor)}
                          </span>
                        </div>
                      ))}
                      {csvPreview.ok.length > 4 && <p className="text-gray-400">+ {csvPreview.ok.length - 4} mais</p>}
                    </div>
                    <Button size="sm" className="w-full" onClick={importarCSV}>📥 Importar {csvPreview.ok.length} linhas</Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal: linha manual */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adicionar Linha Manual</DialogTitle></DialogHeader>
          <form onSubmit={salvarLinha} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data *</Label><Input className="mt-1" type="date" value={addForm.data} onChange={e => setAddForm(f => ({...f, data: e.target.value}))} required /></div>
              <div>
                <Label>Tipo</Label>
                <select className="select-field mt-1 w-full" value={addForm.tipo} onChange={e => setAddForm(f => ({...f, tipo: e.target.value}))}>
                  <option value="debito">Débito (saída)</option>
                  <option value="credito">Crédito (entrada)</option>
                </select>
              </div>
            </div>
            <div><Label>Descrição *</Label><Input className="mt-1" placeholder="Descrição da movimentação" value={addForm.descricao} onChange={e => setAddForm(f => ({...f, descricao: e.target.value}))} required /></div>
            <div><Label>Valor (R$) *</Label><Input className="mt-1" type="number" step="0.01" min="0" value={addForm.valor} onChange={e => setAddForm(f => ({...f, valor: e.target.value}))} required /></div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Salvando...' : 'Adicionar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: conciliação */}
      <Dialog open={concOpen} onOpenChange={setConcOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>🔗 Conciliar com Lançamento</DialogTitle></DialogHeader>
          {linhaConc && (
            <div className="space-y-4 mt-2">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Linha do Extrato</p>
                <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                  <div><p className="font-medium text-gray-900">{linhaConc.descricao}</p><p className="text-xs text-gray-400">{fmtDate(linhaConc.data)}</p></div>
                  <span className={cn('font-bold', linhaConc.tipo === 'credito' ? 'text-green-700' : 'text-red-700')}>
                    {linhaConc.tipo === 'credito' ? '+' : '-'}{fmt(linhaConc.valor)}
                  </span>
                </div>
              </div>
              {sugestoes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Sugestões (mesmo valor)</p>
                  <div className="space-y-1">
                    {sugestoes.map(l => (
                      <button key={l.id} onClick={() => setLancSel(String(l.id))}
                        className={cn('w-full flex items-center justify-between p-3 rounded-lg border text-left text-sm transition-colors',
                          lancSel == l.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        )}>
                        <div><p className="font-medium text-gray-900">{l.descricao}</p><p className="text-xs text-gray-400">{fmtDate(l.data_vencimento)}</p></div>
                        <span className="font-bold text-gray-700">{fmt(l.valor)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label>Ou selecione manualmente</Label>
                <select className="select-field mt-1 w-full" value={lancSel} onChange={e => setLancSel(e.target.value)}>
                  <option value="">Selecionar...</option>
                  {pendentesDoTipo.map(l => (
                    <option key={l.id} value={l.id}>{fmtDate(l.data_vencimento)} | {l.descricao} | {fmt(l.valor)}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setConcOpen(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={conciliar} disabled={!lancSel}>✅ Conciliar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
