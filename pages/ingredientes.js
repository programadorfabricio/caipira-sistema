// pages/ingredientes.js
import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import { R } from '@/lib/helpers'
import { getIngredientes, addIngrediente, updateIngrediente, deleteIngrediente } from '@/lib/db'

export default function Ingredientes() {
  const [itens, setItens]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [editId, setEditId]   = useState(null)
  const [form, setForm]       = useState({ nome: '', unit: 'kg', custo: '', est: '' })

  useEffect(() => { getIngredientes().then(r => { if (r.data) setItens(r.data); setLoading(false) }) }, [])

  function abrirNovo()    { setEditId(null); setForm({ nome: '', unit: 'kg', custo: '', est: '' }); setModal(true) }
  function abrirEditar(i) { setEditId(i.id); setForm({ nome: i.nome, unit: i.unit, custo: i.custo, est: i.est }); setModal(true) }

  async function salvar() {
    if (!form.nome.trim()) return alert('Nome obrigatório!')
    const dados = { nome: form.nome.trim(), unit: form.unit, custo: Number(form.custo)||0, est: Number(form.est)||0 }
    if (editId) {
      const { data } = await updateIngrediente(editId, dados)
      if (data) setItens(prev => prev.map(i => i.id === editId ? data : i))
    } else {
      const { data } = await addIngrediente(dados)
      if (data) setItens(prev => [...prev, data])
    }
    setModal(false)
  }

  async function excluir(id) {
    if (!confirm('Remover ingrediente?')) return
    await deleteIngrediente(id)
    setItens(prev => prev.filter(i => i.id !== id))
  }

  if (loading) return <Layout title="Ingredientes"><div className="loading-overlay"><div className="loading-icon">🌽</div></div></Layout>

  return (
    <Layout title="Ingredientes">
      <div className="ph">
        <div><h2>Ingredientes</h2><div className="ph-sub">Cadastro de insumos com custo unitário</div></div>
        <div className="ph-actions"><button className="btn btn-ora" onClick={abrirNovo}>+ Novo Ingrediente</button></div>
      </div>
      <div className="panel">
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Nome</th><th>Unidade</th><th>Custo Unit. (R$)</th><th>Estoque Atual</th><th>Ações</th></tr></thead>
            <tbody>
              {itens.length === 0
                ? <tr><td colSpan="5"><div className="empty"><div className="empty-ico">🥕</div><div className="empty-title">Nenhum ingrediente</div></div></td></tr>
                : itens.map(i => (
                  <tr key={i.id}>
                    <td><strong>{i.nome}</strong></td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{i.unit}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{R(i.custo)}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>{i.est} {i.unit}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '.3rem' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => abrirEditar(i)}>✏️</button>
                        <button className="btn btn-vm btn-icon btn-sm"    onClick={() => excluir(i.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Ingrediente' : 'Novo Ingrediente'}
        actions={<><button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button><button className="btn btn-ora" onClick={salvar}>Salvar</button></>}>
        <div className="form-row">
          <div className="fg"><label>Nome *</label><input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Feijão carioca"/></div>
          <div className="fg"><label>Unidade</label>
            <select value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}>
              {['kg','g','L','ml','un','cx','pct'].map(u=><option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="fg"><label>Custo Unitário (R$) *</label><input type="number" value={form.custo} onChange={e=>setForm(f=>({...f,custo:e.target.value}))} placeholder="0,00" step="0.01"/></div>
          <div className="fg"><label>Estoque Atual</label><input type="number" value={form.est} onChange={e=>setForm(f=>({...f,est:e.target.value}))} placeholder="0" step="0.01"/></div>
        </div>
      </Modal>
    </Layout>
  )
}
