// components/PrintComanda.js
// Renderiza a comanda no formato para impressão térmica (80mm).
// Uso: <PrintComanda comanda={obj} /> — depois window.print()

import { useEffect, useRef } from 'react'
import { R, agora } from '@/lib/helpers'

export default function PrintComanda({ comanda }) {
  const RESTAURANTE = process.env.NEXT_PUBLIC_RESTAURANTE_NOME    || 'O Caipira'
  const ENDERECO    = process.env.NEXT_PUBLIC_RESTAURANTE_ENDERECO || ''
  const TELEFONE    = process.env.NEXT_PUBLIC_RESTAURANTE_TELEFONE || ''
  const PIX         = process.env.NEXT_PUBLIC_PIX_CHAVE            || ''

  if (!comanda) return null

  const itens = comanda.comanda_itens || []
  const subtotal = itens.reduce((s, i) => s + (i.quantidade * i.preco_unitario), 0)

  return (
    <div className="print-area" id="print-comanda">
      {/* Cabeçalho */}
      <div style={s.center}>
        <div style={s.title}>🌽 {RESTAURANTE}</div>
        {ENDERECO  && <div style={s.small}>{ENDERECO}</div>}
        {TELEFONE  && <div style={s.small}>{TELEFONE}</div>}
      </div>

      <div style={s.divider}>{'- '.repeat(22)}</div>

      {/* Dados da comanda */}
      <div style={s.row}><span style={s.bold}>Comanda #:</span> {comanda.numero}</div>
      <div style={s.row}><span style={s.bold}>Cliente:</span>   {comanda.cliente_nome}</div>
      <div style={s.row}><span style={s.bold}>Origem:</span>    {comanda.origem}</div>
      {comanda.mesa && <div style={s.row}><span style={s.bold}>Mesa:</span> {comanda.mesa}</div>}
      <div style={s.row}><span style={s.bold}>Data:</span>      {agora()}</div>

      <div style={s.divider}>{'- '.repeat(22)}</div>

      {/* Itens */}
      <div style={{ ...s.bold, marginBottom: 4 }}>ITENS DO PEDIDO</div>
      {itens.map((item, i) => (
        <div key={i} style={s.itemRow}>
          <span>{item.quantidade}x {item.produtos?.nome || item.nome}</span>
          <span>{R(item.quantidade * item.preco_unitario)}</span>
        </div>
      ))}

      <div style={s.divider}>{'= '.repeat(22)}</div>

      {/* Total */}
      <div style={{ ...s.row, ...s.totalRow }}>
        <span style={s.bold}>TOTAL</span>
        <span style={s.totalVal}>{R(comanda.total || subtotal)}</span>
      </div>

      {comanda.forma_pagamento && (
        <div style={s.row}>
          <span style={s.bold}>Pagamento:</span> {comanda.forma_pagamento}
        </div>
      )}

      {/* PIX */}
      {PIX && (
        <>
          <div style={s.divider}>{'- '.repeat(22)}</div>
          <div style={s.center}>
            <div style={s.bold}>PAGAMENTO VIA PIX</div>
            <div style={s.small}>Chave: {PIX}</div>
            {/* QR Code — gerado via lib qrcode no servidor ou API */}
            <div style={{ margin: '8px 0', fontSize: 10 }}>
              [QR Code gerado automaticamente]
            </div>
          </div>
        </>
      )}

      {comanda.obs && (
        <>
          <div style={s.divider}>{'- '.repeat(22)}</div>
          <div style={s.small}>Obs: {comanda.obs}</div>
        </>
      )}

      <div style={s.divider}>{'- '.repeat(22)}</div>
      <div style={s.center}>
        <div style={s.small}>Obrigado pela preferência! 🌽</div>
      </div>
    </div>
  )
}

const s = {
  center:   { textAlign: 'center', marginBottom: 4 },
  title:    { fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  small:    { fontSize: 10, marginBottom: 2 },
  bold:     { fontWeight: 'bold' },
  divider:  { margin: '6px 0', fontSize: 9, letterSpacing: 1, color: '#555' },
  row:      { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 },
  itemRow:  { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 },
  totalRow: { fontSize: 13, marginTop: 4 },
  totalVal: { fontWeight: 'bold', fontSize: 14 },
}
