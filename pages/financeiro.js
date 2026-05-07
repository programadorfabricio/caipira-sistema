// pages/financeiro.js — 💰 Controle financeiro

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import { sb } from '@/lib/supabase'
import { R, hoje } from '@/lib/helpers'

const CATEGORIAS_REC  = ['Vendas','Salão','Balcão','WhatsApp','Outros']
const CATEGORIAS_DESP = ['Ingredientes','Funcionários','Aluguel','Energia','Água','Gás','Manutenção','Outros']
const PAGAMENTOS      = ['PIX','Dinheiro','Débito','Crédito','Vale Refeição','Sodexo']

export default function Financeiro() {
  const [movs, setMovs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [periodo, setPeriodo] = useState('hoje')

  const [form, setForm] = useState({
    tipo:'receita', descricao:'', valor:'',
    categoria:'Outros', pagamento:'', data: hoje(), obs:''
  })

  useEffect(() => { carregar() }, [periodo])

  async function carregar() {
    setLoading(true)
    const dataHoje = hoje()
    let query = sb.from('financeiro').select('*').order('data', { ascending: false }).order('created_at', { ascending: false })

    if (periodo === 'hoje')    query = query.eq('data', dataHoje)
    if (periodo === 'semana')  query = query.gte('data', getDataAtras(7))
    if (periodo === 'mes')     query = query.gte('data', getDataAtras(30))

    const { data } = await query
    if (data) setMovs(data)
    setLoading(false)
  }

  function getDataAtras(dias) {
    const d = new Date()
    d.setDate(d.getDate() - dias)
    return d.toISOString().slice(0, 10)
  }

  async function salvar() {
    if (!form.descricao.trim()) return alert('Descrição obrigatória!')
    if (!form.valor || Number(form.valor) <= 0) return alert('Valor obrigatório!')

    await sb.from('financeiro').insert({
      tipo:      form.tipo,
      descricao: form.descricao.trim(),
      valor:     Number(form.valor),
      categoria: form.categoria,
      pagamento: form.pagamento,
      data:      form.data,
      origem:    'manual',
    })

    setModal(null)
    setForm({ tipo:'receita', descricao:'', valor:'', categoria:'Outros', pagamento:'', data: hoje(), obs:'' })
    carregar()
  }

  async function deletar(id) {
    if (!confirm('Remover esta movimentação?')) return
    await sb.from('financeiro').delete().eq('id', id)
    carregar()
  }

  const receitas  = movs.filter(m => m.tipo === 'receita').reduce((s, m) => s + m.valor, 0)
  const despesas  = movs.filter(m => m.tipo === 'despesa').reduce((s, m) => s + m.valor, 0)
  const lucro     = receitas - despesas
  const categorias = form.tipo === 'receita' ? CATEGORIAS_REC : CATEGORIAS_DESP

  if (loading) return (
    <Layout title="Financeiro">
      <div className="loading-overlay"><div className="loading-icon">💰</div><div className="loading-txt">Carregando...</div></div>
    </Layout>
  )

  return (
    <Layout title="Financeiro">
      <div className="ph">
        <div><h2>Financeiro 💰</h2></div>
        <div className="ph-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => { setForm(f => ({...f, tipo:'despesa'})); setModal('novo') }}>− Despesa</button>
          <button className="btn btn-ora" onClick={() => { setForm(f => ({...f, tipo:'receita'})); setModal('novo') }}>+ Receita</button>
        </div>
      </div>

      {/* Cards */}
      <div className="sg" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:'1.5rem' }}>
        <div className="sc"><div className="sc-glow"/><div className="sc-label">Receitas</div><div className="sc-val vd">{R(receitas)}</div></div>
        <div className="sc"><div className="sc-label">Despesas</div><div className="sc-val vm">{R(despesas)}</div></div>
        <div className="sc"><div className="sc-glow"/><div className="sc-label">Lucro</div><div className={`sc-val ${lucro >= 0 ? 'vd' : 'vm'}`}>{R(lucro)}</div></div>
      </div>

      {/* Período */}
      <div className="period-tabs" style={{ marginBottom:'1.2rem' }}>
        {[['hoje','Hoje'],['semana','7 dias'],['mes','30 dias'],['tudo','Tudo']].map(([v,l]) => (
          <button key={v} className={`ptab${periodo===v?' active':''}`} onClick={() => setPeriodo(v)}>{l}</button>
        ))}
      </div>

      {/* Lista */}
      <div className="panel">
        <div className="panel-hd">
          <div className="panel-title">Movimentações</div>
          <div className="panel-tag">{movs.length} registros</div>
        </div>

        {movs.length === 0 && (
          <div className="empty"><div className="empty-ico">💸</div><div className="empty-title">Nenhuma movimentação</div></div>
        )}

        <div className="mov-list">
          {movs.map(m => (
            <div key={m.id} className="mov-item">
              <div className={`mv-dot ${m.tipo}`} />
              <div className="mv-info">
                <div className="mv-name">{m.descricao}</div>
                <div className="mv-date">
                  {m.data} · {m.categoria}
                  {m.pagamento ? ` · ${m.pagamento}` : ''}
                  {m.origem !== 'manual' ? ` · 🤖 ${m.origem}` : ''}
                </div>
              </div>
              <div className={`mv-val ${m.tipo}`}>
                {m.tipo === 'receita' ? '+' : '-'}{R(m.valor)}
              </div>
              {m.origem === 'manual' && (
                <button className="btn btn-vm btn-icon btn-sm" onClick={() => deletar(m.id)}>✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal novo */}
      <Modal open={!!modal} onClose={() => setModal(null)}
        title={form.tipo === 'receita' ? '+ Nova Receita' : '− Nova Despesa'}
        actions={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button><button className={`btn ${form.tipo==='receita'?'btn-vd':'btn-vm'}`} onClick={salvar}>Salvar</button></>}>

        <div className="fg">
          <label>Tipo</label>
          <div style={{ display:'flex', gap:'.6rem' }}>
            <button className={`btn ${form.tipo==='receita'?'btn-vd':'btn-ghost'}`} style={{ flex:1 }} onClick={() => setForm(f => ({...f, tipo:'receita', categoria:'Outros'}))}>💚 Receita</button>
            <button className={`btn ${form.tipo==='despesa'?'btn-vm':'btn-ghost'}`} style={{ flex:1 }} onClick={() => setForm(f => ({...f, tipo:'despesa', categoria:'Outros'}))}>❌ Despesa</button>
          </div>
        </div>

        <div className="fg">
          <label>Descrição *</label>
          <input type="text" placeholder="Ex: Venda almoço, Compra de frango..." value={form.descricao} onChange={e => setForm(f => ({...f, descricao: e.target.value}))} />
        </div>

        <div className="form-row">
          <div className="fg">
            <label>Valor *</label>
            <input type="number" step="0.01" placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({...f, valor: e.target.value}))} />
          </div>
          <div className="fg">
            <label>Data</label>
            <input type="date" value={form.data} onChange={e => setForm(f => ({...f, data: e.target.value}))} />
          </div>
        </div>

        <div className="form-row">
          <div className="fg">
            <label>Categoria</label>
            <select value={form.categoria} onChange={e => setForm(f => ({...f, categoria: e.target.value}))}>
              {categorias.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="fg">
            <label>Pagamento</label>
            <select value={form.pagamento} onChange={e => setForm(f => ({...f, pagamento: e.target.value}))}>
              <option value="">Selecione...</option>
              {PAGAMENTOS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </Layout>
  )
}