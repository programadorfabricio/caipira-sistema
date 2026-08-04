// lib/db.js
// Todas as operações de banco ficam AQUI.
// As páginas importam daqui — nunca usam sb.from() diretamente.

import { sb } from './supabase'

// ─── ESTOQUE ────────────────────────────────────────────
export const getEstoque = () =>
  sb.from('estoque').select('*').order('nome')

export const addEstoque = (dados) =>
  sb.from('estoque').insert(dados).select().single()

export const updateEstoque = (id, dados) =>
  sb.from('estoque').update(dados).eq('id', id).select().single()

export const deleteEstoque = (id) =>
  sb.from('estoque').delete().eq('id', id)

// ─── MOVIMENTAÇÕES ──────────────────────────────────────
export const getMovimentacoes = (limit = 50) =>
  sb.from('movimentacoes').select('*').order('created_at', { ascending: false }).limit(limit)

export const addMovimentacao = (dados) =>
  sb.from('movimentacoes').insert(dados).select().single()

// ─── FINANCEIRO ─────────────────────────────────────────
export const getFinanceiro = ({ inicio, fim } = {}) => {
  let q = sb.from('financeiro').select('*').order('data', { ascending: false })
  if (inicio) q = q.gte('data', inicio)
  if (fim)    q = q.lte('data', fim)
  return q
}

export const addFinanceiro = (dados) =>
  sb.from('financeiro').insert(dados).select().single()

export const deleteFinanceiro = (id) =>
  sb.from('financeiro').delete().eq('id', id)

// ─── PRODUTOS ───────────────────────────────────────────
export const getProdutos = () =>
  sb.from('produtos').select('*').order('nome')

export const addProduto = (dados) =>
  sb.from('produtos').insert(dados).select().single()

export const updateProduto = (id, dados) =>
  sb.from('produtos').update(dados).eq('id', id).select().single()

export const deleteProduto = (id) =>
  sb.from('produtos').delete().eq('id', id)

// ─── INGREDIENTES ────────────────────────────────────────
export const getIngredientes = () =>
  sb.from('ingredientes').select('*').order('nome')

export const addIngrediente = (dados) =>
  sb.from('ingredientes').insert(dados).select().single()

export const updateIngrediente = (id, dados) =>
  sb.from('ingredientes').update(dados).eq('id', id).select().single()

export const deleteIngrediente = (id) =>
  sb.from('ingredientes').delete().eq('id', id)

// ─── COMANDAS ────────────────────────────────────────────
export const getComandas = (status = null) => {
  let q = sb
    .from('comandas')
    .select('*, comanda_itens(*, produtos(nome, preco))')
    .order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  return q
}

export const getComandasPagasPorData = (data) =>
  sb.from('comandas').select('total, forma_pagamento').eq('status', 'paga').eq('data', data)

export const getComandaById = (id) =>
  sb
    .from('comandas')
    .select('*, comanda_itens(*, produtos(nome, preco))')
    .eq('id', id)
    .single()

export const addComanda = (dados) =>
  sb.from('comandas').insert(dados).select().single()

export const updateComanda = (id, dados) =>
  sb.from('comandas').update(dados).eq('id', id).select().single()

export const addItemComanda = (dados) =>
  sb.from('comanda_itens').insert(dados).select().single()

export const removeItemComanda = (id) =>
  sb.from('comanda_itens').delete().eq('id', id)

// ─── CAIXA DIÁRIA ───────────────────────────────────────
export const getCaixaAberto = (data) =>
  sb.from('caixa_diaria').select('*').eq('data', data).eq('status', 'aberto').maybeSingle()

export const getCaixaById = (id) =>
  sb.from('caixa_diaria').select('*').eq('id', id).single()

export const addCaixa = (dados) =>
  sb.from('caixa_diaria').insert(dados).select().single()

export const updateCaixa = (id, dados) =>
  sb.from('caixa_diaria').update(dados).eq('id', id).select().single()

/** Fecha comanda e lança a venda automaticamente no financeiro */
export const fecharComanda = async (comanda) => {
  // 1. Marca como paga
  await updateComanda(comanda.id, { status: 'paga' })

  // 2. Lança a venda no financeiro automaticamente
  await addFinanceiro({
    tipo: 'venda',
    descricao: `Comanda #${comanda.numero} — ${comanda.cliente_nome}`,
    val: comanda.total,
    data: new Date().toISOString().slice(0, 10),
    cat: comanda.origem === 'delivery' ? 'Delivery' : 'Vendas',
    pag: comanda.forma_pagamento || 'PIX',
    obs: `Origem: ${comanda.origem}`
  })
}
