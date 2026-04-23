import React, { useState, useEffect } from 'react'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import rhService from '../../services/rhService'

function Experiencias() {
  const [experiencias, setExperiencias] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarExperiencias()
  }, [])

  const carregarExperiencias = async () => {
    try {
      setLoading(true)
      const data = await rhService.listarExperiencias({ status: 'pendente' })
      setExperiencias(data)
    } catch (error) {
      console.error('Erro ao carregar experiências:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDiasRestantesColor = (dias) => {
    if (dias <= 3) return 'text-red-600'
    if (dias <= 7) return 'text-yellow-600'
    return 'text-green-600'
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Carregando experiências...</div>
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Períodos de Experiência Ativos</h3>

        {experiencias.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhum período de experiência ativo
          </div>
        ) : (
          <div className="space-y-4">
            {experiencias.map((exp) => (
              <Card key={exp.id} className="p-4 border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold">{exp.funcionario_nome}</h4>
                    <p className="text-sm text-gray-600">{exp.funcao_nome} - {exp.obra_nome}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span>Início: {new Date(exp.data_inicio).toLocaleDateString('pt-BR')}</span>
                      <span>Fim: {new Date(exp.data_fim).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${getDiasRestantesColor(exp.dias_restantes)}`}>
                      {exp.dias_restantes}
                    </p>
                    <p className="text-sm text-gray-600">dias restantes</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Button size="sm" variant="outline">
                    Ver Histórico
                  </Button>
                  <Button size="sm">
                    Avaliar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

export default Experiencias
