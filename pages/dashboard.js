// pages/dashboard.js
import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import StatCard from '@/components/StatCard'
import { R, D, hoje, meAtual } from '@/lib/helpers'
import { getEstoque, getFinanceiro, getProdutos, getMovimentacoes } from '@/lib/db'

export default function Dashboard() {
  const [dados, setDados] = useState({ estoque: [], fin: [], produtos: [], movs: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [e, f, p, m] = await Promise.all([
      getEstoque(), getFinanceiro(), getProdutos(), getMovimentacoes(10)
    ])
    setDados({
      estoque:  e.data || [],
      fin:      f.data || [],
      produtos: p.data || [],
      movs:     m.data || [],
    })
    setLoading(false)
  }

  const finMes   = dados.fin.filter(f => f.data?.startsWith(meAtual()))
  const vendas   = finMes.filter(f => f.tipo === 'venda').reduce((s, f) => s + Number(f.val), 0)
  const desp     = finMes.filter(f => f.tipo === 'despesa').reduce((s, f) => s + Number(f.val), 0)
  const saldo    = vendas - desp
  const alertas  = dados.estoque.filter(i => i.qty < i.min).length

  if (loading) return (
    <Layout title="Dashboard" alertas={0}>
      <div className="loading-overlay"><div className="loading-icon">🌽</div><div className="loading-txt">Carregando...</div></div>
    </Layout>
  )

  // Gráfico 7 dias
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const date = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
    const de = dados.fin.filter(f => f.data === date && f.tipo === 'despesa').reduce((s, f) => s + Number(f.val), 0)
    days.push({ label, de })
  }
  const maxV = Math.max(1, ...days.map(d => d.de))

  const top = [...dados.produtos].sort((a, b) => b.vendas - a.vendas).slice(0, 4)
  const maxVendas = Math.max(1, ...top.map(p => p.vendas))

  return (
    <Layout title="Dashboard" alertas={alertas}>
      <div className="ph">
        <div>
          <h2>Dashboard</h2>
          <div className="ph-sub">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="sg">
        <StatCard label="Despesas do Mês" value={R(desp)}   detail={`${finMes.filter(f=>f.tipo==='despesa').length} lançamentos`} color="vm" />
        <StatCard label="Lucro Líquido"   value={R(saldo)}  detail={`${vendas > 0 ? Math.round((saldo/vendas)*100) : 0}% de margem`} color={saldo >= 0 ? 'ora' : 'vm'} glow />
        <StatCard label="Alertas Estoque" value={alertas}   detail={alertas > 0 ? 'itens abaixo do mínimo' : 'tudo ok'} color={alertas > 0 ? 'am' : 'vd'} />
      </div>

      <div className="g3">
        {/* Gráfico 7 dias */}
        <div className="panel">
          <div className="panel-hd">
            <div className="panel-title">Despesas — Últimos 7 dias</div>
            <div className="panel-tag">semana atual</div>
          </div>
          <div className="bar-chart" style={{ display: 'flex', alignItems: 'flex-end', gap: '.45rem', height: 130 }}>
            {days.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.4rem' }}>
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', width: '100%' }}>
                  <div style={{ flex: 1, borderRadius: '5px 5px 0 0', background: 'rgba(231,76,60,.4)',  height: Math.max(4, Math.round((d.de / maxV) * 110)) }} title={R(d.de)} />
                </div>
                <div style={{ fontSize: '.62rem', fontFamily: 'var(--mono)', color: 'var(--txt)' }}>{d.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.72rem', color: 'var(--txt)' }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--verm)' }} /> Despesas
            </div>
          </div>
        </div>

        <div className="gcol">
          {/* Top pratos */}
          <div className="panel">
            <div className="panel-hd"><div className="panel-title">Top Pratos</div><div className="panel-tag">por vendas</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {top.length === 0
                ? <div className="empty"><div className="empty-ico">🥘</div><div className="empty-title">Sem produtos</div></div>
                : top.map(p => (
                  <div key={p.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: '.35rem' }}>
                      <span style={{ fontWeight: 600 }}>{p.nome}</span>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--txt)' }}>{p.vendas} pedidos</span>
                    </div>
                    <div className="prog-bar">
                      <div className="prog-fill" style={{ width: `${Math.round((p.vendas / maxVendas) * 100)}%` }} />
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>

      <div className="g2">
        {/* Alertas estoque */}
        <div className="panel">
          <div className="panel-hd">
            <div className="panel-title">⚠️ Alertas de Estoque</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
            {dados.estoque.filter(i => i.qty < i.min).slice(0, 5).map(i => (
              <div key={i.id} className={`alert-item ${i.qty === 0 ? 'out' : 'low'}`}>
                <div className="ai-emoji">{i.qty === 0 ? '🚨' : '⚠️'}</div>
                <div className="ai-info">
                  <div className="ai-name">{i.nome}</div>
                  <div className="ai-desc">Atual: {i.qty}{i.unit} · Mín: {i.min}{i.unit}</div>
                </div>
              </div>
            ))}
            {alertas === 0 && <div className="empty"><div className="empty-ico">✅</div><div className="empty-title">Estoque ok!</div></div>}
          </div>
        </div>

        {/* Últimas movimentações */}
        <div className="panel">
          <div className="panel-hd"><div className="panel-title">🔄 Últimas Movimentações</div></div>
          <div className="mov-list">
            {dados.movs.slice(0, 6).map(m => (
              <div key={m.id} className="mov-item">
                <div className={`mv-dot ${m.tipo}`} />
                <div className="mv-info">
                  <div className="mv-name">{m.nome}</div>
                  <div className="mv-date">{D(m.data)}{m.obs ? ' · ' + m.obs : ''}</div>
                </div>
                <div className={`mv-val ${m.tipo}`}>{m.tipo === 'entrada' ? '+' : '-'}{m.qty}</div>
              </div>
            ))}
            {dados.movs.length === 0 && <div className="empty"><div className="empty-ico">📋</div><div className="empty-title">Nenhuma movimentação</div></div>}
          </div>
        </div>
      </div>
    </Layout>
  )
}
