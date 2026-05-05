// RH — Painel por Obra (P7)
// Headcount e lançamentos agregados por obra, com filtro de mês
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

function mesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function BarChart({ items, maxVal }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {items.map((it, i) => {
        const pct = maxVal > 0 ? Math.round((it.value / maxVal) * 100) : 0
        const cor = [C.navy, C.info, '#4A7A5A', '#7A4A5A', '#5A4A7A', C.warn][i % 6]
        return (
          <div key={it.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12.5, color: C.ink, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '65%' }}>{it.label}</span>
              <span style={{ fontSize: 11.5, color: C.ink3 }}>{it.value} {it.unit}</span>
            </div>
            <div style={{ height: 7, background: C.line2, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 4, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function PainelObra() {
  const [mes, setMes] = useState(mesAtual())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('cards') // 'cards' | 'tabela'

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const inicio = mes + '-01'
        const [ano, m] = mes.split('-').map(Number)
        const fim = new Date(ano, m, 0).toISOString().split('T')[0]

        const { data } = await supabase.from('lancamentos')
          .select('funcionario, funcao, empresa, obra, diarias, horas')
          .eq('tenant_id', getTenantId())
          .gte('data', inicio)
          .lte('data', fim)
          .not('obra', 'is', null)

        if (!data) { setRows([]); setLoading(false); return }

        // Agrupar por obra
        const mapa = {}
        data.forEach(r => {
          const o = r.obra || '(sem obra)'
          if (!mapa[o]) mapa[o] = { obra: o, empresa: r.empresa, funcionarios: new Set(), registros: 0, dias: 0 }
          if (r.funcionario) mapa[o].funcionarios.add(r.funcionario)
          mapa[o].registros++
          mapa[o].dias += Number(r.diarias || 0)
        })

        const lista = Object.values(mapa)
          .map(o => ({ ...o, headcount: o.funcionarios.size }))
          .sort((a, b) => b.headcount - a.headcount)

        setRows(lista)
      } catch { setRows([]) } finally { setLoading(false) }
    }
    fetch()
  }, [mes])

  const totalDias = rows.reduce((s, r) => s + r.dias, 0)
  const totalHead = rows.reduce((s, r) => s + r.headcount, 0)
  const maxHead = rows.length > 0 ? rows[0].headcount : 1

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: C.ink }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Painel por Obra</h1>
          <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 4 }}>Headcount e lançamentos por canteiro</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="month" value={mes} onChange={e => setMes(e.target.value)}
            style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: '7px 12px', fontSize: 13, color: C.ink, background: C.surface, outline: 'none', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', border: `1px solid ${C.line}`, borderRadius: 8, overflow: 'hidden' }}>
            {['cards', 'tabela'].map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                style={{ padding: '7px 12px', border: 'none', background: viewMode === v ? C.navy : C.surface, color: viewMode === v ? '#FFF' : C.ink2, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                {v === 'cards' ? 'Cards' : 'Tabela'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Totais */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        {[
          { label: 'Obras ativas', v: rows.length, sub: 'no período' },
          { label: 'Total headcount', v: totalHead, sub: 'colaboradores únicos' },
          { label: 'Total dias', v: totalDias.toLocaleString('pt-BR', { minimumFractionDigits: 1 }), sub: 'diárias registradas' },
          { label: 'Média por obra', v: rows.length > 0 ? Math.round(totalHead / rows.length) : 0, sub: 'colaboradores/obra' },
        ].map(k => (
          <div key={k.label} style={{ background: C.surface, border: `1px solid ${C.line2}`, borderRadius: 10, padding: '13px 17px', flex: 1, minWidth: 130 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.ink3, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, fontFamily: 'Georgia, serif', lineHeight: 1.1 }}>{k.v}</div>
            <div style={{ fontSize: 11, color: C.ink3, marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: C.ink3, fontSize: 13 }}>Carregando dados do período…</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: C.ink3, fontSize: 13 }}>Nenhum lançamento encontrado para este período.</div>
      ) : viewMode === 'cards' ? (
        <div>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ink3, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>Headcount por obra</div>
            <BarChart items={rows.map(r => ({ label: r.obra, value: r.headcount, unit: 'col.' }))} maxVal={maxHead} />
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.line}` }}>
                {['Obra','Empresa','Headcount','Dias totais','Registros','Média dias/col.'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.ink3, fontWeight: 600, fontSize: 10.5, letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const mediaDias = r.headcount > 0 ? (r.dias / r.headcount).toFixed(1) : '—'
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.line2}`, background: i % 2 === 0 ? C.surface : '#FDFCFA' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: C.ink }}>{r.obra}</td>
                    <td style={{ padding: '10px 12px', color: C.ink2 }}>{r.empresa || '—'}</td>
                    <td style={{ padding: '10px 12px', color: C.ink, fontWeight: 700 }}>{r.headcount}</td>
                    <td style={{ padding: '10px 12px', color: C.ink2 }}>{r.dias.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</td>
                    <td style={{ padding: '10px 12px', color: C.ink3 }}>{r.registros}</td>
                    <td style={{ padding: '10px 12px', color: C.ink3 }}>{mediaDias}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
