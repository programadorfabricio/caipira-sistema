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

/** Tipos de prato vendidos. key "Marmitex" é usado por vendas.js/whatsapp.js
 *  para identificar a marmita (feijoada é tratada como mistura, não como tipo). */
export const TIPOS_PRATO = [
  { key: 'Marmitex',    label: 'Marmita',     ico: '🍱', local: ['vendas', 'whatsapp'] },
  { key: 'Prato Feito', label: 'Prato Feito', ico: '🍽️', local: ['vendas', 'whatsapp'] },
]

/** Tamanhos disponíveis. `misturas` é o máximo de misturas selecionáveis
 *  (a 2ª é cobrada como adicional em P/M — ver getPreco). */
export const TAMANHOS = [
  { key: 'P', label: 'Pequena', misturas: 2 },
  { key: 'M', label: 'Média',   misturas: 2 },
  { key: 'G', label: 'Grande',  misturas: 2 },
]

const PRECOS_MARMITA = { P: 21.00, M: 25.00, G: 33.00 }
const PRECOS_MARMITA_FEIJOADA = { P: 22.00, M: 27.00, G: 35.00 }
const PRECOS_PRATO_FEITO = { P: 24.50, M: 27.50, G: 30.50 }
const ADICIONAL_MARMITA = 7.00
const ADICIONAL_PRATO_FEITO = 2.00

/** Preço do prato conforme tipo, tamanho e misturas escolhidas.
 *  G já vem com 2 misturas de fábrica, nunca cobra adicional.
 *  Marmita de feijoada é sempre 1 mistura só, em qualquer tamanho. */
export const getPreco = (sb, tipoPrato, tamanho, misturas = []) => {
  const lista = Array.isArray(misturas) ? misturas : []
  const ehFeijoada = lista.some((m) => (m?.nome || '').toLowerCase().includes('feijoada'))
  const numMisturas = lista.length || 1

  if (tipoPrato === 'Marmitex') {
    if (ehFeijoada) return PRECOS_MARMITA_FEIJOADA[tamanho] ?? 0
    const base = PRECOS_MARMITA[tamanho] ?? 0
    const adicional = numMisturas >= 2 && tamanho !== 'G' ? ADICIONAL_MARMITA : 0
    return base + adicional
  }

  const base = PRECOS_PRATO_FEITO[tamanho] ?? 0
  const adicional = numMisturas >= 2 && tamanho !== 'G' ? ADICIONAL_PRATO_FEITO : 0
  return base + adicional
}

/** Status do pedido (wpp_pedidos). Reaproveita as cores de statusComanda
 *  traduzindo para o gênero de "pedido" (aberto/pronto/pago/cancelado). */
export const statusPedido = (status) => {
  const LABELS = {
    aberto: 'Aberto',
    pronto: 'Pronto',
    saiu: 'Saiu para entrega',
    pago: 'Pago',
    cancelado: 'Cancelado',
  }
  const EQUIVALENTE_COMANDA = {
    aberto: 'aberta',
    pronto: 'pronta',
    saiu: 'pronta',
    pago: 'paga',
    cancelado: 'cancelada',
  }
  const { cls } = statusComanda(EQUIVALENTE_COMANDA[status] || status)
  return { label: LABELS[status] || status, cls }
}
