// pages/cozinha.js — 👨‍🍳 Tela da cozinha com todos os pedidos pendentes

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { sb } from '@/lib/supabase'
import { hoje, TIPOS_PRATO } from '@/lib/helpers'

export default function Cozinha() {
  const [salao,   setSalao]   = useState([])
  const [balcao,  setBalcao]  = useState([])
  const [wpp,     setWpp]     = useState([])
  const [loading, setLoading] = useState(true)
  const [ultima,  setUltima]  = useState(null)

  useEffect(() => {
    carregar()
    const interval = setInterval(carregar, 30000)
    return () => clearInterval(interval)
  }, [])

  async function carregar() {
    const [{ data: s }, { data: b }, { data: w }] = await Promise.all([
      sb.from('comandas').select('*, comanda_itens(*)').eq('data', hoje()).in('status', ['aberta','pronta']).order('created_at'),
      sb.from('balcao_pedidos').select('*, balcao_itens(*)').eq('data', hoje()).in('status', ['aberto','pronto']).order('numero'),
      sb.from('wpp_pedidos').select('*, wpp_itens(*)').eq('data', hoje()).in('status', ['aberto','pronto']).order('created_at'),
    ])
    if (s) setSalao(s)
    if (b) setBalcao(b)
    if (w) setWpp(w)
    setLoading(false)
    setUltima(new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }))
  }

  async function marcarPronto(tabela, id, origem) {
    await sb.from(tabela).update({ status: origem === 'salao' ? 'pronta' : 'pronto' }).eq('id', id)
    carregar()
  }

  // badge de pagamento
  function BadgePag({ forma }) {
    if (forma) return (
      <span style={{ fontSize:'.68rem', fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#1a3d2e', color:'#22c55e' }}>
        💰 {forma}
      </span>
    )
    return (
      <span style={{ fontSize:'.68rem', fontWeight:700, padding:'2px 8px', borderRadius:20, background:'#3d2a1a', color:'#f5a623' }}>
        ⏳ Pagar depois
      </span>
    )
  }

  const totalPendentes = salao.filter(p => p.status==='aberta').length +
    balcao.filter(p => p.status==='aberto').length +
    wpp.filter(p => p.status==='aberto').length

  if (loading) return (
    <Layout title="Cozinha">
      <div className="loading-overlay"><div className="loading-icon">👨‍🍳</div><div className="loading-txt">Carregando...</div></div>
    </Layout>
  )

  return (
    <Layout title="Cozinha">
      <div className="ph">
        <div>
          <h2>Cozinha 👨‍🍳</h2>
          <div className="ph-sub">{totalPendentes} pedido(s) para preparar · Atualizado às {ultima}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={carregar}>🔄 Atualizar</button>
      </div>

      {totalPendentes === 0 && (
        <div className="empty" style={{ padding:'4rem 1rem' }}>
          <div className="empty-ico">✅</div>
          <div className="empty-title">Tudo em dia!</div>
          <div className="empty-sub">Nenhum pedido pendente no momento.</div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'1rem' }}>

        {/* SALÃO */}
        {salao.map(c => (
          <div key={c.id} style={{
            background: c.status==='pronta' ? 'rgba(46,204,113,.08)' : 'var(--c1)',
            border: `2px solid ${c.status==='pronta' ? 'var(--verde)' : 'var(--ora)'}`,
            borderRadius:14, padding:'1.2rem',
            animation: c.status==='aberta' ? 'pulse 2s infinite' : 'none'
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'.6rem' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
                  <span style={{ fontSize:'1.1rem' }}>🍽️</span>
                  <span style={{ fontWeight:800, color:'var(--ora)', fontSize:'1rem' }}>Mesa {c.mesa}</span>
                </div>
              </div>
              <span style={{ fontSize:'.65rem', fontFamily:'var(--mono)', color:'var(--txt)' }}>
                {new Date(c.created_at).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
              </span>
            </div>

            {/* badge pagamento */}
            <div style={{ marginBottom:'.7rem' }}>
              <BadgePag forma={c.forma_pagamento} />
            </div>

            <div style={{ background:'var(--c2)', borderRadius:9, padding:'.7rem .9rem', marginBottom:'.8rem' }}>
              <div style={{ fontWeight:700, fontSize:'.9rem' }}>
                {TIPOS_PRATO.find(t=>t.key===c.tipo_prato)?.ico} {c.tipo_prato} {c.tamanho}
              </div>
              <div style={{ fontSize:'.82rem', color:'var(--txt)', marginTop:'.2rem' }}>🍖 {c.misturas}</div>
              {c.acompanhamentos && <div style={{ fontSize:'.78rem', color:'var(--azul)', marginTop:'.15rem' }}>🍚 {c.acompanhamentos}</div>}
              {c.base && <div style={{ fontSize:'.78rem', color:'var(--txt)', marginTop:'.15rem' }}>🍚 {c.base}</div>}
              {c.salada && <div style={{ fontSize:'.78rem', color:'var(--verde)', marginTop:'.15rem' }}>🥬 {c.salada}</div>}
              {c.obs && <div style={{ fontSize:'.75rem', color:'var(--amar)', marginTop:'.3rem', fontWeight:600 }}>⚠️ {c.obs}</div>}
            </div>

            {(c.comanda_itens||[]).length > 0 && (
              <div style={{ marginBottom:'.8rem' }}>
                <div style={{ fontSize:'.68rem', fontWeight:700, color:'var(--txt)', textTransform:'uppercase', marginBottom:'.3rem' }}>Extras</div>
                {c.comanda_itens.map((item,i) => (
                  <div key={i} style={{ fontSize:'.8rem', color:'var(--txt)' }}>• {item.quantidade}x {item.nome}</div>
                ))}
              </div>
            )}

            {c.status === 'aberta' && (
              <button className="btn btn-vd" style={{ width:'100%', justifyContent:'center' }} onClick={() => marcarPronto('comandas', c.id, 'salao')}>
                ✅ Marcar Pronto
              </button>
            )}
            {c.status === 'pronta' && (
              <div style={{ textAlign:'center', fontSize:'.85rem', color:'var(--verde)', fontWeight:700 }}>✅ Pronto — aguardando garçom</div>
            )}
          </div>
        ))}

        {/* BALCÃO */}
        {balcao.map(p => (
          <div key={p.id} style={{
            background: p.status==='pronto' ? 'rgba(46,204,113,.08)' : 'var(--c1)',
            border: `2px solid ${p.status==='pronto' ? 'var(--verde)' : 'var(--amar)'}`,
            borderRadius:14, padding:'1.2rem'
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'.6rem' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
                  <span style={{ fontSize:'1.1rem' }}>🥡</span>
                  <span style={{ fontWeight:800, color:'var(--amar)', fontSize:'1.3rem', fontFamily:'var(--mono)' }}>#{p.numero}</span>
                </div>
                <div style={{ fontSize:'.72rem', color:'var(--txt)' }}>Balcão — {p.tipo_prato}</div>
              </div>
              <span style={{ fontSize:'.65rem', fontFamily:'var(--mono)', color:'var(--txt)' }}>
                {new Date(p.created_at).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
              </span>
            </div>

            {/* badge pagamento */}
            <div style={{ marginBottom:'.7rem' }}>
              <BadgePag forma={p.forma_pagamento} />
            </div>

            <div style={{ background:'var(--c2)', borderRadius:9, padding:'.7rem .9rem', marginBottom:'.8rem' }}>
              <div style={{ fontWeight:700, fontSize:'.9rem' }}>
                {TIPOS_PRATO.find(t=>t.key===p.tipo_prato)?.ico} {p.tipo_prato} {p.tamanho}
              </div>
              <div style={{ fontSize:'.82rem', color:'var(--txt)', marginTop:'.2rem' }}>🍖 {p.misturas}</div>
              {p.acompanhamentos && <div style={{ fontSize:'.78rem', color:'var(--azul)', marginTop:'.15rem' }}>🍚 {p.acompanhamentos}</div>}
              {p.base && <div style={{ fontSize:'.78rem', color:'var(--txt)', marginTop:'.15rem' }}>🍚 {p.base}</div>}
              {p.salada && <div style={{ fontSize:'.78rem', color:'var(--verde)', marginTop:'.15rem' }}>🥬 {p.salada}</div>}
              {p.obs && <div style={{ fontSize:'.75rem', color:'var(--amar)', marginTop:'.3rem', fontWeight:600 }}>⚠️ {p.obs}</div>}
            </div>

            {(p.balcao_itens||[]).length > 0 && (
              <div style={{ marginBottom:'.8rem' }}>
                {p.balcao_itens.map((item,i) => (
                  <div key={i} style={{ fontSize:'.8rem', color:'var(--txt)' }}>• {item.tipo==='bebida'?'🥤':'➕'} {item.nome}</div>
                ))}
              </div>
            )}

            {p.status === 'aberto' && (
              <button className="btn btn-vd" style={{ width:'100%', justifyContent:'center' }} onClick={() => marcarPronto('balcao_pedidos', p.id, 'balcao')}>
                ✅ Pronto — Chamar #{p.numero}
              </button>
            )}
            {p.status === 'pronto' && (
              <div style={{ textAlign:'center', fontSize:'.85rem', color:'var(--verde)', fontWeight:700 }}>✅ Pronto — Chamar #{p.numero}</div>
            )}
          </div>
        ))}

        {/* WHATSAPP */}
        {wpp.map(p => (
          <div key={p.id} style={{
            background: p.status==='pronto' ? 'rgba(46,204,113,.08)' : 'var(--c1)',
            border: `2px solid ${p.status==='pronto' ? 'var(--verde)' : '#25D366'}`,
            borderRadius:14, padding:'1.2rem'
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'.6rem' }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'.5rem' }}>
                  <span style={{ fontSize:'1.1rem' }}>{p.tipo_entrega==='entrega'?'🛵':'🏃'}</span>
                  <span style={{ fontWeight:800, color:'#25D366', fontSize:'1rem' }}>{p.cliente_nome}</span>
                </div>
                <div style={{ fontSize:'.72rem', color:'var(--txt)' }}>{p.tipo_entrega==='entrega'?`Entrega — ${p.bairro}`:'Retirada no balcão'}</div>
                {p.horario && <div style={{ fontSize:'.72rem', color:'var(--amar)' }}>🕐 {p.horario}</div>}
              </div>
              <span style={{ fontSize:'.65rem', fontFamily:'var(--mono)', color:'var(--txt)' }}>
                {new Date(p.created_at).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
              </span>
            </div>

            {/* badge pagamento */}
            <div style={{ marginBottom:'.7rem' }}>
              <BadgePag forma={p.forma_pagamento} />
            </div>

            <div style={{ background:'var(--c2)', borderRadius:9, padding:'.7rem .9rem', marginBottom:'.8rem' }}>
              <div style={{ fontWeight:700, fontSize:'.9rem' }}>
                {TIPOS_PRATO.find(t=>t.key===p.tipo_prato)?.ico} {p.tipo_prato} {p.tamanho}
              </div>
              <div style={{ fontSize:'.82rem', color:'var(--txt)', marginTop:'.2rem' }}>🍖 {p.misturas}</div>
              {p.acompanhamentos && <div style={{ fontSize:'.78rem', color:'var(--azul)', marginTop:'.15rem' }}>🍚 {p.acompanhamentos}</div>}
              {p.base && <div style={{ fontSize:'.78rem', color:'var(--txt)', marginTop:'.15rem' }}>🍚 {p.base}</div>}
              {p.salada && <div style={{ fontSize:'.78rem', color:'var(--verde)', marginTop:'.15rem' }}>🥬 {p.salada}</div>}
              {p.obs && <div style={{ fontSize:'.75rem', color:'var(--amar)', marginTop:'.3rem', fontWeight:600 }}>⚠️ {p.obs}</div>}
            </div>

            {(p.wpp_itens||[]).length > 0 && (
              <div style={{ marginBottom:'.8rem' }}>
                {p.wpp_itens.map((item,i) => (
                  <div key={i} style={{ fontSize:'.8rem', color:'var(--txt)' }}>• {item.tipo==='bebida'?'🥤':'➕'} {item.nome}</div>
                ))}
              </div>
            )}

            {p.status === 'aberto' && (
              <button className="btn btn-vd" style={{ width:'100%', justifyContent:'center' }} onClick={() => marcarPronto('wpp_pedidos', p.id, 'wpp')}>
                ✅ Marcar Pronto
              </button>
            )}
            {p.status === 'pronto' && (
              <div style={{ textAlign:'center', fontSize:'.85rem', color:'var(--verde)', fontWeight:700 }}>✅ Pronto — avisar cliente</div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,106,0,.3); }
          50% { box-shadow: 0 0 0 8px rgba(255,106,0,0); }
        }
      `}</style>
    </Layout>
  )
}