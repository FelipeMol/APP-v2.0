import React, { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { Card } from '../components/ui/card'
import DashboardRH from './rh/DashboardRH'
import RequisicoesVagas from './rh/RequisicoesVagas'
import Candidatos from './rh/Candidatos'
import Admissoes from './rh/Admissoes'
import Experiencias from './rh/Experiencias'
import Documentos from './rh/Documentos'
import Desligamentos from './rh/Desligamentos'
import FuncionariosRH from './rh/FuncionariosRH'

function RH() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Recursos Humanos</h1>
        <p className="text-gray-600 mt-2">
          Gestão completa de RH: vagas, candidatos, admissões, experiências e gestão de colaboradores
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="funcionarios">Funcionários</TabsTrigger>
          <TabsTrigger value="requisicoes">Requisições</TabsTrigger>
          <TabsTrigger value="candidatos">Candidatos</TabsTrigger>
          <TabsTrigger value="admissoes">Admissões</TabsTrigger>
          <TabsTrigger value="experiencias">Experiências</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="desligamentos">Desligamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardRH />
        </TabsContent>

        <TabsContent value="funcionarios">
          <FuncionariosRH />
        </TabsContent>

        <TabsContent value="requisicoes">
          <RequisicoesVagas />
        </TabsContent>

        <TabsContent value="candidatos">
          <Candidatos />
        </TabsContent>

        <TabsContent value="admissoes">
          <Admissoes />
        </TabsContent>

        <TabsContent value="experiencias">
          <Experiencias />
        </TabsContent>

        <TabsContent value="documentos">
          <Documentos />
        </TabsContent>

        <TabsContent value="desligamentos">
          <Desligamentos />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default RH
