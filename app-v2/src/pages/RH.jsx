import React, { useState } from 'react'
import DashboardRH from './rh/DashboardRH'
import RequisicoesVagas from './rh/RequisicoesVagas'
import Desligamentos from './rh/Desligamentos'
import FuncionariosRH from './rh/FuncionariosRH'

function RH() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const tabs = [
    { key: 'dashboard',    label: 'Painel RH' },
    { key: 'funcionarios', label: 'Colaboradores' },
    { key: 'requisicoes',  label: 'Requisições' },
    { key: 'desligamentos',label: 'Desligamentos' },
  ]

  const C = { navy: '#17273C', amber: '#E8A628', ink: '#1C2330', ink3: '#7F8A99', line: '#DDD6C7', surface2: '#F6F3ED' }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '24px 28px', background: C.surface2, minHeight: '100vh' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${C.line}`, marginBottom: 22 }}>
        {tabs.map(t => {
          const on = t.key === activeTab
          return (
            <button key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{ background: 'none', border: 'none', padding: '10px 18px', fontSize: 13, fontWeight: on ? 700 : 500, color: on ? C.ink : C.ink3, borderBottom: on ? `2px solid ${C.navy}` : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit', transition: 'color 0.15s' }}>
              {t.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'dashboard'    && <DashboardRH />}
      {activeTab === 'funcionarios' && <FuncionariosRH />}
      {activeTab === 'requisicoes'  && <RequisicoesVagas />}
      {activeTab === 'desligamentos'&& <Desligamentos />}
    </div>
  )
}

export default RH
