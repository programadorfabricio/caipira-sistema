// components/Layout.js
// Sidebar + topbar mobile. Envolve todas as páginas internas.
// Uso: <Layout title="Dashboard" alertas={3}> ... </Layout>

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

const MENU = [
  { id: 'dashboard',     label: 'Dashboard',       ico: '📊', section: 'Principal' },
  { id: 'comandas',      label: 'Comandas',        ico: '🎟️', section: null },
  { id: 'whatsapp',      label: 'WhatsApp',        ico: '📱', section: null },
  { id: 'caixa/abrir',   label: 'Abrir Caixa',     ico: '🟢', section: 'Caixa' },
  { id: 'caixa/fechar',  label: 'Fechar Caixa',    ico: '🔴', section: null },
  { id: 'estoque',       label: 'Estoque',         ico: '📦', section: null, badge: 'alertas' },
  { id: 'cardapio',      label: 'Cardápio',        ico: '🍽️', section: null },
  // "Cardápio do Dia" reaproveita a página /cardapio (ainda não existe página dedicada às misturas do dia)
  { id: 'cardapio-dia',  label: 'Cardápio do Dia', ico: '🗒️', section: null, path: 'cardapio' },
  { id: 'produtos',      label: 'Produtos',        ico: '🥘', section: 'Administração' },
  { id: 'ingredientes',  label: 'Ingredientes',    ico: '🥕', section: null },
  { id: 'relatorios',    label: 'Relatórios',      ico: '📋', section: null },
  { id: 'financeiro',    label: 'Financeiro',      ico: '💰', section: null },
  { id: 'configuracoes', label: 'Configurações',   ico: '⚙️', section: null },
]

export default function Layout({ children, title = 'O Caipira', alertas = 0 }) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const atual = router.pathname.replace('/', '') || 'dashboard'

  // Protege rotas — redireciona se não logado
  useEffect(() => {
    if (typeof window !== 'undefined' && !sessionStorage.getItem('caipira_auth')) {
      router.push('/')
    }
  }, [])

  function navTo(item) {
    router.push('/' + (item.path || item.id))
    setSidebarOpen(false)
  }

  function logout() {
    sessionStorage.removeItem('caipira_auth')
    router.push('/')
  }

  return (
    <>
      <Head>
        <title>{title} · O Caipira</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 199 }}
        />
      )}

      <div className="layout">
        {/* ── SIDEBAR ── */}
        <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sb-logo">
            <div className="sb-logo-icon">🌽</div>
            <div>
              <div className="sb-logo-name">O Caipira</div>
              <div className="sb-logo-sub">gestão completa</div>
            </div>
          </div>

          {MENU.map((item) => (
            <div key={item.id}>
              {item.section && <div className="sb-sec">{item.section}</div>}
              <button
                className={`sb-item${atual === (item.path || item.id) ? ' active' : ''}`}
                onClick={() => navTo(item)}
              >
                <span className="ico">{item.ico}</span>
                {item.label}
                {item.badge === 'alertas' && alertas > 0 && (
                  <span className="sb-badge">{alertas}</span>
                )}
              </button>
            </div>
          ))}

          <div className="sb-footer">
            <button className="sb-item" onClick={logout}>
              <span className="ico">🚪</span> Sair
            </button>
          </div>
        </aside>

        {/* ── CONTEÚDO ── */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Topbar mobile */}
          <div className="topbar">
            <div className="topbar-logo">🌽 <span>Caipira</span></div>
            <button className="hbtn" onClick={() => setSidebarOpen(v => !v)}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>

          <main className="main-content">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
