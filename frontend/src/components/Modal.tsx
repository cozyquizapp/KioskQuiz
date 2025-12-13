import React from 'react'

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

const backdrop: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 12,
}

const sheet: React.CSSProperties = {
  width: 'min(720px, 100%)',
  background: 'rgba(13,17,26,0.95)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 16,
  padding: 16,
  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null
  return (
    <div style={backdrop} onClick={onClose}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          {title && <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              color: '#e2e8f0',
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            Schliessen
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
