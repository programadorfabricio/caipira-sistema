// pages/index.js — Tela de Login
import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Login() {
  const router = useRouter()
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [erro, setErro] = useState(false)

  function entrar(e) {
    e?.preventDefault()
    if (user === 'admin' && pass === '1234') {
      // Troque isso por Supabase Auth quando quiser login real
      sessionStorage.setItem('caipira_auth', '1')
      router.push('/dashboard')
    } else {
      setErro(true)
    }
  }

  return (
    <>
      <Head><title>O Caipira · Login</title></Head>
      <div style={styles.wrap}>
        <div style={styles.box}>
          <div style={styles.logo}>
            <div style={styles.logoIcon}>🌽</div>
            <h1 style={styles.logoTitle}>O Caipira</h1>
            <span style={styles.logoSub}>Sistema de Gestão · v2.0</span>
          </div>

          <form onSubmit={entrar}>
            <div className="fg">
              <label>Usuário</label>
              <input
                type="text"
                placeholder="admin"
                value={user}
                onChange={e => { setUser(e.target.value); setErro(false) }}
                autoComplete="username"
              />
            </div>
            <div className="fg">
              <label>Senha</label>
              <input
                type="password"
                placeholder="••••••"
                value={pass}
                onChange={e => { setPass(e.target.value); setErro(false) }}
                autoComplete="current-password"
              />
            </div>

            <p style={styles.hint}>Demo → usuário: <b>admin</b> · senha: <b>1234</b></p>

            {erro && <p style={styles.erro}>Usuário ou senha incorretos.</p>}

            <button type="submit" style={styles.btn}>Entrar no Sistema</button>
          </form>
        </div>
      </div>
    </>
  )
}

const styles = {
  wrap:      { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
  box:       { width: '100%', maxWidth: 420, padding: '2.5rem', background: 'var(--c1)', border: '1px solid var(--c3)', borderRadius: 18, boxShadow: '0 30px 80px rgba(0,0,0,.7)' },
  logo:      { textAlign: 'center', marginBottom: '2rem' },
  logoIcon:  { width: 64, height: 64, borderRadius: 16, background: 'var(--ora)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '.8rem', boxShadow: '0 8px 24px rgba(255,106,0,.4)' },
  logoTitle: { fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-.03em' },
  logoSub:   { fontSize: '.78rem', color: 'var(--txt)', fontFamily: 'var(--mono)' },
  hint:      { fontSize: '.73rem', color: 'var(--txt)', fontFamily: 'var(--mono)', opacity: .55, marginBottom: '1.4rem' },
  erro:      { color: 'var(--verm)', fontSize: '.8rem', fontFamily: 'var(--mono)', marginBottom: '.8rem', textAlign: 'center' },
  btn:       { width: '100%', padding: '1rem', border: 'none', borderRadius: 10, background: 'var(--ora)', color: '#000', fontFamily: 'var(--font)', fontSize: '1rem', fontWeight: 800, cursor: 'pointer' },
}
