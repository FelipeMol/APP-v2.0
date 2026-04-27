// Financeiro — Visão Geral (Painel Principal)
// Design: warm beige shell + navy banner + KPIs + charts
import { Link } from 'react-router-dom'

// ── Palette ──────────────────────────────────────────────────────
const C = {
  navy: '#17273C', amber: '#E8A628', ok: '#3D7A50', bad: '#B84A33',
  surface: '#FFFFFF', surface2: '#F6F3ED',
  ink: '#1C2330', ink2: '#45505F', ink3: '#7F8A99',
  line: '#DDD6C7', line2: '#E8E2D5',
}

// ── Helpers ───────────────────────────────────────────────────────
function brl(n) {
  const abs = Math.abs(n)
  return (n < 0 ? '−' : '') + 'R$ ' + abs.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function brlK(n) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return (n < 0 ? '−' : '') + 'R$ ' + (abs / 1_000_000).toFixed(1).replace('.', ',') + 'M'
  if (abs >= 1_000) return (n < 0 ? '−' : '') + 'R$ ' + (abs / 1_000).toFixed(0) + 'k'
  return brl(n)
}

function Sparkline({ data, w = 72, h = 22, color = C.ok }) {
  if (!data?.length) return null
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 2) + 1
    const y = h - 2 - ((v - min) / range) * (h - 4)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={'M' + pts.join(' L ')} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StatusPill({ status }) {
  const map = {
    pago:     { label: 'Pago',     bg: '#E4F1E8', fg: '#3D7A50' },
    apagar:   { label: 'A pagar',  bg: '#FDF3DF', fg: '#8A6210' },
    atrasado: { label: 'Atrasado', bg: '#FBE9E4', fg: '#B84A33' },
  }
  const m = map[status] || map.pago
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: m.bg, color: m.fg, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {m.label}
    </span>
  )
}

// ── Mock Data (substituir por serviços na fase de backend) ─────────
const CONTAS_MOCK = [
  { id: 'bb',        banco: 'Banco do Brasil', bgCor: '#0033A0', cor: '#FFE600', saldo: 1842300, pendentes: 2 },
  { id: 'itau',      banco: 'Itaú Unibanco',   bgCor: '#EC7000', cor: '#FFF',    saldo: 1124800, pendentes: 0 },
  { id: 'bradesco',  banco: 'Bradesco',         bgCor: '#CC092F', cor: '#FFF',    saldo: 742100,  pendentes: 1 },
  { id: 'santander', banco: 'Santander',        bgCor: '#EC0000', cor: '#FFF',    saldo: 564900,  pendentes: 0 },
  { id: 'caixa',     banco: 'Caixa Econômica',  bgCor: '#005CA9', cor: '#FFF',    saldo: 312500,  pendentes: 3 },
  { id: 'inter',     banco: 'Banco Inter',      bgCor: '#FF7A00', cor: '#FFF',    saldo: 233800,  pendentes: 0 },
]
const TOTAL_SALDO = CONTAS_MOCK.reduce((s, c) => s + c.saldo, 0)

