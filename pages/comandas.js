// pages/comandas.js
// Sistema de comandas: mesa, balcão e delivery.
// Cria comanda → adiciona itens → imprime → fecha e lança no financeiro.

import { useState, useEffect, useRef } from 'react'
import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import PrintComanda from '@/components/PrintComanda'
import { R, hoje, gerarNumComanda, statusComanda } from '@/lib/helpers'
import {
  getComandas, addComanda, updateComanda,
  addItemComanda, removeItemComanda,
  getProdutos, fecharComanda
} from '@/lib/db'

const ORIGENS = ['Mesa', 'Balcão', 'WhatsApp', 'iFood', 'Outro']
const PAGAMENTOS = ['PIX', 'Dinheiro', 'Cartão débito', 'Cartão crédito']

export default function Comandas() {
  const [comandas, setComandas]     = useState([])
  const [produtos, setProdutos]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [filtro, setFiltro]         = useState('aberta')
  const [modal, setModal]           = useState(null)   // 'nova' | 'ver' | 'item'
  const [comandaAtiva, setComandaAtiva] = useState(null)
  const [printComanda, setPrintComanda] = useState(null)

  // Form nova comanda
  const [form, setForm] = useState({ cliente_nome: '', origem: 'Mesa', mesa: '', obs: '' })
  // Form add item
  const [itemForm, setItemForm] = useState({ produto_id: '', quantidade: 1, obs: '' })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const [c, p] = await Promise.all([getComandas(), getProdutos()])
    if (c.data) setComandas(c.data)
    if (p.data) setProdutos(p.data)
    setLoading(false)
  }

  // ── CRIAR COMANDA ──
  async function criarComanda() {
    if (!form.cliente_nome.trim()) return alert('Nome do cliente obrigatório!')
    const { data, error } = await addComanda({
      numero: gerarNumComanda(),
      cliente_nome: form.cliente_nome.trim(),
      origem: form.origem,
      mesa: form.mesa,
      obs: form.obs,
      status: 'aberta',
      total: 0,
      data: hoje()
    })
    if (error) return alert('Erro ao criar comanda: ' + error.message)
    setComandas(prev => [{ ...data, comanda_itens: [] }, ...prev])
    setComandaAtiva({ ...data, comanda_itens: [] })
    setModal('ver')
    setForm({ cliente_nome: '', origem: 'Mesa', mesa: '', obs: '' })
  }

  // ── ADICIONAR ITEM ──
  async function adicionarItem() {
    if (!itemForm.produto_id) return alert('Selecione um produto!')
    const prod = produtos.find(p => p.id == itemForm.produto_id)
    if (!prod) return

    const { data, error } = await addItemComanda({
      comanda_id: comandaAtiva.id,
      produto_id: prod.id,
      nome: prod.nome,
      quantidade: Number(itemForm.quantidade),
      preco_unitario: prod.preco,
      obs: itemForm.obs
    })
    if (error) return alert('Erro: ' + error.message)

    const novoItem = { ...data, produtos: { nome: prod.nome, preco: prod.preco } }
    const novosItens = [...(comandaAtiva.comanda_itens || []), novoItem]
    const novoTotal = novosItens.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0)

    await updateComanda(comandaAtiva.id, { total: novoTotal })

    const atualizada = { ...comandaAtiva, comanda_itens: novosItens, total: novoTotal }
    setComandaAtiva(atualizada)
    setComandas(prev => prev.map(c => c.id === atualizada.id ? atualizada : c))
    setItemForm({ produto_id: '', quantidade: 1, obs: '' })
    setModal('ver')
  }

  // ── REMOVER ITEM ──
  async function removerItem(itemId) {
    if (!confirm('Remover item?')) return
    await removeItemComanda(itemId)
    const novosItens = (comandaAtiva.comanda_itens || []).filter(i => i.id !== itemId)
    const novoTotal = novosItens.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0)
    await updateComanda(comandaAtiva.id, { total: novoTotal })
    const atualizada = { ...comandaAtiva, comanda_itens: novosItens, total: novoTotal }
    setComandaAtiva(atualizada)
    setComandas(prev => prev.map(c => c.id === atualizada.id ? atualizada : c))
  }

  // ── MUDAR STATUS ──
  async function mudarStatus(comanda, novoStatus) {
    await updateComanda(comanda.id, { status: novoStatus })
    setComandas(prev => prev.map(c => c.id === comanda.id ? { ...c, status: novoStatus } : c))
    if (comandaAtiva?.id === comanda.id) setComandaAtiva(prev => ({ ...prev, status: novoStatus }))
  }

  // ── FECHAR E PAGAR ──
  async function pagarComanda(formaPag) {
    if (!comandaAtiva) return
    await fecharComanda({ ...comandaAtiva, forma_pagamento: formaPag })
    await updateComanda(comandaAtiva.id, { status: 'paga', forma_pagamento: formaPag })
    setComandas(prev => prev.map(c => c.id === comandaAtiva.id ? { ...c, status: 'paga', forma_pagamento: formaPag } : c))
    setModal(null)
    setComandaAtiva(null)
    alert('✅ Comanda paga e lançada no financeiro!')
  }

  // ── IMPRIMIR ──
  function imprimir(comanda) {
    setPrintComanda(comanda)
    setTimeout(() => window.print(), 300)
  }

  const abertas   = comandas.filter(c => c.status === filtro)
  const qtAberta  = comandas.filter(c => c.status === 'aberta').length

  if (loading) return (
    <Layout title="Comandas">
      <div className="loading-overlay"><div className="loading-icon">🌽</div><div className="loading-txt">Carregando...</div></div>
    </Layout>
  )

  return (
    <Layout title="Comandas">
      {/* Área de impressão — invisível na tela */}
      <div style={{ display: 'none' }}>
        <PrintComanda comanda={printComanda} />
      </div>

      <div className="ph">
        <div>
          <h2>Comandas</h2>
          <div className="ph-sub">{qtAberta} comanda(s) aberta(s)</div>
        </div>
        <div className="ph-actions">
          <button className="btn btn-ora" onClick={() => setModal('nova')}>+ Nova Comanda</button>
        </div>
      </div>

      {/* Filtro de status */}
      <div className="period-tabs" style={{ marginBottom: '1.2rem' }}>
        {['aberta','pronta','entregue','paga','cancelada'].map(s => (
          <button key={s} className={`ptab${filtro === s ? ' active' : ''}`} onClick={() => setFiltro(s)}>
            {statusComanda(s).label}
          </button>
        ))}
      </div>

      {/* Cards de comandas */}
      <div className="comanda-grid">
        {abertas.length === 0 && (
          <div className="empty" style={{ gridColumn: '1/-1' }}>
            <div className="empty-ico">🎟️</div>
            <div className="empty-title">Nenhuma comanda {statusComanda(filtro).label.toLowerCase()}</div>
          </div>
        )}
        {abertas.map(c => {
          const st = statusComanda(c.status)
          const itens = c.comanda_itens || []
          return (
            <div key={c.id} className={`comanda-card ${c.status}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="comanda-num">#{c.numero}</div>
                  <div className="comanda-cliente">{c.cliente_nome}</div>
                  <div className="comanda-origem">{c.origem}{c.mesa ? ` · Mesa ${c.mesa}` : ''}</div>
                </div>
                <span className={`badge ${st.cls}`}>{st.label}</span>
              </div>

              <div className="comanda-itens-preview">
                {itens.length === 0
                  ? 'Nenhum item ainda'
                  : itens.slice(0, 3).map((i, idx) => (
                      <div key={idx}>{i.quantidade}x {i.produtos?.nome || i.nome}</div>
                    ))
                }
                {itens.length > 3 && <div style={{ color: 'var(--txt)' }}>+{itens.length - 3} itens...</div>}
              </div>

              <div className="comanda-footer">
                <div className="comanda-total">{R(c.total)}</div>
                <div className="comanda-actions">
                  <button className="btn btn-ghost btn-sm btn-icon" title="Imprimir" onClick={() => imprimir(c)}>🖨️</button>
                  <button className="btn btn-ora btn-sm" onClick={() => { setComandaAtiva(c); setModal('ver') }}>Abrir</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── MODAL: NOVA COMANDA ── */}
      <Modal
        open={modal === 'nova'}
        onClose={() => setModal(null)}
        title="Nova Comanda"
        actions={
          <>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-ora" onClick={criarComanda}>Criar Comanda</button>
          </>
        }
      >
        <div className="fg">
          <label>Nome do Cliente *</label>
          <input
            type="text" placeholder="Ex: João Silva"
            value={form.cliente_nome}
            onChange={e => setForm(f => ({ ...f, cliente_nome: e.target.value }))}
          />
        </div>
        <div className="form-row">
          <div className="fg">
            <label>Origem</label>
            <select value={form.origem} onChange={e => setForm(f => ({ ...f, origem: e.target.value }))}>
              {ORIGENS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div className="fg">
            <label>Mesa (opcional)</label>
            <input
              type="text" placeholder="Ex: 4"
              value={form.mesa}
              onChange={e => setForm(f => ({ ...f, mesa: e.target.value }))}
            />
          </div>
        </div>
        <div className="fg">
          <label>Observação</label>
          <input
            type="text" placeholder="Sem cebola, alergia, etc..."
            value={form.obs}
            onChange={e => setForm(f => ({ ...f, obs: e.target.value }))}
          />
        </div>
      </Modal>

      {/* ── MODAL: VER / EDITAR COMANDA ── */}
      <Modal
        open={modal === 'ver' && !!comandaAtiva}
        onClose={() => { setModal(null); setComandaAtiva(null) }}
        title={`Comanda #${comandaAtiva?.numero} — ${comandaAtiva?.cliente_nome}`}
      >
        {comandaAtiva && (
          <>
            {/* Info */}
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span className={`badge ${statusComanda(comandaAtiva.status).cls}`}>
                {statusComanda(comandaAtiva.status).label}
              </span>
              <span className="badge badge-info">{comandaAtiva.origem}</span>
              {comandaAtiva.mesa && <span className="badge">Mesa {comandaAtiva.mesa}</span>}
            </div>

            {/* Itens */}
            <div className="panel-title" style={{ marginBottom: '.8rem' }}>Itens</div>
            {(comandaAtiva.comanda_itens || []).length === 0
              ? <p style={{ color: 'var(--txt)', fontSize: '.83rem', marginBottom: '1rem' }}>Nenhum item adicionado ainda.</p>
              : (
                <table className="tbl" style={{ marginBottom: '1rem' }}>
                  <thead>
                    <tr><th>Item</th><th>Qtd</th><th>Preço</th><th>Subtotal</th><th></th></tr>
                  </thead>
                  <tbody>
                    {(comandaAtiva.comanda_itens || []).map(item => (
                      <tr key={item.id}>
                        <td>{item.produtos?.nome || item.nome}{item.obs ? <span style={{ fontSize: '.7rem', color: 'var(--txt)' }}> · {item.obs}</span> : ''}</td>
                        <td style={{ fontFamily: 'var(--mono)' }}>{item.quantidade}</td>
                        <td style={{ fontFamily: 'var(--mono)' }}>{R(item.preco_unitario)}</td>
                        <td style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{R(item.quantidade * item.preco_unitario)}</td>
                        <td>
                          {comandaAtiva.status === 'aberta' && (
                            <button className="btn btn-vm btn-icon btn-sm" onClick={() => removerItem(item.id)}>✕</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', padding: '.8rem 0', borderTop: '2px solid var(--c3)', marginBottom: '1rem' }}>
              <span>Total</span>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--ora)' }}>{R(comandaAtiva.total)}</span>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              {comandaAtiva.status === 'aberta' && (
                <button className="btn btn-vd btn-sm" onClick={() => setModal('item')}>+ Adicionar Item</button>
              )}
              {comandaAtiva.status === 'aberta' && (
                <button className="btn btn-az btn-sm" onClick={() => mudarStatus(comandaAtiva, 'pronta')}>✅ Marcar Pronta</button>
              )}
              {comandaAtiva.status === 'pronta' && (
                <button className="btn btn-az btn-sm" onClick={() => mudarStatus(comandaAtiva, 'entregue')}>🚀 Marcar Entregue</button>
              )}
              {['aberta','pronta','entregue'].includes(comandaAtiva.status) && (
                <>
                  {PAGAMENTOS.map(pag => (
                    <button key={pag} className="btn btn-ora btn-sm" onClick={() => pagarComanda(pag)}>
                      💰 Pagar ({pag})
                    </button>
                  ))}
                </>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => imprimir(comandaAtiva)}>🖨️ Imprimir</button>
              {comandaAtiva.status === 'aberta' && (
                <button className="btn btn-vm btn-sm" onClick={() => { mudarStatus(comandaAtiva, 'cancelada'); setModal(null) }}>Cancelar Comanda</button>
              )}
            </div>
          </>
        )}
      </Modal>

      {/* ── MODAL: ADICIONAR ITEM ── */}
      <Modal
        open={modal === 'item'}
        onClose={() => setModal('ver')}
        title="Adicionar Item"
        actions={
          <>
            <button className="btn btn-ghost" onClick={() => setModal('ver')}>Voltar</button>
            <button className="btn btn-ora" onClick={adicionarItem}>Adicionar</button>
          </>
        }
      >
        <div className="fg">
          <label>Produto *</label>
          <select value={itemForm.produto_id} onChange={e => setItemForm(f => ({ ...f, produto_id: e.target.value }))}>
            <option value="">Selecione...</option>
            {produtos.map(p => (
              <option key={p.id} value={p.id}>{p.nome} — {R(p.preco)}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <div className="fg">
            <label>Quantidade</label>
            <input
              type="number" min="1"
              value={itemForm.quantidade}
              onChange={e => setItemForm(f => ({ ...f, quantidade: e.target.value }))}
            />
          </div>
          <div className="fg">
            <label>Observação</label>
            <input
              type="text" placeholder="Sem sal, bem passado..."
              value={itemForm.obs}
              onChange={e => setItemForm(f => ({ ...f, obs: e.target.value }))}
            />
          </div>
        </div>
        {itemForm.produto_id && (
          <div style={{ background: 'var(--c2)', borderRadius: 9, padding: '.8rem 1rem', fontFamily: 'var(--mono)', fontSize: '.85rem' }}>
            Subtotal: <strong style={{ color: 'var(--ora)' }}>
              {R((produtos.find(p => p.id == itemForm.produto_id)?.preco || 0) * itemForm.quantidade)}
            </strong>
          </div>
        )}
      </Modal>
    </Layout>
  )
}
