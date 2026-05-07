// pages/cardapio.js — 🗒️ Cardápio do Dia

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import { sb } from '@/lib/supabase'

const TIPOS = ['mistura', 'base', 'acompanhamento', 'salada', 'adicional']

const TIPO_INFO = {
  mistura:        { ico: '🫕', label: 'Mistura',       cor: '#FF6A00' },
  base:           { ico: '🍚', label: 'Base',           cor: '#2563EB' },
  acompanhamento: { ico: '🥗', label: 'Acompanhamento', cor: '#16A34A' },
  salada:         { ico: '🥬', label: 'Salada',         cor: '#22C55E' },
  adicional:      { ico: '➕', label: 'Adicional',      cor: '#7C3AED' },
}

export default function Cardapio() {
  const router = useRouter()
  const [itens, setItens]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm]         = useState({ tipo: 'mistura', nome: '' })

  const hoje = new Date().toISOString().split('T')[0]
  const hojeFormatado = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })

  useEffect(() => {
    const auth = sessionStorage.getItem('caipira_auth')
    if (!auth) { router.push('/'); return }
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await sb
      .from('cardapio_dia')
      .select('*')
      .eq('data', hoje)
      .order('tipo')
      .order('nome')
    if (data) setItens(data)
    setLoading(false)
  }

  async function adicionarItem() {
    if (!form.nome.trim()) return alert('Informe o nome do item!')
    setSalvando(true)
    const { error } = await sb.from('cardapio_dia').insert({
      data: hoje,
      tipo: form.tipo,
      nome: form.nome.trim(),
      disponivel: true, // sempre começa disponível
    })
    if (error) { alert('Erro: ' + error.message); setSalvando(false); return }
    setForm(f => ({ ...f, nome: '' }))
    await carregar()
    setSalvando(false)
  }

  async function toggleDisponivel(item) {
    await sb.from('cardapio_dia').update({ disponivel: !item.disponivel }).eq('id', item.id)
    setItens(prev => prev.map(i => i.id === item.id ? { ...i, disponivel: !i.disponivel } : i))
  }

  async function removerItem(id) {
    if (!confirm('Remover este item do cardápio?')) return
    await sb.from('cardapio_dia').delete().eq('id', id)
    setItens(prev => prev.filter(i => i.id !== id))
  }

  async function limparCardapio() {
    if (!confirm('Limpar TODO o cardápio de hoje?')) return
    await sb.from('cardapio_dia').delete().eq('data', hoje)
    setItens([])
  }

  if (loading)
    return (
      <Layout title="Cardápio do Dia">
        <div className="loading-overlay">
          <div className="loading-icon">🗒️</div>
          <div className="loading-txt">Carregando...</div>
        </div>
      </Layout>
    )

  const totalDisponivel = itens.filter(i => i.disponivel).length

  return (
    <Layout title="Cardápio do Dia">
      {/* cabeçalho */}
      <div className="ph">
        <div>
          <h2>Cardápio do Dia 🗒️</h2>
          <div className="ph-sub" style={{ textTransform: 'capitalize' }}>
            {hojeFormatado} · {totalDisponivel} item{totalDisponivel !== 1 ? 'ns' : ''} disponíveis
          </div>
        </div>
        {itens.length > 0 && (
          <button className="btn btn-vm btn-sm" onClick={limparCardapio}>
            🗑️ Limpar Tudo
          </button>
        )}
      </div>

      {/* formulário */}
      <div className="panel" style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--txt)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.9rem' }}>
          + Adicionar ao Cardápio de Hoje
        </div>
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="fg">
            <label>Tipo</label>
            <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
              {TIPOS.map(t => (
                <option key={t} value={t}>
                  {TIPO_INFO[t].ico} {TIPO_INFO[t].label}
                </option>
              ))}
            </select>
          </div>
          <div className="fg" style={{ flex: 3 }}>
            <label>Nome do Item *</label>
            <input
              type="text"
              placeholder={
                form.tipo === 'mistura'        ? 'Ex: Frango grelhado, Carne assada...' :
                form.tipo === 'base'           ? 'Ex: Arroz branco, Arroz integral...'  :
                form.tipo === 'acompanhamento' ? 'Ex: Feijão carioca, Tutu...'          :
                form.tipo === 'salada'         ? 'Ex: Alface, Tomate, Pepino...'        :
                                                 'Ex: Ovo frito, Frango extra...'
              }
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && adicionarItem()}
            />
          </div>
          <div style={{ flexShrink: 0 }}>
            <button className="btn btn-ora" onClick={adicionarItem} disabled={salvando}>
              {salvando ? '...' : '+ Adicionar'}
            </button>
          </div>
        </div>
      </div>

      {/* lista vazia */}
      {itens.length === 0 && (
        <div className="empty">
          <div className="empty-ico">🗒️</div>
          <div className="empty-title">Cardápio vazio</div>
          <div className="empty-sub">Adicione os pratos do dia acima</div>
        </div>
      )}

      {/* itens por tipo */}
      {TIPOS.map(tipo => {
        const doTipo = itens.filter(i => i.tipo === tipo)
        if (!doTipo.length) return null
        const info = TIPO_INFO[tipo]
        return (
          <div key={tipo} style={{ marginBottom: '1.2rem' }}>
            <div style={{
              fontSize: '.75rem', fontWeight: 700, color: info.cor,
              textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '.6rem',
              display: 'flex', alignItems: 'center', gap: '.4rem',
            }}>
              {info.ico} {info.label}
              <span style={{ fontWeight: 400, color: 'var(--txt)', opacity: .6 }}>
                ({doTipo.filter(i => i.disponivel).length}/{doTipo.length} disponíveis)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
              {doTipo.map(item => (
                <div key={item.id} className="panel" style={{
                  marginBottom: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: '.8rem',
                  padding: '.7rem 1rem',
                  opacity: item.disponivel ? 1 : 0.45,
                  transition: 'opacity .2s',
                  borderLeft: `3px solid ${item.disponivel ? info.cor : 'var(--c2)'}`,
                }}>
                  <div style={{ fontWeight: 700, fontSize: '.9rem', flex: 1 }}>
                    {info.ico} {item.nome}
                  </div>
                  <div style={{
                    fontSize: '.7rem', fontWeight: 700,
                    padding: '2px 8px', borderRadius: 20,
                    background: item.disponivel ? '#1a3d2e' : 'var(--c2)',
                    color: item.disponivel ? 'var(--verde,#22c55e)' : 'var(--txt)',
                  }}>
                    {item.disponivel ? '✅ Disponível' : '❌ Indisponível'}
                  </div>
                  <div style={{ display: 'flex', gap: '.3rem', flexShrink: 0 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => toggleDisponivel(item)}
                      title={item.disponivel ? 'Marcar indisponível' : 'Marcar disponível'}
                    >
                      {item.disponivel ? '⏸️' : '▶️'}
                    </button>
                    <button
                      className="btn btn-vm btn-sm btn-icon"
                      onClick={() => removerItem(item.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* resumo rodapé */}
      {itens.length > 0 && (
        <div style={{
          marginTop: '1.5rem', padding: '.8rem 1rem',
          background: 'var(--c2)', borderRadius: 10,
          fontSize: '.78rem', color: 'var(--txt)',
          display: 'flex', gap: '1.5rem', flexWrap: 'wrap', opacity: .8,
        }}>
          {TIPOS.map(tipo => {
            const n = itens.filter(i => i.tipo === tipo).length
            if (!n) return null
            const info = TIPO_INFO[tipo]
            return <span key={tipo}>{info.ico} <strong>{info.label}:</strong> {n}</span>
          })}
        </div>
      )}
    </Layout>
  )
}