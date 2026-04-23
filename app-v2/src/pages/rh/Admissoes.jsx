import React, { useState, useEffect } from 'react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import rhService from '../../services/rhService'

function Admissoes() {
  const [admissoes, setAdmissoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('')

  useEffect(() => {
    carregarAdmissoes()
  }, [filtroStatus])

  const carregarAdmissoes = async () => {
    try {
      setLoading(true)
      const data = await rhService.listarAdmissoes(filtroStatus)
      setAdmissoes(data)
    } catch (error) {
      console.error('Erro ao carregar admissões:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      pendente: { variant: 'secondary', label: 'Pendente' },
      em_andamento: { variant: 'warning', label: 'Em Andamento' },
      concluido: { variant: 'success', label: 'Concluído' },
      cancelado: { variant: 'danger', label: 'Cancelado' }
    }
    const config = statusConfig[status] || { variant: 'secondary', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const calcularProgresso = (adm) => {
    const itens = [
      adm.doc_rg, adm.doc_cpf, adm.doc_ctps,
      adm.exame_admissional, adm.contrato_assinado,
      adm.epi_entregue, adm.uniforme_entregue,
      adm.treinamento_integracao, adm.cracha_entregue
    ]
    const concluidos = itens.filter(Boolean).length
    return Math.round((concluidos / itens.length) * 100)
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Carregando admissões...</div>
  }

  return (
    <div className="space-y-4">
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
            variant={filtroStatus === 'em_andamento' ? 'default' : 'outline'}
            onClick={() => setFiltroStatus('em_andamento')}
            size="sm"
          >
            Em Andamento
          </Button>
          <Button
            variant={filtroStatus === 'concluido' ? 'default' : 'outline'}
            onClick={() => setFiltroStatus('concluido')}
            size="sm"
          >
            Concluídas
          </Button>
        </div>

        <Button>Nova Admissão</Button>
      </div>

      <Card className="p-6">
        {admissoes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhuma admissão encontrada
          </div>
        ) : (
          <div className="grid gap-4">
            {admissoes.map((adm) => (
              <Card key={adm.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{adm.candidato_nome}</h3>
                    <p className="text-sm text-gray-600">{adm.funcao_nome} - {adm.obra_nome}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Admissão: {new Date(adm.data_admissao).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(adm.status)}
                    <p className="text-sm text-gray-600 mt-2">
                      Progresso: {calcularProgresso(adm)}%
                    </p>
                    <div className="w-32 h-2 bg-gray-200 rounded-full mt-1">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${calcularProgresso(adm)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Button size="sm" variant="outline">
                    Ver Checklist
                  </Button>
                  {adm.status === 'em_andamento' && calcularProgresso(adm) === 100 && (
                    <Button size="sm">
                      Finalizar Admissão
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default Admissoes
