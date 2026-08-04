// pages/api/caixa/fechar.js
// POST /api/caixa/fechar — fecha o caixa, calculando total de vendas do dia
// e a diferença entre o dinheiro contado e o esperado (inicial + vendas em dinheiro).

import { getCaixaById, getComandasPagasPorData, updateCaixa } from '@/lib/db'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { id, valor_final_dinheiro, detalhes_notas_finais, observacoes } = req.body || {}

  if (!id) return res.status(400).json({ error: 'id é obrigatório' })
  if (valor_final_dinheiro === undefined || valor_final_dinheiro === null || isNaN(Number(valor_final_dinheiro))) {
    return res.status(400).json({ error: 'valor_final_dinheiro é obrigatório' })
  }

  const { data: caixa, error: erroCaixa } = await getCaixaById(id)
  if (erroCaixa || !caixa) return res.status(404).json({ error: 'Caixa não encontrado' })
  if (caixa.status !== 'aberto') return res.status(409).json({ error: 'Caixa já está fechado' })

  const { data: comandas, error: erroComandas } = await getComandasPagasPorData(caixa.data)
  if (erroComandas) return res.status(500).json({ error: erroComandas.message })

  const totalVendasDia = (comandas || []).reduce((s, c) => s + Number(c.total), 0)
  const vendasDinheiro = (comandas || [])
    .filter(c => c.forma_pagamento === 'Dinheiro')
    .reduce((s, c) => s + Number(c.total), 0)

  const esperado = Number(caixa.valor_inicial_dinheiro) + vendasDinheiro
  const diferenca = Number(valor_final_dinheiro) - esperado

  const { data: caixaFechado, error } = await updateCaixa(id, {
    status: 'fechado',
    total_vendas_dia: totalVendasDia,
    valor_final_dinheiro: Number(valor_final_dinheiro),
    detalhes_notas_finais: detalhes_notas_finais || {},
    diferenca,
    observacoes: observacoes ?? caixa.observacoes,
    fechado_em: new Date().toISOString(),
  })

  if (error) return res.status(500).json({ error: error.message })

  return res.status(200).json({ caixa: caixaFechado })
}
