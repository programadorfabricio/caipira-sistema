import { R } from '@/lib/helpers'

export default function ComandaCard({ c, statusComanda, onAbrir, onImprimir }) {
  const st = statusComanda(c.status)
  const itens = c.comanda_itens || []

  return (
    <div className={`comanda-card ${c.status}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="comanda-num">#{c.numero}</div>
          <div className="comanda-cliente">{c.cliente_nome}</div>
          <div className="comanda-origem">
            {c.origem}{c.mesa ? ` · Mesa ${c.mesa}` : ''}
          </div>
        </div>

        <span className={`badge ${st.cls}`}>{st.label}</span>
      </div>

      <div className="comanda-itens-preview">
        {itens.length === 0
          ? 'Nenhum item ainda'
          : itens.slice(0, 3).map((i, idx) => (
              <div key={idx}>
                {i.quantidade}x {i.produtos?.nome || i.nome}
              </div>
            ))
        }

        {itens.length > 3 && (
          <div style={{ color: 'var(--txt)' }}>
            +{itens.length - 3} itens...
          </div>
        )}
      </div>

      <div className="comanda-footer">
        <div className="comanda-total">{R(c.total)}</div>

        <div className="comanda-actions">
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={() => onImprimir(c)}
          >
            🖨️
          </button>

          <button
            className="btn btn-ora btn-sm"
            onClick={() => onAbrir(c)}
          >
            Abrir
          </button>
        </div>
      </div>
    </div>
  )
}