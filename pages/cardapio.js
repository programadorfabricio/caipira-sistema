// pages/cardapio.js
import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import StatCard from '@/components/StatCard'
import { R, margem, margemColor } from '@/lib/helpers'
import { getProdutos } from '@/lib/db'

export default function Cardapio() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading]   = useState(true)
  const [srch, setSrch]         = useState('')
  const [catF, setCatF]         = useState('')

  useEffect(() => { getProdutos().then(r => { if (r.data) setProdutos(r.data); setLoading(false) }) }, [])

  const filtrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(srch.toLowerCase()) && (!catF || p.cat === catF)
  )

  const maisLucrativo = produtos.length ? produtos.reduce((a, b) => margem(b.preco, b.custo) > margem(a.preco, a.custo) ? b : a, produtos[0]) : null
  const maisVendido   = produtos.length ? produtos.reduce((a, b) => b.vendas > a.vendas ? b : a, produtos[0]) : null
  const ticketMedio   = produtos.length ? produtos.reduce((s, p) => s + Number(p.preco), 0) / produtos.length : 0

  if (loading) return <Layout title="Cardápio"><div className="loading-overlay"><div className="loading-icon">🌽</div></div></Layout>

  return (
    <Layout title="Cardápio">
      <div className="ph">
        <div><h2>Cardápio</h2><div className="ph-sub">Pratos com custo, preço e margem</div></div>
      </div>

      <div className="sg">
        <StatCard label="Total de Pratos" value={produtos.length} />
        <StatCard label="Mais Vendido"    value={maisVendido?.nome || '—'}  detail={`${maisVendido?.vendas || 0} pedidos`} color="ora" glow />
        <StatCard label="Mais Lucrativo"  value={maisLucrativo?.nome || '—'} detail={`${maisLucrativo ? margem(maisLucrativo.preco, maisLucrativo.custo) : 0}% margem`} color="vd" />
        <StatCard label="Ticket Médio"    value={R(ticketMedio)} color="az" />
      </div>

      <div className="panel">
        <div className="search-row">
          <input placeholder="🔍 Buscar prato..." value={srch} onChange={e => setSrch(e.target.value)}/>
          <select value={catF} onChange={e => setCatF(e.target.value)}>
            <option value="">Todas categorias</option>
            {['Marmitas','Pratos Feitos','Bebidas','Sobremesas'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Prato</th><th>Categoria</th><th>Preço Venda</th><th>Custo Prod.</th><th>Margem</th><th>Destaque</th></tr></thead>
            <tbody>
              {filtrados.length === 0
                ? <tr><td colSpan="6"><div className="empty"><div className="empty-ico">🍽️</div><div className="empty-title">Nenhum prato</div></div></td></tr>
                : filtrados.map(p => {
                    const mg = margem(p.preco, p.custo)
                    const destaque = maisLucrativo?.id === p.id ? '🏆 Mais lucrativo' : maisVendido?.id === p.id ? '⭐ Mais vendido' : ''
                    return (
                      <tr key={p.id}>
                        <td><strong>{p.nome}</strong></td>
                        <td>{p.cat}</td>
                        <td style={{ fontFamily: 'var(--mono)' }}>{R(p.preco)}</td>
                        <td style={{ fontFamily: 'var(--mono)', color: 'var(--txt)' }}>{R(p.custo)}</td>
                        <td>
                          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: margemColor(mg) }}>{mg}%</span>
                          <div className="margem-bar" style={{ width: 80 }}><div className="margem-fill" style={{ width: `${Math.min(100,mg)}%`, background: margemColor(mg) }}/></div>
                        </td>
                        <td>{destaque && <span className="badge alta">{destaque}</span>}</td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
