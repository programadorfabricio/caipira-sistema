// pages/index.js — Login do sistema

import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { sb } from '@/lib/supabase'

const REDIRECT = {
  admin:   '/dashboard',
  caixa:   '/dashboard',
  garcom:  '/salao',
  cozinha: '/cozinha',
  estoque: '/estoque',
}

export default function Login() {
  const router = useRouter()
  const [email, setEmail]   = useState('')
  const [senha, setSenha]   = useState('')
  const [erro, setErro]     = useState('')
  const [loading, setLoading] = useState(false)

  async function logar(e) {
    e.preventDefault()
    setErro(''); setLoading(true)

    const { data, error } = await sb.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('Email ou senha incorretos.')
      setLoading(false)
      return
    }

    // Busca perfil do usuário
    const { data: perfil } = await sb
      .from('perfis')
      .select('*')
      .eq('user_id', data.user.id)
      .eq('ativo', true)
      .single()

    if (!perfil) {
      setErro('Usuário sem perfil cadastrado. Fale com o admin.')
      await sb.auth.signOut()
      setLoading(false)
      return
    }

    // Salva na sessão
    sessionStorage.setItem('caipira_auth', JSON.stringify({
      id:     data.user.id,
      email:  data.user.email,
      nome:   perfil.nome,
      perfil: perfil.perfil,
    }))

    router.push(REDIRECT[perfil.perfil] || '/dashboard')
  }

  return (
    <>
      <Head>
        <title>Login · Restaurante Caipira</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--preto)', padding:'1rem' }}>
        <div style={{ width:'100%', maxWidth:400, background:'var(--c1)', border:'1px solid var(--c2)', borderRadius:18, padding:'2.5rem 2rem' }}>

          {/* Logo */}
          <div style={{ textAlign:'center', marginBottom:'2rem' }}>
            <div style={{ width:64, height:64, borderRadius:16, background:'var(--ora)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'2rem', marginBottom:'1rem' }}>
              🌽
            </div>
            <div style={{ fontFamily:'var(--font)', fontWeight:800, fontSize:'1.4rem' }}>Restaurante Caipira</div>
            <div style={{ fontSize:'.8rem', color:'var(--txt)', fontFamily:'var(--mono)', marginTop:'.3rem' }}>Sistema de Gestão</div>
          </div>

          <form onSubmit={logar}>
            <div className="fg">
              <label>Email</label>
              <input type="email" placeholder="seu@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="fg">
              <label>Senha</label>
              <input type="password" placeholder="••••••••"
                value={senha} onChange={e => setSenha(e.target.value)} required />
            </div>

            {erro && (
              <div style={{ background:'rgba(231,76,60,.1)', border:'1px solid rgba(231,76,60,.3)', borderRadius:8, padding:'.7rem 1rem', fontSize:'.82rem', color:'var(--verm)', marginBottom:'1rem' }}>
                {erro}
              </div>
            )}

            <button type="submit" className="btn btn-ora" style={{ width:'100%', justifyContent:'center', padding:'.9rem', fontSize:'.95rem' }} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}