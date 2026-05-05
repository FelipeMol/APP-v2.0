// RH — KPIs Diretoria (P8)
// Dashboard executivo: turnover, admissoes x desligamentos, headcount trend, tempo contratacao
import { useState, useEffect } from 'react'
import supabase from '../../lib/supabase.js'
import useTenantStore from '../../store/tenantStore.js'

const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  warn: '#B8862C', info: '#3D5A80',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}
const getTenantId = () => useTenantStore.getState().selectedTenantId || 'construtora'

function Sparkline({ data = [], color = C.navy, height = 28, width = 80 }) {
  if (!data.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function KPIBig({ label, value, delta, unit = '', color, trend, meta, metaOk }) {
  const dOk = delta !== undefined ? delta <= 0 : null
  const sColor = dOk === null ? C.ink3 : dOk ? C.ok : C.bad
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.ink3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 8 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: color || C.ink, fontFamily: 'Georgia, serif', lineHeight: 1 }}>{value}{unit}</div>
        {delta !== undefined && (
          <div style={{ fontSize: 12, fontWeight: 700, color: sColor, marginBottom: 4 }}>
            {delta > 0 ? '+' : ''}{delta}{unit}
          </div>
        )}
      </div>
      {trend && <Sparkline data={trend} color={color || C.navy} />}
      {meta && (
        <div style={{ marginTop: 7, fontSize: 11, color: metaOk ? C.ok : C.bad, fontWeight: 600 }}>
          {metaOk ? '✓' : '✗'} Meta: {meta}
        </div>
      )}
    </div>
  )
}

function GaugeBar({ label, value, max, color = C.navy }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12.5, color: C.ink, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12.5, color: C.ink3 }}>{value} / {max}</span>
      </div>
      <div style={{ height: 8, background: C.line2, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4 }} />
      </div>
    </div>
  )
}

