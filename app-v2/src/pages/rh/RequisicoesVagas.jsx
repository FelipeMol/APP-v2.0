import React, { useState, useEffect } from 'react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import rhService from '../../services/rhService'

function RequisicoesVagas() {
  const [requisicoes, setRequisicoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [obras, setObras] = useState([])
  const [funcoes, setFuncoes] = useState([])

  const [formData, setFormData] = useState({
    obra_id: '',
    funcao_id: '',
    quantidade: 1,
    justificativa: '',
    urgencia: 'media',
    data_limite: '',
    observacoes: ''
  })

  useEffect(() => {
    carregarDados()
  }, [filtroStatus])

  const carregarDados = async () => {
    try {
      setLoading(true)
      const data = await rhService.listarRequisicoes({ status: filtroStatus })
      setRequisicoes(data)
      // Carregar obras e funções para o formulário
      await carregarObrasEFuncoes()
    } catch (error) {
      console.error('Erro ao carregar requisições:', error)
    } finally {
      setLoading(false)
    }
  }

  const carregarObrasEFuncoes = async () => {
    // Simulação - em produção, buscar da API
    setObras([
      { id: 1, nome: 'Obra Centro' },
      { id: 2, nome: 'Obra Bairro Norte' }
    ])
    setFuncoes([
      { id: 1, nome: 'Pedreiro' },
      { id: 2, nome: 'Servente' },
      { id: 3, nome: 'Encarregado' }
    ])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await rhService.criarRequisicao(formData)
      setModalAberto(false)
      resetForm()
      carregarDados()
      alert('Requisição criada com sucesso!')
    } catch (error) {
      console.error('Erro ao criar requisição:', error)
      alert('Erro ao criar requisição')
    }
  }

  const handleAprovar = async (id, nivel) => {
    try {
      await rhService.aprovarRequisicao(id, nivel)
      carregarDados()
      alert('Requisição aprovada com sucesso!')
    } catch (error) {
      console.error('Erro ao aprovar requisição:', error)
      alert('Erro ao aprovar requisição')
    }
  }

  const handleAtualizarStatus = async (id, novoStatus) => {
    try {
      await rhService.atualizarStatusRequisicao(id, novoStatus, '')
      carregarDados()
      alert('Status atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status')
    }
  }

  const resetForm = () => {
    setFormData({
      obra_id: '',
      funcao_id: '',
      quantidade: 1,
      justificativa: '',
      urgencia: 'media',
      data_limite: '',
      observacoes: ''
    })
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      aberta: { variant: 'info', label: 'Aberta' },
      em_selecao: { variant: 'warning', label: 'Em Seleção' },
      contratada: { variant: 'success', label: 'Contratada' },
      cancelada: { variant: 'danger', label: 'Cancelada' }
    }
    const config = statusConfig[status] || { variant: 'secondary', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getUrgenciaBadge = (urgencia) => {
    const urgenciaConfig = {
      baixa: { variant: 'secondary', label: 'Baixa' },
      media: { variant: 'info', label: 'Média' },
      alta: { variant: 'warning', label: 'Alta' },
      critica: { variant: 'danger', label: 'Crítica' }
    }
    const config = urgenciaConfig[urgencia] || { variant: 'secondary', label: urgencia }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando requisições...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header com ações */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant={filtroStatus === '' ? 'default' : 'outline'}
            onClick={() => setFiltroStatus('')}
            size="sm"
          >
            Todas
          </Button>
          <Button
            variant={filtroStatus === 'aberta' ? 'default' : 'outline'}
            onClick={() => setFiltroStatus('aberta')}
            size="sm"
          >
            Abertas
          </Button>
          <Button
            variant={filtroStatus === 'em_selecao' ? 'default' : 'outline'}
            onClick={() => setFiltroStatus('em_selecao')}
            size="sm"
          >
            Em Seleção
          </Button>
          <Button
            variant={filtroStatus === 'contratada' ? 'default' : 'outline'}
            onClick={() => setFiltroStatus('contratada')}
            size="sm"
          >
            Contratadas
          </Button>
        </div>

        <Button onClick={() => setModalAberto(true)}>
          Nova Requisição
        </Button>
      </div>

      {/* Lista de requisições */}
      <Card className="p-6">
        {requisicoes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhuma requisição encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Obra</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Função</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Qtd</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Urgência</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Requisitante</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Data Abertura</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {requisicoes.map((req) => (
                  <tr key={req.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">#{req.id}</td>
                    <td className="py-3 px-4">{req.obra_nome}</td>
                    <td className="py-3 px-4">{req.funcao_nome}</td>
                    <td className="py-3 px-4">{req.quantidade}</td>
                    <td className="py-3 px-4">{getUrgenciaBadge(req.urgencia)}</td>
                    <td className="py-3 px-4">{getStatusBadge(req.status)}</td>
                    <td className="py-3 px-4">{req.requisitante_nome}</td>
                    <td className="py-3 px-4">
                      {new Date(req.data_abertura).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {req.status === 'aberta' && (
                          <>
                            {!req.aprovador_gestor_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAprovar(req.id, 'gestor')}
                              >
                                Aprovar (Gestor)
                              </Button>
                            )}
                            {req.aprovador_gestor_id && !req.aprovador_rh_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAprovar(req.id, 'rh')}
                              >
                                Aprovar (RH)
                              </Button>
                            )}
                            {req.aprovador_rh_id && !req.aprovador_diretoria_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAprovar(req.id, 'diretoria')}
                              >
                                Aprovar (Diretoria)
                              </Button>
                            )}
                            {req.aprovador_gestor_id && req.aprovador_rh_id && req.aprovador_diretoria_id && (
                              <Button
                                size="sm"
                                onClick={() => handleAtualizarStatus(req.id, 'em_selecao')}
                              >
                                Iniciar Seleção
                              </Button>
                            )}
                          </>
                        )}
                        {req.status === 'em_selecao' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAtualizarStatus(req.id, 'contratada')}
                          >
                            Marcar como Contratada
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de Nova Requisição */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Requisição de Vaga</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="obra_id">Obra *</Label>
                <select
                  id="obra_id"
                  className="w-full border rounded-md px-3 py-2"
                  value={formData.obra_id}
                  onChange={(e) => setFormData({ ...formData, obra_id: e.target.value })}
                  required
                >
                  <option value="">Selecione...</option>
                  {obras.map((obra) => (
                    <option key={obra.id} value={obra.id}>{obra.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="funcao_id">Função *</Label>
                <select
                  id="funcao_id"
                  className="w-full border rounded-md px-3 py-2"
                  value={formData.funcao_id}
                  onChange={(e) => setFormData({ ...formData, funcao_id: e.target.value })}
                  required
                >
                  <option value="">Selecione...</option>
                  {funcoes.map((funcao) => (
                    <option key={funcao.id} value={funcao.id}>{funcao.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  value={formData.quantidade}
                  onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="urgencia">Urgência *</Label>
                <select
                  id="urgencia"
                  className="w-full border rounded-md px-3 py-2"
                  value={formData.urgencia}
                  onChange={(e) => setFormData({ ...formData, urgencia: e.target.value })}
                  required
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Crítica</option>
                </select>
              </div>

              <div>
                <Label htmlFor="data_limite">Data Limite</Label>
                <Input
                  id="data_limite"
                  type="date"
                  value={formData.data_limite}
                  onChange={(e) => setFormData({ ...formData, data_limite: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="justificativa">Justificativa *</Label>
              <textarea
                id="justificativa"
                className="w-full border rounded-md px-3 py-2"
                rows="3"
                value={formData.justificativa}
                onChange={(e) => setFormData({ ...formData, justificativa: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                className="w-full border rounded-md px-3 py-2"
                rows="2"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Criar Requisição
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RequisicoesVagas
