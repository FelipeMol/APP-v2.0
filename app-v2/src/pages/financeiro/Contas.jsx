import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Wallet, PiggyBank, BarChart2, TrendingUp, TrendingDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { contasService } from '@/services/financeiroService'
import useAuthStore from '@/store/authStore'

const TIPO_CONFIG = {
  corrente:     { label: 'Conta Corrente', Icon: Wallet,    color: 'text-blue-500',   bg: 'bg-blue-50' },
  poupanca:     { label: 'Poupança',        Icon: PiggyBank, color: 'text-green-500',  bg: 'bg-green-50' },
  investimento: { label: 'Investimento',    Icon: BarChart2, color: 'text-purple-500', bg: 'bg-purple-50' },
  caixa:        { label: 'Caixa',           Icon: Wallet,    color: 'text-amber-500',  bg: 'bg-amber-50' },
}

const EMPTY = { nome: '', banco: '', agencia: '', conta: '', tipo: 'corrente', saldo_inicial: '0' }

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

export default function Contas() {
  const { isAdmin, hasPermission } = useAuthStore()
  const canCreate = isAdmin() || hasPermission('financeiro', 'criar')
  const canEdit   = isAdmin() || hasPermission('financeiro', 'editar')
  const canDelete = isAdmin() || hasPermission('financeiro', 'excluir')

  const [contas, setContas]       = useState([])
  const [saldos, setSaldos]       = useState({})
  const [loading, setLoading]     = useState(true)
  const [open, setOpen]           = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [editId, setEditId]       = useState(null)
  const [saving, setSaving]       = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await contasService.list()
      setContas(data)
      if (data.length) {
        const map = await contasService.saldos(data.map(c => c.id))
        const comInicial = {}
        data.forEach(c => { comInicial[c.id] = (map[c.id] || 0) + parseFloat(c.saldo_inicial || 0) })
        setSaldos(comInicial)
      }
    } catch { toast.error('Erro ao carregar contas') }
    setLoading(false)
  }

  function abrir(conta = null) {
    if (conta) {
      setForm({ nome: conta.nome, banco: conta.banco || '', agencia: conta.agencia || '',
        conta: conta.conta || '', tipo: conta.tipo, saldo_inicial: String(conta.saldo_inicial ?? 0) })
      setEditId(conta.id)
    } else {
      setForm(EMPTY); setEditId(null)
    }
    setOpen(true)
  }

  async function salvar(e) {
    e.preventDefault()
    if (!form.nome.trim()) { toast.error('Nome obrigatório'); return }
    setSaving(true)
    try {
      const payload = { ...form, saldo_inicial: parseFloat(form.saldo_inicial) || 0 }
      editId ? await contasService.update(editId, payload) : await contasService.create(payload)
      toast.success(editId ? 'Conta atualizada!' : 'Conta criada!')
      setOpen(false); load()
    } catch (err) { toast.error(err.message) }
    setSaving(false)
  }

  async function excluir(id) {
    if (!confirm('Excluir esta conta?')) return
    try { await contasService.remove(id); toast.success('Conta removida'); load() }
    catch (err) { toast.error(err.message) }
  }

  const totalSaldo = Object.values(saldos).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas Bancárias</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie suas contas e acompanhe os saldos</p>
        </div>
        {canCreate && (
          <Button onClick={() => abrir()}>
            <Plus className="w-4 h-4" /> Nova Conta
          </Button>
        )}
      </div>

      {/* Saldo total */}
      <Card className={`text-white ${totalSaldo >= 0 ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-red-600 to-red-500'}`}>
        <CardContent className="p-5">
          <p className="text-blue-100 text-sm font-medium">Saldo Total em Caixa</p>
          <p className="text-3xl font-bold mt-1">{fmt(totalSaldo)}</p>
          <p className="text-blue-100 text-xs mt-2">{contas.length} conta{contas.length !== 1 ? 's' : ''} ativa{contas.length !== 1 ? 's' : ''}</p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : contas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Nenhuma conta cadastrada</p>
            {canCreate && <Button variant="outline" className="mt-4" onClick={() => abrir()}>Adicionar primeira conta</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contas.map(conta => {
            const cfg = TIPO_CONFIG[conta.tipo] || TIPO_CONFIG.corrente
            const { Icon } = cfg
            const saldo = saldos[conta.id] ?? 0
            return (
              <Card key={conta.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 leading-tight">{conta.nome}</p>
                        <p className="text-xs text-gray-400">{cfg.label}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {canEdit && (
                        <button onClick={() => abrir(conta)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => excluir(conta.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {conta.banco && (
                    <p className="text-xs text-gray-400 mb-3">
                      {conta.banco}{conta.agencia ? ` · Ag. ${conta.agencia}` : ''}{conta.conta ? ` · Cc. ${conta.conta}` : ''}
                    </p>
                  )}
                  <div className={`rounded-lg p-3 text-center ${saldo >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className="text-xs text-gray-500 mb-1">Saldo atual</p>
                    <div className="flex items-center justify-center gap-1.5">
                      {saldo >= 0
                        ? <TrendingUp className="w-4 h-4 text-green-600" />
                        : <TrendingDown className="w-4 h-4 text-red-600" />}
                      <span className={`text-xl font-bold ${saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(saldo)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={salvar} className="space-y-4 mt-2">
            <div>
              <Label>Nome *</Label>
              <Input className="mt-1" placeholder="Ex: Bradesco Corrente" value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <select className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.tipo} onChange={e => setForm(f => ({...f, tipo: e.target.value}))}>
                  <option value="corrente">Conta Corrente</option>
                  <option value="poupanca">Poupança</option>
                  <option value="investimento">Investimento</option>
                  <option value="caixa">Caixa</option>
                </select>
              </div>
              <div>
                <Label>Saldo Inicial (R$)</Label>
                <Input className="mt-1" type="number" step="0.01" value={form.saldo_inicial} onChange={e => setForm(f => ({...f, saldo_inicial: e.target.value}))} />
              </div>
            </div>
            <div>
              <Label>Banco</Label>
              <Input className="mt-1" placeholder="Ex: Bradesco" value={form.banco} onChange={e => setForm(f => ({...f, banco: e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Agência</Label>
                <Input className="mt-1" placeholder="0000-0" value={form.agencia} onChange={e => setForm(f => ({...f, agencia: e.target.value}))} />
              </div>
              <div>
                <Label>Nº Conta</Label>
                <Input className="mt-1" placeholder="00000-0" value={form.conta} onChange={e => setForm(f => ({...f, conta: e.target.value}))} />
              </div>
            </div>
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
