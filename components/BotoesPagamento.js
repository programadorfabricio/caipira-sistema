// components/BotoesPagamento.js
// Botões coloridos por forma de pagamento
// Uso: <BotoesPagamento onPagar={(forma) => pagarComanda(forma)} />

const PAGAMENTOS = [
  { key: 'PIX',            ico: '⚡', bg: '#0EA15A', label: 'PIX' },
  { key: 'Dinheiro',       ico: '💵', bg: '#D4A017', label: 'Dinheiro' },
  { key: 'Cartão débito',  ico: '💳', bg: '#2563EB', label: 'Débito' },
  { key: 'Cartão crédito', ico: '💳', bg: '#7C3AED', label: 'Crédito' },
  { key: 'Vale refeição',  ico: '🍽️', bg: '#EA580C', label: 'Vale Ref.' },
]

export default function BotoesPagamento({ onPagar, size = 'sm' }) {
  return (
    <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
      {PAGAMENTOS.map(p => (
        <button
          key={p.key}
          onClick={() => onPagar(p.key)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '.35rem',
            padding: size === 'sm' ? '.38rem .75rem' : '.6rem 1.1rem',
            borderRadius: 8, border: 'none', cursor: 'pointer',
            background: p.bg, color: '#fff',
            fontFamily: 'var(--font)', fontWeight: 700,
            fontSize: size === 'sm' ? '.73rem' : '.85rem',
            transition: 'filter .15s, transform .15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'none' }}
        >
          {p.ico} {p.label}
        </button>
      ))}
    </div>
  )
}

// Exporta a lista para usar em outros lugares
export { PAGAMENTOS }