const LANCS_MOCK = [
  { id: 1,  data: '22/04', tipo: 'saida',   cat: 'material',  desc: 'Cimento Votorantim — 200 sacos',    obra: 'Casa George',   valor: 18400,  status: 'pago',     forn: 'Votorantim Cimentos' },
  { id: 2,  data: '22/04', tipo: 'entrada', cat: 'medicao',   desc: 'Medição nº 7 aprovada',              obra: 'Edif. Namirá',  valor: 340000, status: 'pago',     forn: 'Cliente — Namirá' },
  { id: 3,  data: '21/04', tipo: 'saida',   cat: 'folha',     desc: 'Folha de pagamento — 1ª quinzena',  obra: '—',             valor: 187200, status: 'pago',     forn: 'Folha interna' },
  { id: 4,  data: '21/04', tipo: 'saida',   cat: 'locacao',   desc: 'Locação betoneira Mix 400L',         obra: 'Casa Brenda',   valor: 3200,   status: 'pago',     forn: 'Locapeças' },
  { id: 5,  data: '21/04', tipo: 'entrada', cat: 'aporte',    desc: 'Aporte sócio — RR',                  obra: '—',             valor: 500000, status: 'pago',     forn: 'Sócio · Felipe M.' },
  { id: 6,  data: '21/04', tipo: 'saida',   cat: 'material',  desc: 'Ferragem ⌀10mm — 3t',               obra: 'Res. Palma',    valor: 42800,  status: 'pago',     forn: 'Gerdau' },
  { id: 7,  data: '20/04', tipo: 'saida',   cat: 'servicos',  desc: 'Empreitada elétrica — etapa 2',     obra: 'Edif. Namirá',  valor: 64500,  status: 'pago',     forn: 'Eletro Sul ME' },
  { id: 8,  data: '20/04', tipo: 'entrada', cat: 'medicao',   desc: 'Medição nº 4 — Casa George',        obra: 'Casa George',   valor: 218000, status: 'pago',     forn: 'Cliente — Particular' },
  { id: 9,  data: '19/04', tipo: 'saida',   cat: 'impostos',  desc: 'INSS competência 03/26',            obra: '—',             valor: 28400,  status: 'pago',     forn: 'Receita Federal' },
  { id: 10, data: '18/04', tipo: 'saida',   cat: 'material',  desc: 'Bloco cerâmico — 4.000 un.',        obra: 'Cond. Sete',    valor: 11200,  status: 'pago',     forn: 'Cerâmica Iritu' },
  { id: 11, data: '25/04', tipo: 'saida',   cat: 'folha',     desc: 'Folha de abril — Dopvie',           obra: '—',             valor: 96400,  status: 'apagar',   forn: 'Folha interna · DP' },
  { id: 12, data: '26/04', tipo: 'saida',   cat: 'servicos',  desc: 'Topografia — Casa Vilma',           obra: 'Casa Vilma',    valor: 18900,  status: 'apagar',   forn: 'TopoRio Engenharia' },
  { id: 13, data: '15/04', tipo: 'saida',   cat: 'material',  desc: 'Tinta epóxi industrial — 80L',      obra: 'Galpão Iritu',  valor: 9400,   status: 'atrasado', forn: 'Sherwin Williams' },
  { id: 14, data: '17/04', tipo: 'entrada', cat: 'aporte',    desc: 'Repasse interempresa NM → RR',       obra: '—',             valor: 120000, status: 'pago',     forn: 'Const. Namalique' },
  { id: 15, data: '16/04', tipo: 'saida',   cat: 'locacao',   desc: 'Caçamba Mercedes 8m³ — 5 dias',     obra: 'Res. Palma',    valor: 6800,   status: 'pago',     forn: 'Transportes Aldeia' },
]

const CATS = {
  material:  { label: 'Material',         cor: '#3D5A80' },
  folha:     { label: 'Folha',            cor: '#7B5BA0' },
  servicos:  { label: 'Serviços',         cor: '#B8862C' },
  locacao:   { label: 'Locação',          cor: '#5A7A50' },
  impostos:  { label: 'Impostos',         cor: '#B84A33' },
  medicao:   { label: 'Medição cliente',  cor: '#3D7A50' },
  aporte:    { label: 'Aporte / Repasse', cor: '#2A4365' },
}

const FLUXO = (() => {
  const ent = [42, 0, 0, 320, 56, 0, 218, 30, 0, 0, 12, 64, 0, 0, 410, 22, 0, 18, 120, 84, 500, 340, 0]
  const sai = [12, 4, 8, 62, 24, 6, 41, 18, 11, 9, 14, 28, 19, 6, 88, 16, 21, 33, 64, 187, 42, 18, 22]
  return ent.map((e, i) => ({ dia: i + 2, entrada: e * 1000, saida: sai[i] * 1000 }))
})()

// ── Sub-components ────────────────────────────────────────────────
function FinKPI({ label, value, delta, deltaColor, sub, sparkData, sparkColor }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, color: C.ink3, fontWeight: 500, letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 26, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1, color: C.ink }}>{value}</div>
        {delta && <div style={{ fontSize: 11, color: deltaColor || C.ok, fontWeight: 600 }}>{delta}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 10, color: C.ink3 }}>{sub}</span>
        {sparkData && <Sparkline data={sparkData} color={sparkColor || C.ok} />}
      </div>
    </div>
  )
}

