// components/PrintComanda.js
import { R, agora } from '@/lib/helpers'

const ORIGEM_INFO = {
  'Mesa':     { ico: '🍽️', tipo: 'PRATO FEITO - MESA'         },
  'Balcão':   { ico: '🥡', tipo: 'MARMITA / RETIRADA - BALCÃO' },
  'WhatsApp': { ico: '📱', tipo: 'PEDIDO WHATSAPP'              },
  'iFood':    { ico: '🛵', tipo: 'DELIVERY - IFOOD'             },
  'Outro':    { ico: '📦', tipo: 'PEDIDO'                       },
}

export default function PrintComanda({ comanda }) {
  const RESTAURANTE = process.env.NEXT_PUBLIC_RESTAURANTE_NOME     || 'O Caipira'
  const ENDERECO    = process.env.NEXT_PUBLIC_RESTAURANTE_ENDERECO  || ''
  const TELEFONE    = process.env.NEXT_PUBLIC_RESTAURANTE_TELEFONE  || ''
  const PIX         = process.env.NEXT_PUBLIC_PIX_CHAVE             || ''

  if (!comanda) return null

  const itens    = comanda.comanda_itens || []
  const subtotal = itens.reduce((s, i) => s + (i.quantidade * i.preco_unitario), 0)
  const orig     = ORIGEM_INFO[comanda.origem] || ORIGEM_INFO['Outro']
  const isDelivery = ['WhatsApp', 'iFood'].includes(comanda.origem)

  // Tipo de pedido em destaque
  let tipoPedido = orig.tipo
  if (isDelivery && comanda.retirada) tipoPedido = orig.ico + ' RETIRADA NO LOCAL'
  if (isDelivery && !comanda.retirada) tipoPedido = orig.ico + ' ENTREGA - ' + (comanda.origem).toUpperCase()

  return (
    <div className="print-area" id="print-comanda">

      {/* Cabeçalho */}
      <div style={s.center}>
        <div style={s.title}>🌽 {RESTAURANTE}</div>
        {ENDERECO && <div style={s.small}>{ENDERECO}</div>}
        {TELEFONE && <div style={s.small}>{TELEFONE}</div>}
      </div>

      <div style={s.divider}>{'='.repeat(32)}</div>

      {/* ★ TIPO DO PEDIDO — bem grande para a cozinha ver */}
      <div style={s.tipoBanner}>
        {orig.ico} {tipoPedido}
      </div>

      <div style={s.divider}>{'='.repeat(32)}</div>

      {/* Dados */}
      <div style={s.row}><span style={s.bold}>Comanda #:</span><span>{comanda.numero}</span></div>
      <div style={s.row}><span style={s.bold}>Cliente:</span><span>{comanda.cliente_nome}</span></div>
      {comanda.telefone && <div style={s.row}><span style={s.bold}>Telefone:</span><span>{comanda.telefone}</span></div>}
      {comanda.mesa     && <div style={s.row}><span style={s.bold}>Mesa:</span><span>{comanda.mesa}</span></div>}
      <div style={s.row}><span style={s.bold}>Data/Hora:</span><span>{agora()}</span></div>

      {/* Endereço de entrega */}
      {isDelivery && !comanda.retirada && comanda.endereco && (
        <>
          <div style={s.divider}>{'- '.repeat(16)}</div>
          <div style={{ ...s.bold, fontSize: 11, marginBottom: 3 }}>📍 ENDEREÇO DE ENTREGA:</div>
          <div style={{ fontSize: 11, marginBottom: 4 }}>{comanda.endereco}</div>
        </>
      )}

      {/* Retirada */}
      {isDelivery && comanda.retirada && (
        <>
          <div style={s.divider}>{'- '.repeat(16)}</div>
          <div style={{ ...s.bold, fontSize: 11, textAlign: 'center' }}>🏃 CLIENTE VAI RETIRAR NO LOCAL</div>
        </>
      )}

      <div style={s.divider}>{'- '.repeat(16)}</div>

      {/* Acompanhamentos inclusos */}
      {comanda.acompanhamentos && (
        <>
          <div style={s.divider}>{'- '.repeat(16)}</div>
          <div style={{ ...s.bold, fontSize: 11, marginBottom: 3 }}>🍚 ACOMPANHA:</div>
          <div style={{ fontSize: 11, marginBottom: 4 }}>{comanda.acompanhamentos}</div>
        </>
      )}

      {/* Itens */}
      <div style={{ ...s.bold, marginBottom: 4, fontSize: 11 }}>ITENS DO PEDIDO:</div>
      {itens.map((item, i) => (
        <div key={i}>
          <div style={s.itemRow}>
            <span style={{ fontWeight: 'bold' }}>{item.quantidade}x {item.produtos?.nome || item.nome}</span>
            <span>{R(item.quantidade * item.preco_unitario)}</span>
          </div>
          {item.obs && (
            <div style={{ fontSize: 10, color: '#555', paddingLeft: 12, marginBottom: 3 }}>
              └ obs: {item.obs}
            </div>
          )}
        </div>
      ))}

      {/* Observação geral */}
      {comanda.obs && (
        <>
          <div style={s.divider}>{'- '.repeat(16)}</div>
          <div style={{ fontSize: 11, fontWeight: 'bold' }}>⚠️ OBSERVAÇÃO GERAL:</div>
          <div style={{ fontSize: 11, marginTop: 3 }}>{comanda.obs}</div>
        </>
      )}

      <div style={s.divider}>{'='.repeat(32)}</div>

      {/* Total */}
      <div style={{ ...s.row, ...s.totalRow }}>
        <span style={s.bold}>TOTAL</span>
        <span style={s.totalVal}>{R(comanda.total || subtotal)}</span>
      </div>

      {comanda.forma_pagamento && (
        <div style={s.row}>
          <span style={s.bold}>Pagamento:</span>
          <span>{comanda.forma_pagamento}</span>
        </div>
      )}

      {/* PIX */}
      {PIX && (
        <>
          <div style={s.divider}>{'- '.repeat(16)}</div>
          <div style={s.center}>
            <div style={s.bold}>PAGAMENTO VIA PIX</div>
            <div style={s.small}>Chave: {PIX}</div>
          </div>
        </>
      )}

      <div style={s.divider}>{'- '.repeat(16)}</div>
      <div style={s.center}>
        <div style={s.small}>Obrigado pela preferência! 🌽</div>
      </div>
    </div>
  )
}

const s = {
  center:    { textAlign: 'center', marginBottom: 4 },
  title:     { fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  small:     { fontSize: 10, marginBottom: 2 },
  bold:      { fontWeight: 'bold' },
  divider:   { margin: '6px 0', fontSize: 9, color: '#555' },
  row:       { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 },
  itemRow:   { display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 },
  totalRow:  { fontSize: 13, marginTop: 4 },
  totalVal:  { fontWeight: 'bold', fontSize: 14 },
  // Banner de tipo bem grande
  tipoBanner: {
    textAlign: 'center', fontWeight: 'bold', fontSize: 13,
    padding: '6px 0', letterSpacing: 1,
  },
}