import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Check, ArrowUpCircle, ArrowDownCircle, Clock, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { lancamentosFinService, categoriasService, contasService } from '@/services/financeiroService'
import useAuthStore from '@/store/authStore'

const EMPTY = {
  descricao: '', valor: '', tipo: 'despesa', categoria_id: '', conta_id: '',
  data_vencimento: '', data_pagamento: '', status: 'pendente',
  numero_documento: '', observacao: ''
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}
function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

export default function Lancamentos() {
  const { isAdmin, hasPermission } = useAuthStore()
  const canCreate = isAdmin() || hasPermission('financeiro', 'criar')
  const canEdit   = isAdmin() || hasPermission('financeiro', 'editar')
  const canDelete = isAdmin() || hasPermission('financeiro', 'excluir')

  const [lancamentos, setLancamentos] = useState([])
  const [categorias, setCategorias]   = useState([])
  const [contas, setContas]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [open, setOpen]               = useState(false)
  const [form, setForm]               = useState(EMPTY)
  const [editId, setEditId]           = useState(null)
  const [saving, setSaving]           = useState(false)
  const [filtros, setFiltros]         = useState({ tipo: '', status: '', conta_id: '', inicio: '', fim: '' })

  useEffect(() => {
    Promise.all([categoriasService.list(), contasService.list()]).then(([cats, cnts]) => {
      setCategorias(cats); setContas(cnts)
    })
    load()
  }, [])

  async function load(f = filtros) {
    setLoading(true)
    try {
      const data = await lancamentosFinService.list(f)
      setLancamentos(data)
    } catch (err) { toast.error(err.message) }
    setLoading(false)
  }

  const totais = useMemo(() => lancamentos.reduce((acc, l) => {
    const v = parseFloat(l.valor)
    if (l.tipo === 'receita') { acc.receitas += v; if (l.status === 'pendente') acc.aReceber += v }
    else                      { acc.despesas += v; if (l.status === 'pendente') acc.aPagar += v }
    return acc
  }, { receitas: 0, despesas: 0, aReceber: 0, aPagar: 0 }), [lancamentos])

  function abrir(tipo = 'despesa', l = null) {
    if (l) {
      setForm({
        descricao: l.descricao, valor: String(l.valor), tipo: l.tipo,
        categoria_id: l.categoria_id || '', conta_id: l.conta_id || '',
        data_vencimento: l.data_vencimento || '', data_pagamento: l.data_pagamento || '',
        status: l.status, numero_documento: l.numero_documento || '', observacao: l.observacao || ''
      })
      setEditId(l.id)
    } else {
      setForm({ ...EMPTY, tipo }); setEditId(null)
    }
    setOpen(true)
  }

  async function salvar(e) {
    e.preventDefault()
    if (!form.descricao || !form.valor || !form.data_vencimento) {
      toast.error('Descrição, valor e vencimento são obrigatórios'); return
    }
    setSaving(true)
    try {
      const payload = {
        descricao: form.descricao, valor: parseFloat(form.valor), tipo: form.tipo,
        categoria_id: form.categoria_id || null, conta_id: form.conta_id || null,
        data_vencimento: form.data_vencimento,
        data_pagamento: form.data_pagamento || (form.status === 'pago' ? new Date().toISOString().slice(0,10) : null),
        status: form.status, numero_documento: form.numero_documento || null,
        observacao: form.observacao || null,
      }
      editId ? await lancamentosFinService.update(editId, payload) : await lancamentosFinService.create(payload)
      toast.success(editId ? 'Atualizado!' : 'Criado!')
      setOpen(false); load()
    } catch (err) { toast.error(err.message) }
    setSaving(false)
  }

  async function marcarPago(id) {
    try { await lancamentosFinService.marcarPago(id); toast.success('Marcado como pago ✅'); load() }
    catch (err) { toast.error(err.message) }
  }

  async function excluir(id) {
    if (!confirm('Excluir este lançamento?')) return
    try { await lancamentosFinService.remove(id); toast.success('Excluído'); load() }
    catch (err) { toast.error(err.message) }
  }

  function filtrar() { load(filtros) }
  function limpar() {
    const f = { tipo: '', status: '', conta_id: '', inicio: '', fim: '' }
    setFiltros(f); load(f)
  }

  const hoje = new Date().toISOString().slice(0, 10)
  const catsFiltradas = categorias.filter(c => !form.tipo || c.tipo === form.tipo)
  const saldo = totais.receitas - totais.despesas

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lançamentos Financeiros</h1>
          <p className="text-gray-500 text-sm mt-1">Controle de receitas e despesas</p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Button variant="outline" className="text-green-700 border-green-200 hover:bg-green-50" onClick={() => abrir('receita')}>
              <ArrowUpCircle className="w-4 h-4" /> Receita
            </Button>
            <Button variant="outline" className="text-red-700 border-red-200 hover:bg-red-50" onClick={() => abrir('despesa')}>
              <ArrowDownCircle className="w-4 h-4" /> Despesa
            </Button>
          </div>
        )}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Receitas',   value: totais.receitas, Icon: ArrowUpCircle,   color: 'border-l-green-500 text-green-700' },
          { label: 'Despesas',   value: totais.despesas, Icon: ArrowDownCircle, color: 'border-l-red-500 text-red-700' },
          { label: 'A Receber',  value: totais.aReceber, Icon: Clock,           color: 'border-l-blue-500 text-blue-700' },
          { label: 'A Pagar',    value: totais.aPagar,   Icon: AlertCircle,     color: 'border-l-amber-500 text-amber-700' },
          { label: 'Saldo',      value: saldo,            Icon: ArrowUpCircle,   color: `border-l-4 ${saldo >= 0 ? 'border-l-green-500 text-green-700' : 'border-l-red-500 text-red-700'}` },
        ].map(({ label, value, Icon, color }) => (
          <Card key={label} className={`border-l-4 ${color}`}>
            <CardContent className="p-3 flex items-center gap-2">
              <Icon className="w-5 h-5 flex-shrink-0" />
              <div><p className="text-xs text-gray-500">{label}</p><p className="font-bold text-sm">{fmt(value)}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          {[
            { label: 'Tipo', el: (
              <select className="select-field" value={filtros.tipo} onChange={e => setFiltros(f => ({...f, tipo: e.target.value}))}>
                <option value="">Todos</option><option value="receita">Receitas</option><option value="despesa">Despesas</option>
              </select>
            )},
            { label: 'Status', el: (
              <select className="select-field" value={filtros.status} onChange={e => setFiltros(f => ({...f, status: e.target.value}))}>
                <option value="">Todos</option><option value="pendente">Pendente</option><option value="pago">Pago</option><option value="cancelado">Cancelado</option>
              </select>
            )},
            { label: 'Conta', el: (
              <select className="select-field" value={filtros.conta_id} onChange={e => setFiltros(f => ({...f, conta_id: e.target.value}))}>
                <option value="">Todas</option>{contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            )},
            { label: 'De',   el: <Input type="date" className="w-36" value={filtros.inicio} onChange={e => setFiltros(f => ({...f, inicio: e.target.value}))} /> },
            { label: 'Até',  el: <Input type="date" className="w-36" value={filtros.fim}    onChange={e => setFiltros(f => ({...f, fim: e.target.value}))} /> },
          ].map(({ label, el }) => (
            <div key={label}><label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>{el}</div>
          ))}
          <div className="flex gap-2"><Button size="sm" onClick={filtrar}>Filtrar</Button><Button size="sm" variant="outline" onClick={limpar}>Limpar</Button></div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Carregando...</div>
          ) : lancamentos.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <ArrowUpCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p>Nenhum lançamento encontrado</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Descrição','Categoria','Conta','Valor','Vencimento','Status',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lancamentos.map(l => {
                  const vencido = l.status === 'pendente' && l.data_vencimento < hoje
                  const cat = l.financeiro_categorias
                  const isReceita = l.tipo === 'receita'
                  return (
                    <tr key={l.id} className={`hover:bg-gray-50 transition-colors ${vencido ? 'bg-red-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-base ${isReceita ? 'text-green-500' : 'text-red-500'}`}>{isReceita ? '↑' : '↓'}</span>
                          <div>
                            <p className="font-medium text-gray-900">{l.descricao}</p>
                            {l.numero_documento && <p className="text-xs text-gray-400">#{l.numero_documento}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {cat ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: cat.cor + '20', color: cat.cor }}>
                            {cat.icone} {cat.nome}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{l.financeiro_contas?.nome || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${isReceita ? 'text-green-700' : 'text-red-700'}`}>{fmt(l.valor)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-700">{fmtDate(l.data_vencimento)}</div>
                        {vencido && <span className="text-xs text-red-600 font-semibold">Vencido</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={l.status === 'pago' ? 'default' : l.status === 'pendente' ? 'secondary' : 'outline'} className={
                          l.status === 'pago' ? 'bg-green-100 text-green-700 border-0' :
                          l.status === 'pendente' ? 'bg-amber-100 text-amber-700 border-0' : ''
                        }>
                          {l.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {canEdit && l.status === 'pendente' && (
                            <button onClick={() => marcarPago(l.id)} className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors" title="Marcar pago">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canEdit && (
                            <button onClick={() => abrir(l.tipo, l)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => excluir(l.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4 mt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>Descrição *</Label>
                <Input className="mt-1" placeholder="Ex: Pagamento cimento" value={form.descricao} onChange={e => setForm(f => ({...f, descricao: e.target.value}))} required />
              </div>
              <div>
                <Label>Tipo</Label>
                <select className="select-field mt-1 w-full" value={form.tipo} onChange={e => setForm(f => ({...f, tipo: e.target.value, categoria_id: ''}))}>
                  <option value="despesa">Despesa</option><option value="receita">Receita</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div><Label>Valor (R$) *</Label><Input className="mt-1" type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm(f => ({...f, valor: e.target.value}))} required /></div>
              <div><Label>Vencimento *</Label><Input className="mt-1" type="date" value={form.data_vencimento} onChange={e => setForm(f => ({...f, data_vencimento: e.target.value}))} required /></div>
              <div><Label>Pagamento</Label><Input className="mt-1" type="date" value={form.data_pagamento} onChange={e => setForm(f => ({...f, data_pagamento: e.target.value}))} /></div>
              <div>
                <Label>Status</Label>
                <select className="select-field mt-1 w-full" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                  <option value="pendente">Pendente</option><option value="pago">Pago</option><option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Categoria</Label>
                <select className="select-field mt-1 w-full" value={form.categoria_id} onChange={e => setForm(f => ({...f, categoria_id: e.target.value}))}>
                  <option value="">Sem categoria</option>
                  {catsFiltradas.map(c => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
                </select>
              </div>
              <div>
                <Label>Conta</Label>
                <select className="select-field mt-1 w-full" value={form.conta_id} onChange={e => setForm(f => ({...f, conta_id: e.target.value}))}>
                  <option value="">Selecione</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div><Label>Nº Documento</Label><Input className="mt-1" placeholder="NF, Boleto..." value={form.numero_documento} onChange={e => setForm(f => ({...f, numero_documento: e.target.value}))} /></div>
            </div>
            <div><Label>Observação</Label><Input className="mt-1" value={form.observacao} onChange={e => setForm(f => ({...f, observacao: e.target.value}))} /></div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