function SaldoBanner() {
  const ent = LANCS_MOCK.filter(l => l.tipo === 'entrada' && l.status === 'pago').reduce((s, l) => s + l.valor, 0)
  const sai = LANCS_MOCK.filter(l => l.tipo === 'saida' && l.status === 'pago').reduce((s, l) => s + l.valor, 0)
  const saldoMes = ent - sai
  return (
    <div style={{ background: C.navy, color: '#FFF', borderRadius: 10, padding: '24px 28px', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 0, marginBottom: 14 }}>
      <div style={{ paddingRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>SALDO TOTAL EM CAIXA</div>
        <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 6 }}>{brl(TOTAL_SALDO)}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>{CONTAS_MOCK.length} contas ativas · 5 empresas</div>
      </div>
      <div style={{ paddingLeft: 24, paddingRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>ENTRADAS · ABR</div>
        <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, fontWeight: 500, marginTop: 6, color: '#8ED1A5' }}>+{brlK(ent)}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>3 medições + 2 aportes</div>
      </div>
      <div style={{ paddingLeft: 24, paddingRight: 24, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>SAÍDAS · ABR</div>
        <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, fontWeight: 500, marginTop: 6, color: '#F4B19C' }}>−{brlK(sai)}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>10 lançamentos pagos</div>
      </div>
      <div style={{ paddingLeft: 24 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>SALDO DO MÊS</div>
        <div style={{ fontFamily: '"Libre Caslon Text", Georgia, serif', fontSize: 24, fontWeight: 500, marginTop: 6, color: saldoMes >= 0 ? '#8ED1A5' : '#F4B19C' }}>
          {saldoMes >= 0 ? '+' : '−'}{brlK(Math.abs(saldoMes))}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>Margem operacional positiva</div>
      </div>
    </div>
  )
}

function FluxoDiarioChart() {
  const maxVal = Math.max(...FLUXO.map(d => Math.max(d.entrada, d.saida)))
  const W = 720, H = 175, PAD = 20
  const bw = (W - PAD * 2) / FLUXO.length

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 22, gridColumn: 'span 8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Fluxo diário · abril/26</div>
          <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Entradas e saídas por dia · todas as contas</div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: C.ink2 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, background: C.navy, borderRadius: 2 }} /> Entradas
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, background: '#B8862C', borderRadius: 2 }} /> Saídas
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: '100%', height: 190, display: 'block', marginTop: 8 }} preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <line key={i} x1={PAD} y1={H - p * (H - 20) - 6} x2={W - PAD} y2={H - p * (H - 20) - 6} stroke="#E8E2D5" strokeWidth="0.5" strokeDasharray="2 2" />
        ))}
        {FLUXO.map((d, i) => {
          const x = PAD + i * bw
          const eH = (d.entrada / maxVal) * (H - 30)
          const sH = (d.saida / maxVal) * (H - 30)
          const barW = bw * 0.36
          return (
            <g key={i}>
              <rect x={x + bw * 0.08} y={H - 6 - eH} width={barW} height={eH || 0} fill={C.navy} rx="1" />
              <rect x={x + bw * 0.46} y={H - 6 - sH} width={barW} height={sH || 0} fill="#B8862C" rx="1" />
              {(d.dia % 5 === 0 || d.dia === 2) && (
                <text x={x + bw * 0.5} y={H + 14} fontSize="9" fill={C.ink3} textAnchor="middle" fontFamily="Inter">{String(d.dia).padStart(2, '0')}</text>
              )}
            </g>
          )
        })}
        <line x1={PAD} y1={H - 6} x2={W - PAD} y2={H - 6} stroke="#DDD6C7" strokeWidth="1" />
      </svg>
    </div>
  )
}

