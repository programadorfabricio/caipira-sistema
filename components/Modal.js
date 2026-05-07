// components/Modal.js
// Modal genérico reutilizável.
// Uso: <Modal open={bool} onClose={fn} title="Título"> ...conteúdo... </Modal>

export default function Modal({ open, onClose, title, children, actions }) {
  if (!open) return null

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">
          <span>{title}</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        {children}
        {actions && (
          <div className="modal-actions">{actions}</div>
        )}
      </div>
    </div>
  )
}