export default function KPIsDiretoria() {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const tenantId = getTenantId()
        const [{ data: funcs }, { data: reqs }, { data: avs }] = await Promise.all([
          supabase.from('funcionarios').select('situacao, data_admissao, data_demissao, empresa, criado_em').eq('tenant_id', tenantId),
          supabase.from('requisicoes_vagas').select('status, created_at').eq('tenant_id', tenantId),
          supabase.from('avaliacoes').select('pontualidade, qualidade, trabalho_equipe, iniciativa, conhecimento_tecnico, capacidade_aprendizado').eq('tenant_id', tenantId),
        ])

        const todos = funcs || []
        const ativos = todos.filter(f => f.situacao === 'Ativo')
        const inativos = todos.filter(f => f.situacao === 'Inativo')

        // Headcount por empresa
        const headByEmpresa = {}
        ativos.forEach(f => {
          const e = f.empresa || '(sem empresa)'
          headByEmpresa[e] = (headByEmpresa[e] || 0) + 1
        })
        const headEmpresaList = Object.entries(headByEmpresa)
          .map(([k, v]) => ({ label: k, value: v }))
          .sort((a, b) => b.value - a.value)

        // Admissões por mês (últimos 6 meses)
        const agora = new Date()
        const meses = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        })
        const admPorMes = meses.map(m =>
          todos.filter(f => {
            if (!f.criado_em) return false
            const fm = f.criado_em.slice(0, 7)
            return fm === m
          }).length
        )
        const deslPorMes = meses.map(m =>
          inativos.filter(f => {
            if (!f.data_demissao) return false
            return f.data_demissao.slice(0, 7) === m
          }).length
        )

        // Nota média das avaliações
        const allAvs = avs || []
        let mediaGeral = 0
        if (allAvs.length > 0) {
          const soma = allAvs.reduce((s, a) => {
            const campos = ['pontualidade','qualidade','trabalho_equipe','iniciativa','conhecimento_tecnico','capacidade_aprendizado']
            return s + campos.reduce((ss, k) => ss + Number(a[k] || 0), 0) / campos.length
          }, 0)
          mediaGeral = (soma / allAvs.length).toFixed(1)
        }

        // Taxa de aprovação nas requisições
        const reqList = reqs || []
        const totalReqs = reqList.length
        const aprovadas = reqList.filter(r => ['aprovada','em_selecao','contratada'].includes(r.status)).length

        setDados({
          totalAtivos: ativos.length,
          totalInativos: inativos.length,
          headEmpresaList,
          admPorMes,
          deslPorMes,
          mediaAvaliacao: Number(mediaGeral),
          totalReqs,
          aprovadas,
          vagas: reqList.filter(r => r.status === 'aberta').length,
        })
      } catch { setDados(null) } finally { setLoading(false) }
    }
    fetch()
  }, [])

  if (loading) return <div style={{ padding: 80, textAlign: 'center', color: C.ink3, fontSize: 13 }}>Carregando KPIs…</div>
  if (!dados) return <div style={{ padding: 80, textAlign: 'center', color: C.bad, fontSize: 13 }}>Erro ao carregar dados.</div>

  const turnover = dados.totalAtivos + dados.totalInativos > 0
    ? ((dados.totalInativos / (dados.totalAtivos + dados.totalInativos)) * 100).toFixed(1)
    : 0

  const maxAdm = Math.max(...dados.admPorMes, 1)
  const maxEmp = dados.headEmpresaList.length > 0 ? dados.headEmpresaList[0].value : 1

  const MESES_CURTOS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const agora = new Date()
  const ultimos6Meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1)
    return MESES_CURTOS[d.getMonth()]
  })

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: C.ink }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 21, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>KPIs Diretoria</h1>
        <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 4 }}>Indicadores estratégicos de RH</div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KPIBig label="Headcount ativo" value={dados.totalAtivos} color={C.navy} trend={dados.admPorMes} />
        <KPIBig label="Turnover acumulado" value={turnover} unit="%" color={Number(turnover) > 15 ? C.bad : C.ok} meta="≤ 15%" metaOk={Number(turnover) <= 15} />
        <KPIBig label="Vagas abertas" value={dados.vagas} color={dados.vagas > 5 ? C.warn : C.ok} meta="≤ 5 abertas" metaOk={dados.vagas <= 5} />
        <KPIBig label="Nota média avaliações" value={dados.mediaAvaliacao || '—'} unit={dados.mediaAvaliacao ? '/5' : ''} color={dados.mediaAvaliacao >= 3.5 ? C.ok : C.warn} meta="≥ 3,5" metaOk={dados.mediaAvaliacao >= 3.5} />
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Admissões x Desligamentos */}
        <div style={{ background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 16 }}>Admissões x Desligamentos (6 meses)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 }}>
            {dados.admPorMes.map((adm, i) => {
              const desl = dados.deslPorMes[i]
              const h1 = maxAdm > 0 ? Math.round((adm / maxAdm) * 70) : 0
              const h2 = maxAdm > 0 ? Math.round((desl / maxAdm) * 70) : 0
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 75 }}>
                    <div title={`Admissões: ${adm}`} style={{ width: 12, height: h1 || 2, background: C.ok, borderRadius: '2px 2px 0 0', minHeight: 2 }} />
                    <div title={`Deslig.: ${desl}`} style={{ width: 12, height: h2 || 2, background: C.bad, borderRadius: '2px 2px 0 0', minHeight: 2 }} />
                  </div>
                  <div style={{ fontSize: 9.5, color: C.ink3, marginTop: 2 }}>{ultimos6Meses[i]}</div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 11, color: C.ink2 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: C.ok, borderRadius: 2, display: 'inline-block' }} />Admissões</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: C.bad, borderRadius: 2, display: 'inline-block' }} />Desligamentos</span>
          </div>
        </div>

        {/* Headcount por empresa */}
        <div style={{ background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 16 }}>Headcount por empresa</div>
          {dados.headEmpresaList.length === 0 ? (
            <div style={{ color: C.ink3, fontSize: 12.5 }}>Sem dados</div>
          ) : (
            dados.headEmpresaList.map((e, i) => (
              <GaugeBar key={i} label={e.label} value={e.value} max={maxEmp} color={[C.navy, C.info, '#4A7A5A', C.warn, '#7A4A5A'][i % 5]} />
            ))
          )}
        </div>

        {/* Requisições */}
        <div style={{ background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 16 }}>Funil de requisições</div>
          {[
            { label: 'Total de requisições', v: dados.totalReqs, color: C.ink2 },
            { label: 'Aprovadas / Em seleção / Contratadas', v: dados.aprovadas, color: C.ok },
            { label: 'Vagas abertas', v: dados.vagas, color: C.warn },
            { label: 'Taxa de aprovação', v: dados.totalReqs > 0 ? `${Math.round((dados.aprovadas / dados.totalReqs) * 100)}%` : '—', color: C.navy },
          ].map(k => (
            <div key={k.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.line2}` }}>
              <span style={{ fontSize: 12.5, color: C.ink2 }}>{k.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: k.color }}>{k.v}</span>
            </div>
          ))}
        </div>

        {/* Avaliações resumo */}
        <div style={{ background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 16 }}>Resumo de avaliações</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ padding: '12px 14px', background: C.surface2, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: C.ink2 }}>Nota média geral</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: dados.mediaAvaliacao >= 3.5 ? C.ok : C.warn, fontFamily: 'Georgia, serif' }}>{dados.mediaAvaliacao || '—'}<span style={{ fontSize: 12, color: C.ink3 }}>/5</span></span>
            </div>
            <div style={{ padding: '12px 14px', background: C.surface2, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: C.ink2 }}>Colaboradores avaliados</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: C.ink, fontFamily: 'Georgia, serif' }}>—</span>
            </div>
            <div style={{ padding: '8px 14px', background: '#E4F1E8', borderRadius: 8, fontSize: 11.5, color: C.ok, fontWeight: 600, textAlign: 'center' }}>
              {dados.mediaAvaliacao >= 3.5 ? 'Equipe dentro da meta de desempenho' : 'Equipe abaixo da meta — atenção recomendada'}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