function CategoriaRanking() {
  const totals = {}
  LANCS_MOCK.filter(l => l.tipo === 'saida' && l.status === 'pago').forEach(l => {
    totals[l.cat] = (totals[l.cat] || 0) + l.valor
  })
  const arr = Object.entries(totals).map(([k, v]) => ({ k, v, ...CATS[k] })).sort((a, b) => b.v - a.v)
  const maxVal = arr[0]?.v || 1
  const total = arr.reduce((s, x) => s + x.v, 0)

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 22, gridColumn: 'span 4' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Top categorias de gasto</div>
        <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Abril · todas as obras</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {arr.map(c => {
          const pct = (c.v / total * 100)
          return (
            <div key={c.k}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: C.ink, fontWeight: 500 }}>{c.label}</span>
                <span style={{ color: C.ink2 }}>{brlK(c.v)} · <span style={{ color: C.ink3 }}>{pct.toFixed(0)}%</span></span>
              </div>
              <div style={{ height: 5, background: C.surface2, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: (c.v / maxVal * 100) + '%', height: '100%', background: c.cor, borderRadius: 3 }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ObraRanking() {
  const totals = {}
  LANCS_MOCK.filter(l => l.tipo === 'saida' && l.status === 'pago' && l.obra !== '—').forEach(l => {
    totals[l.obra] = (totals[l.obra] || 0) + l.valor
  })
  const arr = Object.entries(totals).map(([nome, v]) => ({ nome, v })).sort((a, b) => b.v - a.v)
  const maxVal = arr[0]?.v || 1

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 22, gridColumn: 'span 5' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Gasto por obra · abril</div>
        <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Apenas saídas pagas</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {arr.map((o, i) => (
          <div key={o.nome} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 90px', gap: 10, alignItems: 'center', fontSize: 12 }}>
            <span style={{ color: C.ink3, fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <div style={{ marginBottom: 4, fontWeight: 500, color: C.ink }}>{o.nome}</div>
              <div style={{ height: 4, background: C.surface2, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: (o.v / maxVal * 100) + '%', height: '100%', background: C.navy }} />
              </div>
            </div>
            <span style={{ textAlign: 'right', color: C.ink2, fontWeight: 600 }}>{brlK(o.v)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ApagarBlock() {
  const apagar = LANCS_MOCK.filter(l => l.status === 'apagar' || l.status === 'atrasado').sort((a, b) => a.data.localeCompare(b.data))
  const total = apagar.reduce((s, l) => s + l.valor, 0)
  const atrasados = apagar.filter(l => l.status === 'atrasado').length

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: 22, gridColumn: 'span 7' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Próximos vencimentos</div>
          <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{apagar.length} contas · {brl(total)} no total</div>
        </div>
        {atrasados > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: C.bad, background: '#FBE9E4', padding: '4px 10px', borderRadius: 999 }}>
            {atrasados} atrasada
          </span>
        )}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ color: C.ink3, textAlign: 'left' }}>
            <th style={TH()}>Vencimento</th>
            <th style={TH()}>Descrição</th>
            <th style={TH()}>Fornecedor</th>
            <th style={{ ...TH(), textAlign: 'right' }}>Valor</th>
            <th style={TH()}>Status</th>
          </tr>
        </thead>
        <tbody>
          {apagar.map((l, i) => (
            <tr key={i} style={{ borderTop: `1px solid ${C.line2}` }}>
              <td style={TD()}><span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 11 }}>{l.data}</span></td>
              <td style={TD()}><div style={{ fontWeight: 500 }}>{l.desc}</div></td>
              <td style={TD()}><span style={{ fontSize: 11, color: C.ink2 }}>{l.forn}</span></td>
              <td style={{ ...TD(), textAlign: 'right', fontWeight: 700 }}>{brl(l.valor)}</td>
              <td style={TD()}><StatusPill status={l.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TH() { return { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 10px', borderBottom: `1px solid ${C.line}`, color: C.ink3 } }
function TD() { return { padding: '12px 10px', verticalAlign: 'middle', color: C.ink } }

function GhostBtn({ children, to, onClick }) {
  const s = { display: 'inline-flex', alignItems: 'center', gap: 6, background: C.surface, border: `1px solid ${C.line}`, color: C.ink2, fontSize: 12, fontWeight: 500, padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }
  if (to) return <Link to={to} style={s}>{children}</Link>
  return <button style={s} onClick={onClick}>{children}</button>
}

// ── Page ──────────────────────────────────────────────────────────
export default function Painel() {
  return (
    <div style={{ margin: '-22px -28px -40px', background: '#EEEBE5', minHeight: 'calc(100vh - 60px)', padding: '22px 28px 40px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: C.ink }}>Visão geral financeira</h1>
          <div style={{ fontSize: 12, color: C.ink3, marginTop: 4 }}>Consolidado das 5 empresas</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <GhostBtn to="/financeiro/lancamentos">Lançamentos</GhostBtn>
          <GhostBtn to="/financeiro/contas">Contas</GhostBtn>
          <Link
            to="/financeiro/lancamentos"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E8A628', border: 'none', color: C.navy, fontSize: 12, fontWeight: 700, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', textDecoration: 'none' }}
          >
            + Novo lançamento
          </Link>
        </div>
      </div>

      {/* Saldo banner */}
      <SaldoBanner />

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
        <FinKPI
          label="Lançamentos do mês" value="1.284" delta="+12,4%"
          sub="6.044 no acumulado"
          sparkData={[820,910,880,1020,970,1100,1080,1150,1190,1220,1240,1284]}
          sparkColor={C.ok}
        />
        <FinKPI
          label="Recebimentos pendentes" value={brlK(412000)} delta="2 contratos"
          deltaColor={C.ink3}
          sub="Vence em até 30 dias"
          sparkData={[120,180,210,260,310,340,360,380,400,400,410,412]}
          sparkColor={C.navy}
        />
        <FinKPI
          label="A pagar próx. 30d" value={brlK(124700)} delta="1 atrasada"
          deltaColor={C.bad}
          sub="3 contas em fila"
          sparkData={[40,60,55,80,90,100,110,115,118,120,122,124]}
          sparkColor="#B8862C"
        />
        <FinKPI
          label="Margem operacional" value="38,2%" delta="+2,1pp"
          sub="vs. mar/26"
          sparkData={[28,30,29,32,31,33,35,34,36,37,37,38]}
          sparkColor={C.ok}
        />
      </div>

      {/* Row 2: fluxo + categorias */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14, marginBottom: 14 }}>
        <FluxoDiarioChart />
        <CategoriaRanking />
      </div>

      {/* Row 3: a pagar + obra ranking */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>
        <ApagarBlock />
        <ObraRanking />
      </div>

    </div>
  )
}
