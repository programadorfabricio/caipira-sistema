// pages/api/caixa/status.js
// GET /api/caixa/status — retorna o caixa aberto hoje (ou null), junto com
// o total de vendas do dia (para a tela de fechamento mostrar antes de confirmar).

import { getCaixaAberto, getComandasPagasPorData } from '@/lib/db'
import { hoje } from '@/lib/helpers'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { data: caixa, error } = await getCaixaAberto(hoje())
  if (error) return res.status(500).json({ error: error.message })

  if (!caixa) {
    return res.status(200).json({ caixa: null, totalVendasDia: 0, vendasDinheiro: 0 })
  }

  const { data: comandas, error: erroComandas } = await getComandasPagasPorData(caixa.data)
  if (erroComandas) return res.status(500).json({ error: erroComandas.message })

  const totalVendasDia = (comandas || []).reduce((s, c) => s + Number(c.total), 0)
  const vendasDinheiro = (comandas || [])
    .filter(c => c.forma_pagamento === 'Dinheiro')
    .reduce((s, c) => s + Number(c.total), 0)

  return res.status(200).json({ caixa, totalVendasDia, vendasDinheiro })
}
