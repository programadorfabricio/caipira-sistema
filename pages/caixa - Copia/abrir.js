// pages/caixa/abrir.js
import { useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import StatCard from '@/components/StatCard'
import { R } from '@/lib/helpers'

const NOTAS = [
  { key: 'n2',   label: 'Notas de R$ 2' },
  { key: 'n5',   label: 'Notas de R$ 5' },
  { key: 'n10',  label: 'Notas de R$ 10' },
  { key: 'n20',  label: 'Notas de R$ 20' },
  { key: 'n50',  label: 'Notas de R$ 50' },
  { key: 'n100', label: 'Notas de R$ 100' },
]

const VALOR = { n2: 2, n5: 5, n10: 10, n20: 20, n50: 50, n100: 100 }

export default function AbrirCaixa() {
  const router = useRouter()
  const [form, setForm] = useState({ n2: '', n5: '', n10: '', n20: '', n50: '', n100: '', moedas: '', observacoes: '' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const totalNotas = NOTAS.reduce((s, n) => s + (Number(form[n.key]) || 0) * VALOR[n.key], 0)
  const totalMoedas = Number(form.moedas) || 0
  const valorInicial = totalNotas + totalMoedas

  function setCampo(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function validar() {
    for (const n of NOTAS) {
      const v = form[n.key]
      if (v === '' || v === null) return `Informe a quantidade de ${n.label.toLowerCase()} (pode ser 0)`
      if (isNaN(Number(v)) || Number(v) < 0) return `${n.label}: informe um número positivo`
    }
    if (form.moedas !== '' && (isNaN(Number(form.moedas)) || Number(form.moedas) < 0)) {
      return 'Moedas: informe um número positivo'
    }
    return ''
  }

  async function abrirCaixa() {
    setErro('')
    const msgValidacao = validar()
    if (msgValidacao) { setErro(msgValidacao); return }

    setSalvando(true)
    try {
      const detalhes_notas_iniciais = NOTAS.reduce((o, n) => ({ ...o, [n.key]: Number(form[n.key]) || 0 }), { moedas: totalMoedas })
      const res = await fetch('/api/caixa/abrir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valor_inicial_dinheiro: valorInicial,
          detalhes_notas_iniciais,
          observacoes: form.observacoes,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErro(json.error || 'Erro ao abrir caixa')
        return
      }
      alert('✅ Caixa aberto com sucesso!')
      router.push('/dashboard')
    } catch (e) {
      setErro('Erro de conexão ao abrir caixa')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Layout title="Abrir Caixa">
      <div className="ph">
        <div><h2>Abrir Caixa</h2><div className="ph-sub">Conferência do fundo de troco no início do dia</div></div>
      </div>

      <div className="sg" style={{ gridTemplateColumns: '1fr' }}>
        <StatCard label="Valor Inicial em Dinheiro" value={R(valorInicial)} detail="calculado a partir das notas e moedas" color="ora" glow />
      </div>

      <div className="panel">
        <div className="panel-hd"><div className="panel-title">Notas</div></div>
        <div className="form-row3">
          {NOTAS.slice(0, 3).map(n => (
            <div className="fg" key={n.key}>
              <label>{n.label}</label>
              <input type="number" min="0" step="1" placeholder="0"
                value={form[n.key]}
                onChange={e => setCampo(n.key, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="form-row3">
          {NOTAS.slice(3, 6).map(n => (
            <div className="fg" key={n.key}>
              <label>{n.label}</label>
              <input type="number" min="0" step="1" placeholder="0"
                value={form[n.key]}
                onChange={e => setCampo(n.key, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="form-row">
          <div className="fg">
            <label>Moedas (R$) — opcional</label>
            <input type="number" min="0" step="0.01" placeholder="0,00"
              value={form.moedas}
              onChange={e => setCampo('moedas', e.target.value)} />
          </div>
          <div className="fg">
            <label>Observações</label>
            <input value={form.observacoes} onChange={e => setCampo('observacoes', e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        {erro && (
          <div className="badge out" style={{ display: 'block', padding: '.7rem 1rem', marginBottom: '1rem', fontSize: '.78rem' }}>
            ⚠️ {erro}
          </div>
        )}

        <button className="btn btn-ora" style={{ width: '100%', justifyContent: 'center' }} disabled={salvando} onClick={abrirCaixa}>
          {salvando ? 'Abrindo...' : 'Abrir Caixa'}
        </button>
      </div>
    </Layout>
  )
}
