// pages/estoque.js
import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import StatCard from '@/components/StatCard'
import { R, D, hoje, statusEstoque } from '@/lib/helpers'
import { getEstoque, addEstoque, updateEstoque, deleteEstoque, getMovimentacoes, addMovimentacao } from '@/lib/db'

export default function Estoque() {
  const [itens, setItens]   = useState([])
  const [movs, setMovs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [srch, setSrch]     = useState('')
  const [catF, setCatF]     = useState('')
  const [stsF, setStsF]     = useState('')
  const [modal, setModal]   = useState(null)
  const [editId, setEditId] = useState(null)

  const [form, setForm] = useState({ nome: '', cat: 'Grãos', qty: '', min: '', unit: 'kg', preco: '' })
  const [movForm, setMovForm] = useState({ tipo: 'entrada', item_id: '', qty: '', obs: '', data: hoje() })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [e, m] = await Promise.all([getEstoque(), getMovimentacoes(20)])
    if (e.data) setItens(e.data)
    if (m.data) setMovs(m.data)
    setLoading(false)
  }

  function abrirNovo() {
    setEditId(null)
    setForm({ nome: '', cat: 'Grãos', qty: '', min: '', unit: 'kg', preco: '' })
    setModal('item')
  }

  function abrirEditar(item) {
    setEditId(item.id)
    setForm({ nome: item.nome, cat: item.cat, qty: item.qty, min: item.min, unit: item.unit, preco: item.preco })
    setModal('item')
  }

  async function salvar() {
    if (!form.nome.trim()) return alert('Nome obrigatório!')
    const dados = { nome: form.nome.trim(), cat: form.cat, qty: Number(form.qty)||0, min: Number(form.min)||0, unit: form.unit, preco: Number(form.preco)||0 }
    if (editId) {
      const { data } = await updateEstoque(editId, dados)
      if (data) setItens(prev => prev.map(i => i.id === editId ? data : i))
    } else {
      const { data } = await addEstoque(dados)
      if (data) setItens(prev => [...prev, data])
    }
    setModal(null)
  }

  async function excluir(id) {
    if (!confirm('Remover item?')) return
    await deleteEstoque(id)
    setItens(prev => prev.filter(i => i.id !== id))
  }

  async function salvarMov() {
    if (!movForm.item_id) return alert('Selecione um item!')
    const qty = Number(movForm.qty)
    if (!qty || qty <= 0) return alert('Quantidade inválida!')
    const item = itens.find(i => i.id == movForm.item_id)
    if (!item) return
    if (movForm.tipo === 'saida' && qty > item.qty) {
      if (!confirm(`Estoque atual: ${item.qty}${item.unit}. Continuar?`)) return
    }
    const novaQty = movForm.tipo === 'entrada' ? item.qty + qty : Math.max(0, item.qty - qty)
    await updateEstoque(item.id, { qty: novaQty })
    const { data: novaMov } = await addMovimentacao({ item_id: item.id, nome: item.nome, tipo: movForm.tipo, qty, data: movForm.data, obs: movForm.obs })
    setItens(prev => prev.map(i => i.id === item.id ? { ...i, qty: novaQty } : i))
    if (novaMov) setMovs(prev => [novaMov, ...prev])
    setMovForm({ tipo: 'entrada', item_id: '', qty: '', obs: '', data: hoje() })
    setModal(null)
  }

  const filtrados = itens.filter(i => {
    const ms  = i.nome.toLowerCase().includes(srch.toLowerCase())
    const mc  = !catF || i.cat === catF
    const ss  = statusEstoque(i)
    const mst = !stsF || ss.cls === stsF
    return ms && mc && mst
  })

  const tot = itens.length
  const low = itens.filter(i => i.qty > 0 && i.qty < i.min).length
  const out = itens.filter(i => i.qty === 0).length
  const alertas = low + out

  if (loading) return <Layout title="Estoque" alertas={0}><div className="loading-overlay"><div className="loading-icon">🌽</div></div></Layout>

  return (
    <Layout title="Estoque" alertas={alertas}>
      <div className="ph">
        <div><h2>Estoque</h2><div className="ph-sub">Controle de ingredientes e insumos</div></div>
        <div className="ph-actions">
          <button className="btn btn-vd btn-sm" onClick={() => { setMovForm(f => ({ ...f, tipo: 'entrada' })); setModal('mov') }}>↑ Entrada</button>
          <button className="btn btn-vm btn-sm" onClick={() => { setMovForm(f => ({ ...f, tipo: 'saida'   })); setModal('mov') }}>↓ Saída</button>
          <button className="btn btn-ora" onClick={abrirNovo}>+ Novo Item</button>
        </div>
      </div>

      <div className="sg">
        <StatCard label="Total de Itens"  value={tot}  detail="cadastrados" />
        <StatCard label="OK"              value={tot-low-out} detail="adequados" color="vd" />
        <StatCard label="Estoque Baixo"   value={low}  detail="abaixo do mínimo" color="am" />
        <StatCard label="Esgotados"       value={out}  detail="reposição urgente" color="vm" />
      </div>

      <div className="panel">
        <div className="search-row">
          <input placeholder="🔍 Buscar item..." value={srch} onChange={e => setSrch(e.target.value)} />
          <select value={catF} onChange={e => setCatF(e.target.value)}>
            <option value="">Todas categorias</option>
            {['Carnes','Grãos','Laticínios','Hortifrúti','Bebidas','Temperos','Outros'].map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={stsF} onChange={e => setStsF(e.target.value)}>
            <option value="">Todos status</option>
            <option value="ok">OK</option>
            <option value="low">Baixo</option>
            <option value="out">Esgotado</option>
          </select>
        </div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Item</th><th>Categoria</th><th>Quantidade</th><th>Mínimo</th><th>Un.</th><th>Custo Unit.</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {filtrados.length === 0
                ? <tr><td colSpan="8"><div className="empty"><div className="empty-ico">📦</div><div className="empty-title">Nenhum item encontrado</div></div></td></tr>
                : filtrados.map(i => {
                    const s = statusEstoque(i)
                    return (
                      <tr key={i.id}>
                        <td><strong>{i.nome}</strong></td>
                        <td>{i.cat}</td>
                        <td style={{ fontFamily: 'var(--mono)' }}>{i.qty}</td>
                        <td style={{ fontFamily: 'var(--mono)' }}>{i.min}</td>
                        <td style={{ fontFamily: 'var(--mono)' }}>{i.unit}</td>
                        <td style={{ fontFamily: 'var(--mono)' }}>{R(i.preco)}</td>
                        <td><span className={`badge ${s.cls}`}>{s.label}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '.3rem' }}>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => abrirEditar(i)}>✏️</button>
                            <button className="btn btn-vm btn-icon btn-sm" onClick={() => excluir(i.id)}>🗑</button>
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

      {/* Movimentações recentes */}
      <div className="panel">
        <div className="panel-hd"><div className="panel-title">🔄 Movimentações Recentes</div></div>
        <div className="mov-list">
          {movs.slice(0, 10).map(m => (
            <div key={m.id} className="mov-item">
              <div className={`mv-dot ${m.tipo}`} />
              <div className="mv-info">
                <div className="mv-name">{m.nome} <span style={{ fontSize: '.7rem', color: 'var(--txt)' }}>({m.tipo})</span></div>
                <div className="mv-date">{D(m.data)}{m.obs ? ' · ' + m.obs : ''}</div>
              </div>
              <div className={`mv-val ${m.tipo}`}>{m.tipo === 'entrada' ? '+' : '-'}{m.qty} {itens.find(i => i.id === (m.item_id||m.itemId))?.unit || ''}</div>
            </div>
          ))}
          {movs.length === 0 && <div className="empty"><div className="empty-ico">🔄</div><div className="empty-title">Nenhuma movimentação</div></div>}
        </div>
      </div>

      {/* Modal item */}
      <Modal open={modal === 'item'} onClose={() => setModal(null)} title={editId ? 'Editar Item' : 'Novo Item'}
        actions={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-ora" onClick={salvar}>Salvar</button></>}>
        <div className="form-row">
          <div className="fg"><label>Nome *</label><input value={form.nome} onChange={e => setForm(f=>({...f,nome:e.target.value}))} placeholder="Ex: Arroz branco"/></div>
          <div className="fg"><label>Categoria</label>
            <select value={form.cat} onChange={e => setForm(f=>({...f,cat:e.target.value}))}>
              {['Carnes','Grãos','Laticínios','Hortifrúti','Bebidas','Temperos','Outros'].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="fg"><label>Qtd Atual</label><input type="number" value={form.qty} onChange={e => setForm(f=>({...f,qty:e.target.value}))} placeholder="0"/></div>
          <div className="fg"><label>Qtd Mínima</label><input type="number" value={form.min} onChange={e => setForm(f=>({...f,min:e.target.value}))} placeholder="0"/></div>
        </div>
        <div className="form-row">
          <div className="fg"><label>Unidade</label>
            <select value={form.unit} onChange={e => setForm(f=>({...f,unit:e.target.value}))}>
              {['kg','g','L','ml','un','cx','pct'].map(u=><option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="fg"><label>Custo Unitário (R$)</label><input type="number" value={form.preco} onChange={e => setForm(f=>({...f,preco:e.target.value}))} placeholder="0,00" step="0.01"/></div>
        </div>
      </Modal>

      {/* Modal movimentação */}
      <Modal open={modal === 'mov'} onClose={() => setModal(null)} title={movForm.tipo === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída'}
        actions={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-ora" onClick={salvarMov}>Registrar</button></>}>
        <div className="fg"><label>Item *</label>
          <select value={movForm.item_id} onChange={e => setMovForm(f=>({...f,item_id:e.target.value}))}>
            <option value="">Selecione...</option>
            {itens.map(i => <option key={i.id} value={i.id}>{i.nome} ({i.qty}{i.unit})</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="fg"><label>Quantidade *</label><input type="number" value={movForm.qty} onChange={e => setMovForm(f=>({...f,qty:e.target.value}))} placeholder="0" min="0.01" step="0.01"/></div>
          <div className="fg"><label>Data</label><input type="date" value={movForm.data} onChange={e => setMovForm(f=>({...f,data:e.target.value}))}/></div>
        </div>
        <div className="fg"><label>Observação</label><input value={movForm.obs} onChange={e => setMovForm(f=>({...f,obs:e.target.value}))} placeholder="Opcional"/></div>
      </Modal>
    </Layout>
  )
}
