// components/StatCard.js
// Uso: <StatCard label="Receita" value="R$ 1.200" detail="12 lançamentos" color="vd" glow />

export default function StatCard({ label, value, detail, color = '', glow = false }) {
  return (
    <div className="sc">
      {glow && <div className="sc-glow" />}
      <div className="sc-label">{label}</div>
      <div className={`sc-val ${color}`}>{value}</div>
      {detail && <div className="sc-detail">{detail}</div>}
    </div>
  )
}
