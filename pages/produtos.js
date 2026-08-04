// pages/produtos.js
import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import { R, margem, margemColor } from '@/lib/helpers'
import { getProdutos, addProduto, updateProduto, deleteProduto } from '@/lib/db'

export default function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading]   = useState(true)
  const [srch, setSrch]         = useState('')
  const [modal, setModal]       = useState(false)
  const [editId, setEditId]     = useState(null)
  const [form, setForm]         = useState({ nome: '', cat: 'Marmitas', preco: '', custo: '' })

  useEffect(() => { getProdutos().then(r => { if (r.data) setProdutos(r.data); setLoading(false) }) }, [])

  function abrirNovo()   { setEditId(null); setForm({ nome: '', cat: 'Marmitas', preco: '', custo: '' }); setModal(true) }
  function abrirEditar(p){ setEditId(p.id); setForm({ nome: p.nome, cat: p.cat, preco: p.preco, custo: p.custo }); setModal(true) }

  async function salvar() {
    if (!form.nome.trim() || !form.preco) return alert('Nome e preço obrigatórios!')
    const dados = { nome: form.nome.trim(), cat: form.cat, preco: Number(form.preco), custo: Number(form.custo)||0, vendas: 0 }
    if (editId) {
      const { data } = await updateProduto(editId, dados)
      if (data) setProdutos(prev => prev.map(p => p.id === editId ? data : p))
    } else {
      const { data } = await addProduto(dados)
      if (data) setProdutos(prev => [...prev, data])
    }
    setModal(false)
  }

  async function excluir(id) {
    if (!confirm('Remover produto?')) return
    await deleteProduto(id)
    setProdutos(prev => prev.filter(p => p.id !== id))
  }

  const m = margem(Number(form.preco), Number(form.custo))
  const filtrados = produtos.filter(p => p.nome.toLowerCase().includes(srch.toLowerCase()))

  if (loading) return <Layout title="Produtos"><div className="loading-overlay"><div className="loading-icon">🌽</div></div></Layout>

  return (
    <Layout title="Produtos">
      <div className="ph">
        <div><h2>Produtos</h2><div className="ph-sub">Cadastro com cálculo de margem automático</div></div>
        <div className="ph-actions"><button className="btn btn-ora" onClick={abrirNovo}>+ Novo Produto</button></div>
      </div>
      <div className="panel">
        <div className="search-row"><input placeholder="🔍 Buscar produto..." value={srch} onChange={e => setSrch(e.target.value)}/></div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Nome</th><th>Categoria</th><th>Preço Venda</th><th>Custo Prod.</th><th>Margem</th><th>Ações</th></tr></thead>
            <tbody>
              {filtrados.length === 0
                ? <tr><td colSpan="6"><div className="empty"><div className="empty-ico">🥘</div><div className="empty-title">Nenhum produto</div></div></td></tr>
                : filtrados.map(p => {
                    const mg = margem(p.preco, p.custo)
                    return (
                      <tr key={p.id}>
                        <td><strong>{p.nome}</strong></td>
                        <td>{p.cat}</td>
                        <td style={{ fontFamily: 'var(--mono)' }}>{R(p.preco)}</td>
                        <td style={{ fontFamily: 'var(--mono)' }}>{R(p.custo)}</td>
                        <td>
                          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: margemColor(mg) }}>{mg}%</span>
                          <div className="margem-bar" style={{ width: 80 }}><div className="margem-fill" style={{ width: `${Math.min(100,mg)}%`, background: margemColor(mg) }}/></div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '.3rem' }}>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => abrirEditar(p)}>✏️</button>
                            <button className="btn btn-vm btn-icon btn-sm"    onClick={() => excluir(p.id)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Produto' : 'Novo Produto'}
        actions={<><button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-ora" onClick={salvar}>Salvar</button></>}>
        <div className="form-row">
          <div className="fg"><label>Nome *</label><input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Marmita Caipira"/></div>
          <div className="fg"><label>Categoria</label>
            <select value={form.cat} onChange={e=>setForm(f=>({...f,cat:e.target.value}))}>
              {['Marmitas','Pratos Feitos','Bebidas','Sobremesas'].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="fg"><label>Preço de Venda (R$) *</label><input type="number" value={form.preco} onChange={e=>setForm(f=>({...f,preco:e.target.value}))} placeholder="0,00" step="0.01"/></div>
          <div className="fg"><label>Custo de Produção (R$)</label><input type="number" value={form.custo} onChange={e=>setForm(f=>({...f,custo:e.target.value}))} placeholder="0,00" step="0.01"/></div>
        </div>
        {form.preco && (
          <div style={{ background: 'var(--c2)', borderRadius: 9, padding: '.9rem 1rem' }}>
            <div style={{ fontSize: '.7rem', color: 'var(--txt)', marginBottom: '.4rem', textTransform: 'uppercase', letterSpacing: '.1em' }}>Margem de Lucro</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--mono)', color: margemColor(m) }}>{m}%</div>
            <div className="margem-bar"><div className="margem-fill" style={{ width: `${Math.min(100,m)}%`, background: margemColor(m) }}/></div>
          </div>
        )}
      </Modal>
    </Layout>
  )
}
