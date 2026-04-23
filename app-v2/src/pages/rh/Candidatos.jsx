import React, { useState, useEffect } from 'react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import rhService from '../../services/rhService'

function Candidatos() {
  const [candidatos, setCandidatos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('')

  useEffect(() => {
    carregarCandidatos()
  }, [filtroStatus])

  const carregarCandidatos = async () => {
    try {
      setLoading(true)
      const data = await rhService.listarCandidatos({ status: filtroStatus })
      setCandidatos(data)
    } catch (error) {
      console.error('Erro ao carregar candidatos:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      cadastrado: { variant: 'secondary', label: 'Cadastrado' },
      em_analise: { variant: 'info', label: 'Em Análise' },
      entrevista_agendada: { variant: 'warning', label: 'Entrevista Agendada' },
      aprovado: { variant: 'success', label: 'Aprovado' },
      reprovado: { variant: 'danger', label: 'Reprovado' },
      contratado: { variant: 'success', label: 'Contratado' }
    }
    const config = statusConfig[status] || { variant: 'secondary', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Carregando candidatos...</div>
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
            Todos
          </Button>
          <Button
            variant={filtroStatus === 'em_analise' ? 'default' : 'outline'}
            onClick={() => setFiltroStatus('em_analise')}
            size="sm"
          >
            Em Análise
          </Button>
          <Button
            variant={filtroStatus === 'aprovado' ? 'default' : 'outline'}
            onClick={() => setFiltroStatus('aprovado')}
            size="sm"
          >
            Aprovados
          </Button>
        </div>

        <Button>Novo Candidato</Button>
      </div>

      <Card className="p-6">
        {candidatos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhum candidato encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Nome</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">CPF</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Telefone</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Função Pretendida</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {candidatos.map((cand) => (
                  <tr key={cand.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{cand.nome}</td>
                    <td className="py-3 px-4">{cand.cpf || '-'}</td>
                    <td className="py-3 px-4">{cand.telefone || '-'}</td>
                    <td className="py-3 px-4">{cand.funcao_nome || '-'}</td>
                    <td className="py-3 px-4">{getStatusBadge(cand.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">Ver</Button>
                        <Button size="sm" variant="outline">Agendar Entrevista</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default Candidatos
