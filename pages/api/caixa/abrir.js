// pages/api/caixa/abrir.js
// POST /api/caixa/abrir — abre o caixa do dia com o valor inicial em dinheiro.

import { getCaixaAberto, addCaixa } from '@/lib/db'
import { hoje } from '@/lib/helpers'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { valor_inicial_dinheiro, detalhes_notas_iniciais, observacoes } = req.body || {}

  if (valor_inicial_dinheiro === undefined || valor_inicial_dinheiro === null || isNaN(Number(valor_inicial_dinheiro))) {
    return res.status(400).json({ error: 'valor_inicial_dinheiro é obrigatório' })
  }

  const data = hoje()

  const { data: aberto } = await getCaixaAberto(data)
  if (aberto) {
    return res.status(409).json({ error: 'Já existe um caixa aberto hoje', caixa: aberto })
  }

  const { data: caixa, error } = await addCaixa({
    data,
    status: 'aberto',
    valor_inicial_dinheiro: Number(valor_inicial_dinheiro),
    detalhes_notas_iniciais: detalhes_notas_iniciais || {},
    observacoes: observacoes || '',
  })

  if (error) return res.status(500).json({ error: error.message })

  return res.status(201).json({ caixa })
}
