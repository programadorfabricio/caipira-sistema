// pages/estoque.js — 📦 Controle de estoque

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import { sb } from '@/lib/supabase'
import { R } from '@/lib/helpers'

const CATEGORIAS = ['Carnes','Grãos','Verduras','Bebidas','Temperos','Limpeza','Doces e Sobremesas','Porcoes','Saladas','Outros']
const UNIDADES   = ['kg','g','l','ml','un','cx','maço','pacote']

export default function Estoque() {
  const [itens, setItens]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [itemAtivo, setItemAtivo] = useState(null)
  const [busca, setBusca]     = useState('')
  const [catFiltro, setCatFiltro] = useState('todos')

  const [form, setForm] = useState({
    nome:'', cat:'Outros', qty:0, min:0,
    unit:'un', preco_custo:0, preco_venda:0, venda_direta:false
  })
  const [movForm, setMovForm] = useState({ tipo:'entrada', quantidade:'', obs:'' })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await sb.from('estoque').select('*').order('cat').order('nome')
    if (data) setItens(data)
    setLoading(false)
  }

  async function salvar() {
    if (!form.nome.trim()) return alert('Nome obrigatório!')
    if (itemAtivo) {
      await sb.from('estoque').update({ ...form, nome: form.nome.trim() }).eq('id', itemAtivo.id)
    } else {
      await sb.from('estoque').insert({ ...form, nome: form.nome.trim() })
    }
    setModal(null); setItemAtivo(null)
    setForm({ nome:'', cat:'Outros', qty:0, min:0, unit:'un', preco_custo:0, preco_venda:0, venda_direta:false })
    carregar()
  }

  async function registrarMov() {
    if (!movForm.quantidade || Number(movForm.quantidade) <= 0) return alert('Quantidade obrigatória!')
    const qtd = Number(movForm.quantidade)
    const novaQty = movForm.tipo === 'entrada'
      ? (itemAtivo.qty || 0) + qtd
      : Math.max(0, (itemAtivo.qty || 0) - qtd)

    await sb.from('estoque').update({ qty: novaQty }).eq('id', itemAtivo.id)
    setModal(null); setItemAtivo(null)
    setMovForm({ tipo:'entrada', quantidade:'', obs:'' })
    carregar()
  }

  async function deletar(id) {
    if (!confirm('Remover este item do estoque?')) return
    await sb.from('estoque').delete().eq('id', id)
    carregar()
  }

  function abrirEditar(item) {
    setItemAtivo(item)
    setForm({ nome:item.nome, cat:item.cat, qty:item.qty, min:item.min, unit:item.unit, preco_custo:item.preco_custo||0, preco_venda:item.preco_venda||0, venda_direta:item.venda_direta||false })
    setModal('editar')
  }

  function abrirMov(item) {
    setItemAtivo(item)
    setMovForm({ tipo:'entrada', quantidade:'', obs:'' })
    setModal('mov')
  }

  const filtrados = itens
    .filter(i => catFiltro === 'todos' || i.cat === catFiltro)
    .filter(i => i.nome.toLowerCase().includes(busca.toLowerCase()))

  const alertas   = itens.filter(i => i.qty <= i.min)
  const esgotados = itens.filter(i => i.qty === 0)

  if (loading) return (
    <Layout title="Estoque">
      <div className="loading-overlay"><div className="loading-icon">📦</div><div className="loading-txt">Carregando...</div></div>
    </Layout>
  )

  return (
    <Layout title="Estoque">
      <div className="ph">
        <div>
          <h2>Estoque 📦</h2>
          <div className="ph-sub">{itens.length} itens · {alertas.length} com estoque baixo</div>
        </div>
        <button className="btn btn-ora" onClick={() => { setItemAtivo(null); setForm({ nome:'', cat:'Outros', qty:0, min:0, unit:'un', preco_custo:0, preco_venda:0, venda_direta:false }); setModal('editar') }}>+ Novo Item</button>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div style={{ background:'rgba(231,76,60,.08)', border:'1px solid rgba(231,76,60,.3)', borderRadius:10, padding:'1rem 1.2rem', marginBottom:'1.2rem' }}>
          <div style={{ fontWeight:700, color:'var(--verm)', marginBottom:'.5rem' }}>⚠️ Itens com estoque baixo ou esgotado:</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'.4rem' }}>
            {alertas.map(a => (
              <span key={a.id} style={{ background:'rgba(231,76,60,.15)', color:'var(--verm)', fontSize:'.75rem', padding:'.2rem .6rem', borderRadius:6, fontFamily:'var(--mono)' }}>
                {a.nome}: {a.qty}{a.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cards resumo */}
      <div className="sg" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:'1.2rem' }}>
        <div className="sc"><div className="sc-label">Total de Itens</div><div className="sc-val">{itens.length}</div></div>
        <div className="sc"><div className="sc-label">OK</div><div className="sc-val vd">{itens.filter(i=>i.qty>i.min).length}</div></div>
        <div className="sc"><div className="sc-label">Estoque Baixo</div><div className="sc-val am">{alertas.filter(a=>a.qty>0).length}</div></div>
        <div className="sc"><div className="sc-label">Esgotados</div><div className="sc-val vm">{esgotados.length}</div></div>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:'.6rem', marginBottom:'1rem', flexWrap:'wrap' }}>
        <input type="text" placeholder="🔍 Buscar item..." value={busca} onChange={e => setBusca(e.target.value)}
          style={{ flex:1, minWidth:160, padding:'.65rem .9rem', background:'var(--c2)', border:'1px solid var(--c3)', borderRadius:8, color:'var(--branco)', fontFamily:'var(--mono)', fontSize:'.82rem', outline:'none' }} />
        <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)}
          style={{ padding:'.65rem .9rem', background:'var(--c2)', border:'1px solid var(--c3)', borderRadius:8, color:'var(--branco)', fontFamily:'var(--mono)', fontSize:'.82rem', outline:'none' }}>
          <option value="todos">Todas categorias</option>
          {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Tabela */}
      <div className="panel" style={{ padding:0, overflow:'hidden' }}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Item</th>
                <th>Categoria</th>
                <th>Quantidade</th>
                <th>Mínimo</th>
                <th>Status</th>
                <th>Preço Venda</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign:'center', padding:'2rem', color:'var(--txt)' }}>Nenhum item encontrado</td></tr>
              )}
              {filtrados.map(item => {
                const status = item.qty === 0 ? 'out' : item.qty <= item.min ? 'low' : 'ok'
                const label  = item.qty === 0 ? 'Esgotado' : item.qty <= item.min ? 'Baixo' : 'Normal'
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight:600 }}>{item.nome}</td>
                    <td><span className="badge badge-info">{item.cat}</span></td>
                    <td style={{ fontFamily:'var(--mono)' }}>{item.qty} {item.unit}</td>
                    <td style={{ fontFamily:'var(--mono)', color:'var(--txt)' }}>{item.min} {item.unit}</td>
                    <td><span className={`badge ${status}`}>{label}</span></td>
                    <td style={{ fontFamily:'var(--mono)' }}>{item.preco_venda > 0 ? R(item.preco_venda) : '—'}</td>
                    <td>
                      <div style={{ display:'flex', gap:'.3rem' }}>
                        <button className="btn btn-vd btn-sm btn-icon" title="Entrada/Saída" onClick={() => abrirMov(item)}>±</button>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Editar" onClick={() => abrirEditar(item)}>✏️</button>
                        <button className="btn btn-vm btn-sm btn-icon" title="Remover" onClick={() => deletar(item.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal editar/criar */}
      <Modal open={modal==='editar'} onClose={() => { setModal(null); setItemAtivo(null) }}
        title={itemAtivo ? 'Editar Item' : 'Novo Item'}
        actions={<><button className="btn btn-ghost" onClick={() => { setModal(null); setItemAtivo(null) }}>Cancelar</button><button className="btn btn-ora" onClick={salvar}>Salvar</button></>}>

        <div className="fg">
          <label>Nome *</label>
          <input type="text" placeholder="Ex: Frango, Arroz..." value={form.nome} onChange={e => setForm(f => ({...f, nome: e.target.value}))} />
        </div>
        <div className="form-row">
          <div className="fg">
            <label>Categoria</label>
            <select value={form.cat} onChange={e => setForm(f => ({...f, cat: e.target.value}))}>
              {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="fg">
            <label>Unidade</label>
            <select value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))}>
              {UNIDADES.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="fg">
            <label>Quantidade atual</label>
            <input type="number" step="0.01" min="0" value={form.qty} onChange={e => setForm(f => ({...f, qty: Number(e.target.value)}))} />
          </div>
          <div className="fg">
            <label>Quantidade mínima (alerta)</label>
            <input type="number" step="0.01" min="0" value={form.min} onChange={e => setForm(f => ({...f, min: Number(e.target.value)}))} />
          </div>
        </div>
        <div className="form-row">
          <div className="fg">
            <label>Preço de custo</label>
            <input type="number" step="0.01" min="0" placeholder="0,00" value={form.preco_custo} onChange={e => setForm(f => ({...f, preco_custo: Number(e.target.value)}))} />
          </div>
          <div className="fg">
            <label>Preço de venda</label>
            <input type="number" step="0.01" min="0" placeholder="0,00" value={form.preco_venda} onChange={e => setForm(f => ({...f, preco_venda: Number(e.target.value)}))} />
          </div>
        </div>
        <div className="fg">
          <label style={{ display:'flex', alignItems:'center', gap:'.6rem', cursor:'pointer', userSelect:'none' }}>
            <div onClick={() => setForm(f => ({...f, venda_direta: !f.venda_direta}))}
              style={{ width:42, height:24, borderRadius:12, background: form.venda_direta ? 'var(--ora)' : 'var(--c3)', position:'relative', transition:'background .2s', flexShrink:0 }}>
              <div style={{ width:18, height:18, borderRadius:'50%', background:'#fff', position:'absolute', top:3, left: form.venda_direta ? 21 : 3, transition:'left .2s' }} />
            </div>
            <span style={{ fontWeight:600 }}>🛒 Aparece na tela de Vendas</span>
          </label>
          <div style={{ fontSize:'.75rem', color:'var(--txt)', marginTop:'.3rem' }}>
            Ative apenas para itens que são vendidos diretamente (refri, sobremesa, etc). Ingredientes como sal e frango devem ficar desativados.
          </div>
        </div>
      </Modal>

      {/* Modal movimentação */}
      <Modal open={modal==='mov'} onClose={() => { setModal(null); setItemAtivo(null) }}
        title={`Movimentação — ${itemAtivo?.nome}`}
        actions={<><button className="btn btn-ghost" onClick={() => { setModal(null); setItemAtivo(null) }}>Cancelar</button><button className="btn btn-ora" onClick={registrarMov}>Registrar</button></>}>

        <div style={{ background:'var(--c2)', borderRadius:10, padding:'1rem', marginBottom:'1rem', textAlign:'center' }}>
          <div style={{ fontSize:'.75rem', color:'var(--txt)', marginBottom:'.3rem' }}>Estoque atual</div>
          <div style={{ fontSize:'2rem', fontWeight:800, color:'var(--ora)', fontFamily:'var(--mono)' }}>{itemAtivo?.qty} {itemAtivo?.unit}</div>
        </div>

        <div className="fg">
          <label>Tipo</label>
          <div style={{ display:'flex', gap:'.6rem' }}>
            <button className={`btn ${movForm.tipo==='entrada'?'btn-vd':'btn-ghost'}`} style={{ flex:1 }} onClick={() => setMovForm(f => ({...f, tipo:'entrada'}))}>📥 Entrada</button>
            <button className={`btn ${movForm.tipo==='saida'?'btn-vm':'btn-ghost'}`} style={{ flex:1 }} onClick={() => setMovForm(f => ({...f, tipo:'saida'}))}>📤 Saída</button>
          </div>
        </div>
        <div className="fg">
          <label>Quantidade *</label>
          <input type="number" step="0.01" min="0" placeholder={`Quantidade em ${itemAtivo?.unit}`}
            value={movForm.quantidade} onChange={e => setMovForm(f => ({...f, quantidade: e.target.value}))} />
        </div>
        {movForm.quantidade && (
          <div style={{ background:'var(--c2)', borderRadius:8, padding:'.7rem 1rem', fontFamily:'var(--mono)', fontSize:'.85rem' }}>
            Novo estoque: <strong style={{ color: movForm.tipo==='entrada'?'var(--verde)':'var(--verm)' }}>
              {movForm.tipo==='entrada'
                ? (Number(itemAtivo?.qty||0) + Number(movForm.quantidade)).toFixed(2)
                : Math.max(0, Number(itemAtivo?.qty||0) - Number(movForm.quantidade)).toFixed(2)
              } {itemAtivo?.unit}
            </strong>
          </div>
        )}
      </Modal>
    </Layout>
  )
}