// pages/cozinha.js — 👩‍🍳 Tela da Cozinha (tablet)
// Mostra os pedidos do dia separados em 3 colunas: Entrega | Retirada | Prato Feito.
// Junta 3 fontes: balcao_pedidos (balcão), wpp_pedidos (WhatsApp) e comandas (mesas).
// Atualiza sozinha (Supabase Realtime + recarga a cada 15s como garantia).
// "Pronto" grava pronto_em no banco (ver COZINHA_SQL.sql) e também esconde no próprio tablet.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { sb } from '@/lib/supabase'
import { hoje } from '@/lib/helpers'

const COLUNAS = [
  { id: 'entrega',  nome: 'ENTREGA',     cor: '#5AA9FF' },
  { id: 'retirada', nome: 'RETIRADA',    cor: '#B79CFF' },
  { id: 'pf',       nome: 'PRATO FEITO', cor: '#3FC7B5' },
]

const CANCELADOS = ['cancelado', 'cancelada']
const CHAVE_LOCAL = 'caipira_cozinha_prontos'

const ehPF = (tipo) => (tipo || '').toLowerCase().includes('prato')

function lerProntosLocais() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_LOCAL) || '{}')
    return salvo.data === hoje() ? salvo.ids || {} : {}
  } catch {
    return {}
  }
}

function salvarProntosLocais(ids) {
  try {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify({ data: hoje(), ids }))
  } catch {}
}

function minutosDesde(iso, agora) {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((agora - t) / 60000))
}

function detalhePrato(p) {
  return [p.misturas, p.acompanhamentos, p.base, p.salada ? `Salada: ${p.salada}` : '']
    .filter(Boolean)
    .join(' · ')
}

// Converte as 3 tabelas num formato só
function normalizar({ balcao, wpp, mesas }) {
  const lista = []

  for (const p of balcao) {
    if (CANCELADOS.includes(p.status)) continue
    lista.push({
      chave: `balcao-${p.id}`,
      tabela: 'balcao_pedidos',
      id: p.id,
      coluna: ehPF(p.tipo_prato) ? 'pf' : 'retirada',
      numero: `#${p.numero}`,
      nome: p.cliente_nome || `Balcão #${p.numero}`,
      titulo: `${p.tipo_prato || ''} ${p.tamanho || ''}`.trim(),
      detalhe: detalhePrato(p),
      obs: p.obs || '',
      info: '',
      criado: p.created_at,
      pronto: !!p.pronto_em,
    })
  }

  for (const p of wpp) {
    if (CANCELADOS.includes(p.status)) continue
    const entrega = p.tipo_entrega === 'entrega'
    const adicionais = (p.wpp_itens || [])
      .filter((i) => i.tipo === 'adicional')
      .map((i) => i.nome)
    const info = entrega
      ? [p.bairro, p.endereco].filter(Boolean).join(' — ')
      : 'WhatsApp · retirada'
    lista.push({
      chave: `wpp-${p.id}`,
      tabela: 'wpp_pedidos',
      id: p.id,
      coluna: ehPF(p.tipo_prato) ? 'pf' : entrega ? 'entrega' : 'retirada',
      numero: 'WhatsApp',
      nome: p.cliente_nome || 'Cliente',
      titulo: `${p.tipo_prato || ''} ${p.tamanho || ''}`.trim(),
      detalhe: [detalhePrato(p), adicionais.length ? `+ ${adicionais.join(', ')}` : '']
        .filter(Boolean)
        .join(' · '),
      obs: p.obs || '',
      info: [info, p.horario ? `para ${p.horario}` : ''].filter(Boolean).join(' · '),
      criado: p.created_at,
      pronto: !!p.pronto_em,
    })
  }

  for (const c of mesas) {
    if (CANCELADOS.includes(c.status)) continue
    if (!c.tipo_prato) continue // comanda só de bebida não vai pra cozinha
    lista.push({
      chave: `mesa-${c.id}`,
      tabela: 'comandas',
      id: c.id,
      coluna: ehPF(c.tipo_prato) ? 'pf' : 'retirada',
      numero: c.mesa ? `Mesa ${c.mesa}` : 'Mesa',
      nome: c.cliente_nome && !String(c.cliente_nome).startsWith('Mesa') ? c.cliente_nome : (c.mesa ? `Mesa ${c.mesa}` : 'Mesa'),
      titulo: `${c.tipo_prato || ''} ${c.tamanho || ''}`.trim(),
      detalhe: detalhePrato(c),
      obs: c.obs || '',
      info: '',
      criado: c.created_at,
      pronto: !!c.pronto_em,
    })
  }

  // mais antigo primeiro
  return lista.sort((a, b) => new Date(a.criado || 0) - new Date(b.criado || 0))
}

function bipar(ctxRef) {
  try {
    const ctx = ctxRef.current
    if (!ctx) return
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = 880
    g.gain.setValueAtTime(0.25, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + 0.6)
  } catch {}
}

