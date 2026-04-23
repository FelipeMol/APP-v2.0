import React, { useState, useEffect } from 'react'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import rhService from '../../services/rhService'

function DashboardRH() {
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState(null)
  const [experienciasVencendo, setExperienciasVencendo] = useState([])
  const [admisoesRecentes, setAdmisoesRecentes] = useState([])
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    carregarDashboard()
  }, [])

  const carregarDashboard = async () => {
    try {
      setLoading(true)
      setErrorMsg('')
      const data = await rhService.getDashboard()
      setDashboard(data.dashboard)
      setExperienciasVencendo(data.experiencias_vencendo || [])
      setAdmisoesRecentes(data.admissoes_recentes || [])
    } catch (error) {
      const status = error?.status || error?.response?.status
      if (status === 401) {
        setErrorMsg('Você não está autorizado a ver o Dashboard do RH. Faça login novamente ou solicite permissão.')
      } else {
        setErrorMsg('Não foi possível carregar o Dashboard do RH no momento.')
      }
      console.error('Erro ao carregar dashboard:', error)
      setDashboard(null)
      setExperienciasVencendo([])
      setAdmisoesRecentes([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando dashboard...</div>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <Card className="p-6 border-border/60">
        <div className="text-lg font-semibold">Dashboard</div>
        <div className="mt-2 text-sm text-muted-foreground">{errorMsg}</div>
        <div className="mt-4">
          <button
            className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-muted/30"
            onClick={carregarDashboard}
            type="button"
          >
            Tentar novamente
          </button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Funcionários Ativos</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">
                {dashboard?.total_funcionarios_ativos || 0}
              </h3>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Vagas Abertas</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">
                {dashboard?.vagas_abertas || 0}
              </h3>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Candidatos em Análise</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">
                {dashboard?.candidatos_em_analise || 0}
              </h3>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Experiências Vencendo</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">
                {dashboard?.experiencias_vencendo || 0}
              </h3>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Estatísticas Mensais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Este Mês</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Admissões</span>
              <Badge variant="success">{dashboard?.admissoes_mes_atual || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Desligamentos</span>
              <Badge variant="danger">{dashboard?.desligamentos_mes_atual || 0}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Admissões em Andamento</span>
              <Badge variant="warning">{dashboard?.admissoes_em_andamento || 0}</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Saldo do Mês</h3>
          <div className="flex items-center justify-center h-24">
            <div className="text-center">
              <p className="text-sm text-gray-600">Variação de Funcionários</p>
              <p className={`text-4xl font-bold mt-2 ${
                (dashboard?.admissoes_mes_atual || 0) - (dashboard?.desligamentos_mes_atual || 0) >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {((dashboard?.admissoes_mes_atual || 0) - (dashboard?.desligamentos_mes_atual || 0)) > 0 ? '+' : ''}
                {(dashboard?.admissoes_mes_atual || 0) - (dashboard?.desligamentos_mes_atual || 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Experiências Vencendo - Alertas */}
      {experienciasVencendo.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Experiências Vencendo (Próximos 10 dias)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Funcionário</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Função</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Obra</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Vencimento</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Dias Restantes</th>
                </tr>
              </thead>
              <tbody>
                {experienciasVencendo.map((exp) => (
                  <tr key={exp.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{exp.funcionario_nome}</td>
                    <td className="py-3 px-4">{exp.funcao_nome}</td>
                    <td className="py-3 px-4">{exp.obra_nome}</td>
                    <td className="py-3 px-4">
                      {new Date(exp.data_fim).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={exp.dias_restantes <= 3 ? 'danger' : 'warning'}>
                        {exp.dias_restantes} {exp.dias_restantes === 1 ? 'dia' : 'dias'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Admissões Recentes */}
      {admisoesRecentes.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Admissões Recentes (Últimos 30 dias)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Candidato</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Função</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Obra</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Data Admissão</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {admisoesRecentes.map((adm) => (
                  <tr key={adm.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{adm.candidato_nome}</td>
                    <td className="py-3 px-4">{adm.funcao_nome}</td>
                    <td className="py-3 px-4">{adm.obra_nome}</td>
                    <td className="py-3 px-4">
                      {new Date(adm.data_admissao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={
                        adm.status === 'concluido' ? 'success' :
                        adm.status === 'em_andamento' ? 'warning' : 'secondary'
                      }>
                        {adm.status === 'concluido' ? 'Concluído' :
                         adm.status === 'em_andamento' ? 'Em Andamento' : 'Pendente'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

export default DashboardRH
