// pages/relatorios.js
import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import StatCard from '@/components/StatCard'
import { R, D, hoje, meAtual, mesAnterior } from '@/lib/helpers'
import { getFinanceiro, getMovimentacoes } from '@/lib/db'

export default function Relatorios() {
  const [fin, setFin]   = useState([])
  const [movs, setMovs] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod]   = useState('mes')

  useEffect(() => {
    Promise.all([getFinanceiro(), getMovimentacoes(200)]).then(([f, m]) => {
      if (f.data) setFin(f.data.map(x => ({ ...x, desc: x.descricao })))
      if (m.data) setMovs(m.data)
      setLoading(false)
    })
  }, [])

  function filtrarFin(p) {
    const tm = meAtual(), lm = mesAnterior(), hj = hoje()
    const now = new Date()
    const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    if (p === 'dia')     return fin.filter(f => f.data === hj)
    if (p === 'semana')  return fin.filter(f => f.data >= mon.toISOString().slice(0,10) && f.data <= sun.toISOString().slice(0,10))
    if (p === 'mes')     return fin.filter(f => f.data?.startsWith(tm))
    if (p === 'mes_ant') return fin.filter(f => f.data?.startsWith(lm))
    return fin
  }

  function filtrarMovs(p) {
    const tm = meAtual(), hj = hoje()
    const now = new Date()
    const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    if (p === 'dia')    return movs.filter(m => m.data === hj)
    if (p === 'semana') return movs.filter(m => m.data >= mon.toISOString().slice(0,10) && m.data <= sun.toISOString().slice(0,10))
    return movs.filter(m => m.data?.startsWith(tm))
  }

  const finItems = filtrarFin(period)
  const movItems = filtrarMovs(period)
  const rec  = finItems.filter(f => f.tipo === 'venda').reduce((s, f) => s + Number(f.val), 0)
  const desp = finItems.filter(f => f.tipo === 'despesa').reduce((s, f) => s + Number(f.val), 0)

  // Estoque mais movimentado
  const mapEst = {}
  movItems.forEach(m => {
    if (!mapEst[m.nome]) mapEst[m.nome] = { ent: 0, sai: 0 }
    if (m.tipo === 'entrada') mapEst[m.nome].ent += Number(m.qty)
    else mapEst[m.nome].sai += Number(m.qty)
  })
  const rowsEst = Object.entries(mapEst).sort((a, b) => (b[1].ent + b[1].sai) - (a[1].ent + a[1].sai))

  // Top despesas
  const topDesp = [...finItems.filter(f => f.tipo === 'despesa')].sort((a, b) => b.val - a.val).slice(0, 8)

  // Comparativo meses
  const finAtual = fin.filter(f => f.data?.startsWith(meAtual()))
  const finAnt   = fin.filter(f => f.data?.startsWith(mesAnterior()))
  const rA = finAtual.filter(f => f.tipo === 'venda').reduce((s, f) => s + Number(f.val), 0)
  const dA = finAtual.filter(f => f.tipo === 'despesa').reduce((s, f) => s + Number(f.val), 0)
  const rP = finAnt.filter(f => f.tipo === 'venda').reduce((s, f) => s + Number(f.val), 0)
  const dP = finAnt.filter(f => f.tipo === 'despesa').reduce((s, f) => s + Number(f.val), 0)
  const diffR = rP > 0 ? Math.round(((rA - rP) / rP) * 100) : 0
  const diffD = dP > 0 ? Math.round(((dA - dP) / dP) * 100) : 0

  const labels = { dia: 'Hoje', semana: 'Esta Semana', mes: 'Este Mês', mes_ant: 'Mês Anterior' }

  if (loading) return <Layout title="Relatórios"><div className="loading-overlay"><div className="loading-icon">🌽</div></div></Layout>

  return (
    <Layout title="Relatórios">
      <div className="ph">
        <div><h2>Relatórios</h2><div className="ph-sub">{labels[period]}</div></div>
        <div className="ph-actions">
          <div className="period-tabs">
            {Object.entries(labels).map(([k, v]) => (
              <button key={k} className={`ptab${period === k ? ' active' : ''}`} onClick={() => setPeriod(k)}>{v}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="sg">
        <StatCard label="Vendas"       value={R(rec)}      color="vd" />
        <StatCard label="Despesas"     value={R(desp)}     color="vm" />
        <StatCard label="Lucro Líquido" value={R(rec-desp)} color={rec-desp >= 0 ? 'ora' : 'vm'} glow />
        <StatCard label="Margem"       value={`${rec > 0 ? Math.round(((rec-desp)/rec)*100) : 0}%`} color="az" />
      </div>

      <div className="g2">
        {/* Estoque movimentado */}
        <div className="panel">
          <div className="panel-hd"><div className="panel-title">📦 Itens mais movimentados</div></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Item</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead>
              <tbody>
                {rowsEst.length === 0
                  ? <tr><td colSpan="4"><div className="empty"><div className="empty-ico">📦</div><div className="empty-title">Sem dados</div></div></td></tr>
                  : rowsEst.map(([n, v]) => (
                    <tr key={n}>
                      <td><strong>{n}</strong></td>
                      <td style={{ color: 'var(--verde)', fontFamily: 'var(--mono)' }}>+{v.ent}</td>
                      <td style={{ color: 'var(--verm)',  fontFamily: 'var(--mono)' }}>-{v.sai}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: v.ent-v.sai >= 0 ? 'var(--verde)' : 'var(--verm)' }}>
                        {v.ent-v.sai >= 0 ? '+' : ''}{v.ent-v.sai}
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Top despesas */}
        <div className="panel">
          <div className="panel-hd"><div className="panel-title">💸 Top Despesas do Período</div></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Descrição</th><th>Categoria</th><th>Valor</th></tr></thead>
              <tbody>
                {topDesp.length === 0
                  ? <tr><td colSpan="3"><div className="empty"><div className="empty-ico">💸</div><div className="empty-title">Sem despesas</div></div></td></tr>
                  : topDesp.map(f => (
                    <tr key={f.id}>
                      <td><strong>{f.desc}</strong></td>
                      <td><span className="badge out">{f.cat}</span></td>
                      <td style={{ color: 'var(--verm)', fontFamily: 'var(--mono)', fontWeight: 700 }}>{R(f.val)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Comparativo mensal */}
      <div className="panel">
        <div className="panel-hd"><div className="panel-title">📊 Comparativo: Mês Atual × Mês Anterior</div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.8rem', textAlign: 'center' }}>
          {[
            { label: 'Vendas Mês Atual',      val: R(rA),  color: 'var(--verde)' },
            { label: 'Vendas Mês Anterior',   val: R(rP),  color: 'var(--txt)'   },
            { label: 'Variação Vendas',        val: `${diffR >= 0 ? '+' : ''}${diffR}%`, color: diffR >= 0 ? 'var(--verde)' : 'var(--verm)' },
            { label: 'Despesa Mês Atual',      val: R(dA),  color: 'var(--verm)'  },
            { label: 'Despesa Mês Anterior',   val: R(dP),  color: 'var(--txt)'   },
            { label: 'Variação Despesa',        val: `${diffD >= 0 ? '+' : ''}${diffD}%`, color: diffD <= 0 ? 'var(--verde)' : 'var(--verm)' },
          ].map((item, i) => (
            <div key={i} style={{ padding: '1rem', background: 'var(--c2)', borderRadius: 10 }}>
              <div style={{ fontSize: '.7rem', color: 'var(--txt)', marginBottom: '.4rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>{item.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: item.color, fontFamily: 'var(--mono)' }}>{item.val}</div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
