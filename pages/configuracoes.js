// pages/configuracoes.js — ⚙️ Configurações do sistema (só admin)

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import Modal from '@/components/Modal'
import { sb } from '@/lib/supabase'
import { R } from '@/lib/helpers'

export default function Configuracoes() {
  const [aba, setAba]         = useState('precos')
  const [precos, setPrecos]   = useState([])
  const [bairros, setBairros] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)

  const [formBairro, setFormBairro] = useState({ nome:'', taxa:0 })
  const [formUser, setFormUser]     = useState({ email:'', nome:'', perfil:'garcom', senha:'' })
  const [formPreco, setFormPreco]   = useState({ tipo:'', tamanho:'', preco:0 })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const [{ data: p }, { data: b }, { data: u }] = await Promise.all([
      sb.from('precos').select('*').order('tipo').order('tamanho'),
      sb.from('bairros_entrega').select('*').order('nome'),
      sb.from('perfis').select('*').order('nome'),
    ])
    if (p) setPrecos(p)
    if (b) setBairros(b)
    if (u) setUsuarios(u)
    setLoading(false)
  }

  // ── PREÇOS ──
  async function salvarPreco() {
    await sb.from('precos').upsert({ tipo: formPreco.tipo, tamanho: formPreco.tamanho, preco: Number(formPreco.preco) }, { onConflict:'tipo,tamanho' })
    setModal(null); carregar()
  }

  // ── BAIRROS ──
  async function salvarBairro() {
    if (!formBairro.nome.trim()) return alert('Nome obrigatório!')
    await sb.from('bairros_entrega').insert({ nome: formBairro.nome.trim(), taxa: Number(formBairro.taxa) })
    setFormBairro({ nome:'', taxa:0 }); setModal(null); carregar()
  }

  async function toggleBairro(id, ativo) {
    await sb.from('bairros_entrega').update({ ativo: !ativo }).eq('id', id)
    carregar()
  }

  async function deletarBairro(id) {
    if (!confirm('Remover bairro?')) return
    await sb.from('bairros_entrega').delete().eq('id', id)
    carregar()
  }

  // ── USUÁRIOS ──
  async function criarUsuario() {
    if (!formUser.email.trim() || !formUser.senha || !formUser.nome.trim()) return alert('Preencha todos os campos!')

    const { data, error } = await sb.auth.admin.createUser({
      email: formUser.email, password: formUser.senha, email_confirm: true
    })
    if (error) return alert('Erro ao criar usuário: ' + error.message)

    await sb.from('perfis').insert({ user_id: data.user.id, nome: formUser.nome.trim(), perfil: formUser.perfil, ativo: true })
    setFormUser({ email:'', nome:'', perfil:'garcom', senha:'' })
    setModal(null); carregar()
  }

  async function toggleUsuario(id, ativo) {
    await sb.from('perfis').update({ ativo: !ativo }).eq('id', id)
    carregar()
  }

  const TIPOS_PRATO = ['Marmitex','Prato Feito','Feijoada']
  const TAMANHOS    = ['P','M','G']
  const PERFIS      = [
    { key:'admin',   label:'Admin — Acesso total' },
    { key:'caixa',   label:'Caixa — Comandas e financeiro' },
    { key:'garcom',  label:'Garçom — Lançar pedidos' },
    { key:'cozinha', label:'Cozinha — Ver pedidos' },
    { key:'estoque', label:'Estoque — Controle de estoque' },
  ]

  if (loading) return (
    <Layout title="Configurações">
      <div className="loading-overlay"><div className="loading-icon">⚙️</div><div className="loading-txt">Carregando...</div></div>
    </Layout>
  )

  return (
    <Layout title="Configurações">
      <div className="ph">
        <div><h2>Configurações ⚙️</h2><div className="ph-sub">Apenas administradores</div></div>
      </div>

      {/* Abas */}
      <div className="period-tabs" style={{ marginBottom:'1.5rem' }}>
        {[['precos','💰 Preços'],['bairros','📍 Bairros'],['usuarios','👥 Usuários']].map(([v,l]) => (
          <button key={v} className={`ptab${aba===v?' active':''}`} onClick={() => setAba(v)}>{l}</button>
        ))}
      </div>

      {/* ABA PREÇOS */}
      {aba === 'precos' && (
        <div className="panel">
          <div className="panel-hd">
            <div className="panel-title">Preços por Tipo e Tamanho</div>
          </div>
          <table className="tbl">
            <thead><tr><th>Tipo</th><th>P</th><th>M</th><th>G</th></tr></thead>
            <tbody>
              {TIPOS_PRATO.map(tipo => (
                <tr key={tipo}>
                  <td style={{ fontWeight:700 }}>{tipo}</td>
                  {TAMANHOS.map(tam => {
                    const preco = precos.find(p => p.tipo===tipo && p.tamanho===tam)
                    return (
                      <td key={tam}>
                        <button className="btn btn-ghost btn-sm" style={{ fontFamily:'var(--mono)' }}
                          onClick={() => { setFormPreco({ tipo, tamanho: tam, preco: preco?.preco || 0 }); setModal('preco') }}>
                          {preco ? R(preco.preco) : '—'} ✏️
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ABA BAIRROS */}
      {aba === 'bairros' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
            <button className="btn btn-ora btn-sm" onClick={() => { setFormBairro({ nome:'', taxa:0 }); setModal('bairro') }}>+ Novo Bairro</button>
          </div>
          <div className="panel" style={{ padding:0, overflow:'hidden' }}>
            <table className="tbl">
              <thead><tr><th>Bairro</th><th>Taxa de Entrega</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {bairros.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight:600 }}>{b.nome}</td>
                    <td style={{ fontFamily:'var(--mono)' }}>{R(b.taxa)}</td>
                    <td>
                      <span className={`badge ${b.ativo ? 'ok' : 'out'}`}>{b.ativo ? 'Ativo' : 'Inativo'}</span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:'.3rem' }}>
                        <button className={`btn btn-sm ${b.ativo?'btn-ghost':'btn-vd'}`} onClick={() => toggleBairro(b.id, b.ativo)}>
                          {b.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button className="btn btn-vm btn-sm btn-icon" onClick={() => deletarBairro(b.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA USUÁRIOS */}
      {aba === 'usuarios' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
            <button className="btn btn-ora btn-sm" onClick={() => { setFormUser({ email:'', nome:'', perfil:'garcom', senha:'' }); setModal('usuario') }}>+ Novo Usuário</button>
          </div>
          <div className="panel" style={{ padding:0, overflow:'hidden' }}>
            <table className="tbl">
              <thead><tr><th>Nome</th><th>Perfil</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight:600 }}>{u.nome}</td>
                    <td><span className="badge badge-info">{u.perfil}</span></td>
                    <td><span className={`badge ${u.ativo?'ok':'out'}`}>{u.ativo?'Ativo':'Inativo'}</span></td>
                    <td>
                      <button className={`btn btn-sm ${u.ativo?'btn-ghost':'btn-vd'}`} onClick={() => toggleUsuario(u.id, u.ativo)}>
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal preço */}
      <Modal open={modal==='preco'} onClose={() => setModal(null)} title={`Editar Preço — ${formPreco.tipo} ${formPreco.tamanho}`}
        actions={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-ora" onClick={salvarPreco}>Salvar</button></>}>
        <div className="fg">
          <label>Preço (R$)</label>
          <input type="number" step="0.01" min="0" value={formPreco.preco} onChange={e => setFormPreco(f => ({...f, preco: e.target.value}))} />
        </div>
      </Modal>

      {/* Modal bairro */}
      <Modal open={modal==='bairro'} onClose={() => setModal(null)} title="Novo Bairro"
        actions={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-ora" onClick={salvarBairro}>Salvar</button></>}>
        <div className="fg">
          <label>Nome do Bairro *</label>
          <input type="text" placeholder="Ex: Centro / Vista Alegre" value={formBairro.nome} onChange={e => setFormBairro(f => ({...f, nome: e.target.value}))} />
        </div>
        <div className="fg">
          <label>Taxa de Entrega (R$)</label>
          <input type="number" step="0.01" min="0" placeholder="0,00" value={formBairro.taxa} onChange={e => setFormBairro(f => ({...f, taxa: e.target.value}))} />
        </div>
      </Modal>

      {/* Modal usuário */}
      <Modal open={modal==='usuario'} onClose={() => setModal(null)} title="Novo Usuário"
        actions={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-ora" onClick={criarUsuario}>Criar</button></>}>
        <div className="fg">
          <label>Nome *</label>
          <input type="text" placeholder="Ex: João Silva" value={formUser.nome} onChange={e => setFormUser(f => ({...f, nome: e.target.value}))} />
        </div>
        <div className="fg">
          <label>Email *</label>
          <input type="email" placeholder="email@exemplo.com" value={formUser.email} onChange={e => setFormUser(f => ({...f, email: e.target.value}))} />
        </div>
        <div className="fg">
          <label>Senha *</label>
          <input type="password" placeholder="Mínimo 6 caracteres" value={formUser.senha} onChange={e => setFormUser(f => ({...f, senha: e.target.value}))} />
        </div>
        <div className="fg">
          <label>Perfil</label>
          <select value={formUser.perfil} onChange={e => setFormUser(f => ({...f, perfil: e.target.value}))}>
            {PERFIS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
      </Modal>
    </Layout>
  )
}