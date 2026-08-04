// lib/helpers.js
// Funções auxiliares usadas em múltiplas páginas.

/** Formata número como moeda brasileira: 32.5 → "R$ 32,50" */
export const R = (v) => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',')

/** Formata data ISO para PT-BR: "2025-04-21" → "21/04/2025" */
export const D = (s) => {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

/** Data e hora atual formatadas */
export const agora = () =>
  new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

/** Retorna a data de hoje no formato YYYY-MM-DD */
export const hoje = () => new Date().toISOString().slice(0, 10)

/** Retorna o mês atual no formato YYYY-MM */
export const meAtual = () => new Date().toISOString().slice(0, 7)

/** Retorna o mês anterior no formato YYYY-MM */
export const mesAnterior = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 7)
}

/** Calcula margem de lucro em % */
export const margem = (preco, custo) => {
  if (!preco || preco <= 0) return 0
  return Math.round(((preco - custo) / preco) * 100)
}

/** Cor da margem: verde ≥50%, laranja ≥25%, vermelho abaixo */
export const margemColor = (m) => {
  if (m >= 50) return 'var(--verde)'
  if (m >= 25) return 'var(--ora)'
  return 'var(--verm)'
}

/** Status do item de estoque */
export const statusEstoque = (item) => {
  if (item.qty === 0 || item.qty === null) return { label: 'Esgotado', cls: 'out' }
  if (item.qty < item.min) return { label: 'Baixo', cls: 'low' }
  return { label: 'OK', cls: 'ok' }
}

/** Status da comanda */
export const statusComanda = (status) => ({
  aberta:    { label: 'Aberta',    cls: 'badge-warn' },
  pronta:    { label: 'Pronta',    cls: 'badge-ok'   },
  entregue:  { label: 'Entregue', cls: 'badge-info'  },
  cancelada: { label: 'Cancelada',cls: 'badge-err'   },
  paga:      { label: 'Paga',     cls: 'badge-ok'    },
}[status] || { label: status, cls: 'badge-info' })

/** Gera número de comanda sequencial baseado em timestamp */
export const gerarNumComanda = () =>
  String(Date.now()).slice(-6)