export default function Cozinha() {
  const router = useRouter()
  const [pedidos, setPedidos] = useState([])
  const [prontosLocais, setProntosLocais] = useState({})
  const [agora, setAgora] = useState(Date.now())
  const [conectado, setConectado] = useState(false)
  const [somAtivo, setSomAtivo] = useState(false)
  const [erro, setErro] = useState('')
  const audioRef = useRef(null)
  const conhecidosRef = useRef(null)

  // mesmo login do resto do sistema
  useEffect(() => {
    if (!sessionStorage.getItem('caipira_auth')) router.push('/')
    setProntosLocais(lerProntosLocais())
  }, [])

  async function carregar() {
    const dia = hoje()
    const [b, w, m] = await Promise.all([
      sb.from('balcao_pedidos').select('*').eq('data', dia),
      sb.from('wpp_pedidos').select('*, wpp_itens(*)').eq('data', dia),
      sb.from('comandas').select('*').eq('data', dia).eq('origem', 'Mesa'),
    ])
    const falha = [b, w, m].find((r) => r.error)
    setErro(falha ? falha.error.message : '')
    const lista = normalizar({ balcao: b.data || [], wpp: w.data || [], mesas: m.data || [] })

    // bipa quando chega pedido novo (depois da primeira carga)
    const chaves = new Set(lista.map((p) => p.chave))
    if (conhecidosRef.current) {
      const novo = [...chaves].some((k) => !conhecidosRef.current.has(k))
      if (novo) bipar(audioRef)
    }
    conhecidosRef.current = chaves
    setPedidos(lista)
  }

  useEffect(() => {
    carregar()
    const canal = sb
      .channel('cozinha')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'balcao_pedidos' }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wpp_pedidos' }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas' }, carregar)
      .subscribe((status) => setConectado(status === 'SUBSCRIBED'))
    const recarga = setInterval(carregar, 15000)
    const relogio = setInterval(() => setAgora(Date.now()), 30000)
    return () => {
      sb.removeChannel(canal)
      clearInterval(recarga)
      clearInterval(relogio)
    }
  }, [])

  async function marcarPronto(p) {
    const novos = { ...prontosLocais, [p.chave]: true }
    setProntosLocais(novos)
    salvarProntosLocais(novos)
    await sb.from(p.tabela).update({ pronto_em: new Date().toISOString() }).eq('id', p.id)
  }

  function desfazerUltimo() {
    const chaves = Object.keys(prontosLocais)
    if (!chaves.length) return
    const ultima = chaves[chaves.length - 1]
    const p = pedidos.find((x) => x.chave === ultima)
    const novos = { ...prontosLocais }
    delete novos[ultima]
    setProntosLocais(novos)
    salvarProntosLocais(novos)
    if (p) sb.from(p.tabela).update({ pronto_em: null }).eq('id', p.id).then(carregar)
  }

  function ativarSom() {
    try {
      audioRef.current = audioRef.current || new (window.AudioContext || window.webkitAudioContext)()
      audioRef.current.resume()
      setSomAtivo(true)
      bipar(audioRef)
    } catch {}
  }

  function telaCheia() {
    const el = document.documentElement
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen()
    else if (document.exitFullscreen) document.exitFullscreen()
  }

  const abertos = useMemo(
    () => pedidos.filter((p) => !p.pronto && !prontosLocais[p.chave]),
    [pedidos, prontosLocais],
  )

  const hora = new Date(agora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <Head>
        <title>Cozinha · O Caipira</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="kds">
        <header className="kds-top">
          <div className="kds-marca">
            <strong>COZINHA</strong>
            <span>O Caipira</span>
          </div>
          <div className="kds-acoes">
            <span className="kds-muted">{abertos.length} em preparo</span>
            <span className={`kds-status ${conectado ? 'on' : ''}`}>
              <i aria-hidden="true" />
              {conectado ? 'Ao vivo' : 'Atualizando a cada 15s'}
            </span>
            {!somAtivo && (
              <button type="button" className="kds-btn" onClick={ativarSom}>Ativar som</button>
            )}
            <button type="button" className="kds-btn" onClick={telaCheia}>Tela cheia</button>
            <strong className="kds-hora">{hora}</strong>
          </div>
        </header>

        {erro && <div className="kds-erro">Erro ao buscar pedidos: {erro}</div>}

        <main className="kds-colunas">
          {COLUNAS.map((col) => {
            const lista = abertos.filter((p) => p.coluna === col.id)
            return (
              <section key={col.id} className="kds-col">
                <div className="kds-col-topo" style={{ background: col.cor }}>
                  <span>{col.nome}</span>
                  <b>{lista.length}</b>
                </div>
                <div className="kds-lista">
                  {lista.length === 0 && <div className="kds-vazio">Nenhum pedido aqui</div>}
                  {lista.map((p) => {
                    const min = minutosDesde(p.criado, agora)
                    const nivel = min == null ? 'ok' : min >= 15 ? 'atraso' : min >= 8 ? 'atencao' : 'ok'
                    return (
                      <article key={p.chave} className={`kds-card ${nivel}`}>
                        <div className="kds-card-topo">
                          <div>
                            <small>{p.numero}</small>
                            <h3>{p.nome}</h3>
                          </div>
                          {min != null && (
                            <span className={`kds-tempo ${nivel}`}>
                              {min} min{nivel === 'atraso' ? ' · atrasado' : ''}
                            </span>
                          )}
                        </div>
                        <div className="kds-item">
                          <b>{p.titulo}</b>
                          {p.detalhe && <span>{p.detalhe}</span>}
                        </div>
                        {p.obs && <div className="kds-obs">Obs: {p.obs}</div>}
                        {p.info && <div className="kds-info">{p.info}</div>}
                        <button type="button" className="kds-pronto" onClick={() => marcarPronto(p)}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3FC7B5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
                          Pronto
                        </button>
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </main>

        <footer className="kds-rodape">
          <div className="kds-legenda">
            <span>Espera:</span>
            <span className="kds-tempo ok">até 7 min</span>
            <span className="kds-tempo atencao">8 a 14 min</span>
            <span className="kds-tempo atraso">15 min ou mais</span>
          </div>
          <div className="kds-legenda">
            <button type="button" className="kds-btn" onClick={desfazerUltimo}>Desfazer último pronto</button>
            <button type="button" className="kds-btn" onClick={() => router.push('/dashboard')}>Voltar ao sistema</button>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        .kds { min-height: 100vh; background: #14161A; color: #F2F2F0; display: flex; flex-direction: column; font-family: var(--font); }
        .kds-top { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid #2A2F37; }
        .kds-marca { display: flex; align-items: baseline; gap: 12px; }
        .kds-marca strong { font-size: 28px; font-weight: 800; letter-spacing: .5px; }
        .kds-marca span, .kds-muted { color: #A3A8B0; font-size: 16px; }
        .kds-acoes { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
        .kds-status { display: flex; align-items: center; gap: 8px; color: #A3A8B0; font-size: 15px; }
        .kds-status i { width: 10px; height: 10px; border-radius: 50%; background: #6B7280; }
        .kds-status.on { color: #3FC7B5; }
        .kds-status.on i { background: #3FC7B5; }
        .kds-hora { font-size: 28px; font-weight: 800; }
        .kds-btn { min-height: 44px; padding: 0 14px; border-radius: 10px; border: 1px solid #3A414B; background: transparent; color: #F2F2F0; font-size: 15px; font-weight: 700; }
        .kds-erro { margin: 12px 20px 0; padding: 10px 14px; border-radius: 10px; background: #3A1F1C; color: #FFB4AB; }
        .kds-colunas { flex: 1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; padding: 16px 20px; align-items: start; }
        .kds-col { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
        .kds-col-topo { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 12px; color: #111318; font-size: 24px; font-weight: 800; }
        .kds-col-topo b { min-width: 40px; height: 40px; border-radius: 20px; background: #111318; color: #F2F2F0; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .kds-lista { display: flex; flex-direction: column; gap: 12px; }
        .kds-vazio { padding: 28px 16px; text-align: center; color: #A3A8B0; border: 2px dashed #2A2F37; border-radius: 12px; }
        .kds-card { background: #1F232A; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; border-top: 4px solid #2E343D; }
        .kds-card.atencao { border-top-color: #F5B83D; }
        .kds-card.atraso { border-top-color: #FF6B5E; }
        .kds-card-topo { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
        .kds-card-topo small { color: #A3A8B0; font-size: 14px; font-weight: 700; }
        .kds-card-topo h3 { font-size: 21px; font-weight: 800; line-height: 1.15; }
        .kds-tempo { flex-shrink: 0; padding: 5px 10px; border-radius: 8px; font-weight: 800; font-size: 15px; white-space: nowrap; }
        .kds-tempo.ok { background: #2E343D; color: #F2F2F0; }
        .kds-tempo.atencao { background: #F5B83D; color: #1A1408; }
        .kds-tempo.atraso { background: #FF6B5E; color: #1A0B09; }
        .kds-item { display: flex; flex-direction: column; gap: 2px; }
        .kds-item b { font-size: 20px; }
        .kds-item span { font-size: 16px; color: #C9CDD3; }
        .kds-obs { padding: 8px 10px; border-radius: 8px; background: #3A3220; color: #FFD98A; font-size: 16px; font-weight: 700; }
        .kds-info { font-size: 14px; color: #A3A8B0; }
        .kds-pronto { height: 52px; border: 0; border-radius: 10px; background: #2E343D; color: #F2F2F0; font-size: 18px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .kds-pronto:active { background: #3A414B; }
        .kds-rodape { display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center; padding: 10px 20px 16px; border-top: 1px solid #2A2F37; color: #A3A8B0; }
        .kds-legenda { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        @media (max-width: 760px) { .kds-colunas { grid-template-columns: 1fr; } }
      `}</style>
    </>
  )
}
