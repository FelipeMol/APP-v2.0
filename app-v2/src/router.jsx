import { createHashRouter, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import TenantGate from './components/tenant/TenantGate';
import Login from './pages/Login';
import SelecionarEmpresa from './pages/SelecionarEmpresa';
import Dashboard from './pages/Dashboard';
import Empresas from './pages/Empresas';
import Funcionarios from './pages/Funcionarios';
import Obras from './pages/Obras';
import Funcoes from './pages/Funcoes';
import Permissoes from './pages/Permissoes';
import Usuarios from './pages/Usuarios';
import Lancamentos from './pages/Lancamentos';
import RH from './pages/RH';
import Relatorios from './pages/Relatorios';
import RelatoriosVisaoGeral from './pages/RelatoriosVisaoGeral';
import RelatorioMensal from './pages/RelatorioMensal';
import RelatorioEquipePDF from './pages/RelatorioEquipePDF';
import Tarefas from './pages/Tarefas';
import Perfil from './pages/Perfil';
import Contas from './pages/financeiro/Contas';
import LancamentosFinanceiros from './pages/financeiro/Lancamentos';
import Extrato from './pages/financeiro/Extrato';
import PainelFinanceiro from './pages/financeiro/Painel';
import ModuleGuard from './components/tenant/ModuleGuard';
import SuperAdminRoute from './components/auth/SuperAdminRoute';
import SuperAdmin from './pages/super-admin/SuperAdmin';
import Configuracoes from './pages/financeiro/Configuracoes';
import PrevistoRealizado from './pages/financeiro/PrevistoRealizado';
import ImportarCSV from './pages/financeiro/ImportarCSV';
import ContatosCadastros from './pages/cadastros/Contatos';
import CategoriasFinanceiro from './pages/cadastros/CategoriasFinanceiro';
import ImportarCategorias from './pages/cadastros/ImportarCategorias';
import AICopilot from './pages/AICopilot';

// Usando HashRouter para compatibilidade com hospedagem compartilhada
// URLs ficam: /#/dashboard, /#/login, etc.
const router = createHashRouter([
  // Rota pública: Login
  {
    path: '/login',
    element: <Login />,
  },

  // Rota protegida: Selecionar Empresa (sempre obrigatório após login)
  {
    path: '/selecionar-empresa',
    element: (
      <ProtectedRoute>
        <SelecionarEmpresa />
      </ProtectedRoute>
    ),
  },

  // Rotas protegidas: Layout + páginas
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <TenantGate>
          <Layout />
        </TenantGate>
      </ProtectedRoute>
    ),
    children: [
      // Redirect raiz para dashboard
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },

      // Dashboard
      {
        path: 'dashboard',
        element: <Dashboard />,
      },

      // Lançamentos
      {
        path: 'lancamentos',
        element: <Lancamentos />,
      },
      {
        path: 'funcionarios',
        element: <Funcionarios />,
      },
      {
        path: 'obras',
        element: <Obras />,
      },
      {
        path: 'empresas',
        element: <Empresas />,
      },
      {
        path: 'funcoes',
        element: <Funcoes />,
      },
      {
        path: 'rh',
        element: (
          <ModuleGuard moduleId="rh">
            <RH />
          </ModuleGuard>
        ),
      },
      {
        path: 'base',
        element: (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">BASE</h2>
            <p className="text-gray-600 mt-2">Em desenvolvimento - Semana 7</p>
          </div>
        ),
      },
      {
        path: 'tarefas',
        element: <Tarefas />,
      },

      // NOVA HOME DE RELATÓRIOS (UX/CEO) — não mexe no Relatórios atual
      {
        path: 'relatorios-visao-geral',
        element: <RelatoriosVisaoGeral />,
      },

      // Relatórios (existente)
      {
        path: 'relatorios',
        element: <Relatorios />,
      },

      // Relatórios Mensais por Obra
      {
        path: 'relatorios/obra/:obraId/mensal',
        element: <RelatorioMensal />,
      },

      // Relatório de Equipe em PDF (nova página)
      {
        path: 'relatorios/equipe-pdf',
        element: <RelatorioEquipePDF />,
      },
      {
        path: 'usuarios',
        element: (
          <AdminRoute>
            <Usuarios />
          </AdminRoute>
        ),
      },
      {
        path: 'permissoes',
        element: (
          <AdminRoute>
            <Permissoes />
          </AdminRoute>
        ),
      },
      {
        path: 'perfil',
        element: <Perfil />,
      },

      // Financeiro
      {
        path: 'financeiro/painel',
        element: (
          <ModuleGuard moduleId="financeiro">
            <PainelFinanceiro />
          </ModuleGuard>
        ),
      },
      {
        path: 'financeiro/contas',
        element: (
          <ModuleGuard moduleId="financeiro">
            <Contas />
          </ModuleGuard>
        ),
      },
      {
        path: 'financeiro/lancamentos',
        element: (
          <ModuleGuard moduleId="financeiro">
            <LancamentosFinanceiros />
          </ModuleGuard>
        ),
      },
      {
        path: 'financeiro/extrato',
        element: (
          <ModuleGuard moduleId="financeiro">
            <Extrato />
          </ModuleGuard>
        ),
      },
      {
        path: 'financeiro/configuracoes',
        element: (
          <ModuleGuard moduleId="financeiro">
            <Configuracoes />
          </ModuleGuard>
        ),
      },
      {
        path: 'financeiro/previsto-realizado',
        element: (
          <ModuleGuard moduleId="financeiro">
            <PrevistoRealizado />
          </ModuleGuard>
        ),
      },
      {
        path: 'financeiro/importar-csv',
        element: (
          <ModuleGuard moduleId="financeiro">
            <ImportarCSV />
          </ModuleGuard>
        ),
      },
      {
        path: 'cadastros/contatos',
        element: <ContatosCadastros />,
      },
      {
        path: 'cadastros/financeiro',
        element: <CategoriasFinanceiro />,
      },
      {
        path: 'cadastros/importar-categorias',
        element: <ImportarCategorias />,
      },

      // IA Copilot
      {
        path: 'ai-copilot',
        element: <AICopilot />,
      },
    ],
  },

  // Rota super-admin (protegida por email)
  {
    path: '/super-admin',
    element: (
      <ProtectedRoute>
        <SuperAdminRoute>
          <SuperAdmin />
        </SuperAdminRoute>
      </ProtectedRoute>
    ),
  },

  // Rota 404 - redireciona para dashboard
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

export default router;
