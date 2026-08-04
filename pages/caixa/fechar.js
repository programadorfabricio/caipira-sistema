// pages/caixa/fechar.js
import { useState, useEffect } from 'react'
import Link from 'next/link'
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

export default function FecharCaixa() {
  const [loading, setLoading] = useState(true)
  const [caixa, setCaixa] = useState(null)
  const [totalVendasDia, setTotalVendasDia] = useState(0)
  const [vendasDinheiro, setVendasDinheiro] = useState(0)
  const [form, setForm] = useState({ n2: '', n5: '', n10: '', n20: '', n50: '', n100: '', moedas: '', observacoes: '' })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [resultado, setResultado] = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const res = await fetch('/api/caixa/status')
    const json = await res.json()
    setCaixa(json.caixa || null)
    setTotalVendasDia(json.totalVendasDia || 0)
    setVendasDinheiro(json.vendasDinheiro || 0)
    setLoading(false)
  }

  function setCampo(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const totalNotas = NOTAS.reduce((s, n) => s + (Number(form[n.key]) || 0) * VALOR[n.key], 0)
  const totalMoedas = Number(form.moedas) || 0
  const valorFinal = totalNotas + totalMoedas
  const valorInicial = Number(caixa?.valor_inicial_dinheiro) || 0
  const diferencaPrevista = valorFinal - valorInicial - vendasDinheiro

  function corDiferenca(d) {
    if (d === 0) return 'vd'
    if (d < 0) return 'vm'
    return 'am'
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

  async function fecharCaixa() {
    setErro('')
    const msgValidacao = validar()
    if (msgValidacao) { setErro(msgValidacao); return }

    setSalvando(true)
    try {
      const detalhes_notas_finais = NOTAS.reduce((o, n) => ({ ...o, [n.key]: Number(form[n.key]) || 0 }), { moedas: totalMoedas })
      const res = await fetch('/api/caixa/fechar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: caixa.id,
          valor_final_dinheiro: valorFinal,
          detalhes_notas_finais,
          observacoes: form.observacoes,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErro(json.error || 'Erro ao fechar caixa')
        return
      }
      setResultado(json.caixa)
    } catch (e) {
      setErro('Erro de conexão ao fechar caixa')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <Layout title="Fechar Caixa"><div className="loading-overlay"><div className="loading-icon">🌽</div></div></Layout>

  if (!caixa) {
    return (
      <Layout title="Fechar Caixa">
        <div className="ph">
          <div><h2>Fechar Caixa</h2><div className="ph-sub">Conferência de dinheiro no fim do dia</div></div>
        </div>
        <div className="panel">
          <div className="empty">
            <div className="empty-ico">💰</div>
            <div className="empty-title">Nenhum caixa aberto hoje</div>
            <div className="empty-sub">Abra o caixa antes de poder fechá-lo.</div>
            <Link href="/caixa/abrir" className="btn btn-ora" style={{ marginTop: '1.2rem', display: 'inline-flex' }}>Abrir Caixa</Link>
          </div>
        </div>
      </Layout>
    )
  }

  if (resultado) {
    return (
      <Layout title="Fechar Caixa">
        <div className="ph">
          <div><h2>Fechar Caixa</h2><div className="ph-sub">Caixa fechado com sucesso</div></div>
        </div>
        <div className="panel">
          <div className="empty">
            <div className="empty-ico">✅</div>
            <div className="empty-title">Caixa fechado com sucesso</div>
            <div className="sg" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '1.6rem' }}>
              <StatCard label="Total de Vendas do Dia" value={R(resultado.total_vendas_dia)} color="az" />
              <StatCard label="Diferença" value={R(resultado.diferenca)} detail={resultado.diferenca === 0 ? 'confere ✅' : resultado.diferenca < 0 ? 'faltou dinheiro' : 'sobrou dinheiro'} color={corDiferenca(resultado.diferenca)} glow />
            </div>
            <Link href="/dashboard" className="btn btn-ghost" style={{ marginTop: '1.6rem', display: 'inline-flex' }}>Voltar ao Dashboard</Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Fechar Caixa">
      <div className="ph">
        <div><h2>Fechar Caixa</h2><div className="ph-sub">Conferência de dinheiro no fim do dia</div></div>
      </div>

      <div className="sg">
        <StatCard label="Total de Vendas do Dia" value={R(totalVendasDia)} detail="todas as formas de pagamento" color="az" />
        <StatCard label="Vendas em Dinheiro" value={R(vendasDinheiro)} detail="usado no cálculo da diferença" color="vd" />
        <StatCard label="Valor Inicial" value={R(valorInicial)} detail="fundo de troco de hoje" />
        <StatCard label="Diferença Prevista" value={R(diferencaPrevista)} detail={diferencaPrevista === 0 ? 'confere ✅' : diferencaPrevista < 0 ? 'faltou dinheiro' : 'sobrou dinheiro'} color={corDiferenca(diferencaPrevista)} glow />
      </div>

      <div className="panel">
        <div className="panel-hd"><div className="panel-title">Notas Contadas (fechamento)</div></div>
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

        <button className="btn btn-ora" style={{ width: '100%', justifyContent: 'center' }} disabled={salvando} onClick={fecharCaixa}>
          {salvando ? 'Fechando...' : 'Confirmar Fechamento'}
        </button>
      </div>
    </Layout>
  )
}
