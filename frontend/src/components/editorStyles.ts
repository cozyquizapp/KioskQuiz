import type React from 'react';

// Modal Styles
export const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 20
};

export const modalStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(15,23,42,0.98), rgba(10,14,24,0.98))',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 16,
  width: '100%',
  maxWidth: 700,
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
};

export const modalHeaderStyle: React.CSSProperties = {
  padding: '20px 24px',
  borderBottom: '1px solid rgba(148,163,184,0.2)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

export const modalContentStyle: React.CSSProperties = {
  padding: '24px',
  overflowY: 'auto',
  flex: 1
};

export const modalFooterStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderTop: '1px solid rgba(148,163,184,0.2)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

// Form Styles
export const formSectionStyle: React.CSSProperties = {
  marginBottom: 20
};

export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: '#cbd5e1',
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

export const inputStyle: React.CSSProperties = {
  background: 'rgba(15,23,42,0.6)',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#f1f5f9',
  fontSize: 14,
  width: '100%',
  outline: 'none'
};

export const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical',
  fontFamily: 'inherit'
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle
};

// Button Styles
export const uploadButtonStyle: React.CSSProperties = {
  background: 'rgba(59,130,246,0.2)',
  border: '1px solid rgba(59,130,246,0.4)',
  borderRadius: 8,
  padding: '10px 16px',
  color: '#60a5fa',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: 13
};

export const closeButtonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#e2e8f0',
  cursor: 'pointer',
  padding: '6px 12px',
  fontSize: 14
};

export const deleteButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid rgba(239,68,68,0.4)',
  background: 'rgba(239,68,68,0.1)',
  color: '#fca5a5',
  cursor: 'pointer',
  fontWeight: 600
};

export const cancelButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)',
  color: '#e2e8f0',
  cursor: 'pointer',
  fontWeight: 600
};

export const saveButtonStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid rgba(34,211,238,0.4)',
  background: 'rgba(34,211,238,0.2)',
  color: '#22d3ee',
  cursor: 'pointer',
  fontWeight: 600
};

// Preview Styles
export const imagePreviewStyle: React.CSSProperties = {
  marginBottom: 12,
  textAlign: 'center'
};

// Notification Styles
export const errorNotificationStyle: React.CSSProperties = {
  position: 'fixed',
  top: 20,
  right: 20,
  background: 'rgba(239,68,68,0.95)',
  border: '1px solid rgba(239,68,68,0.4)',
  borderRadius: 8,
  padding: '12px 16px',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  zIndex: 10000,
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  animation: 'slideInRight 0.3s ease-out'
};

export const successNotificationStyle: React.CSSProperties = {
  ...errorNotificationStyle,
  background: 'rgba(34,197,94,0.95)',
  border: '1px solid rgba(34,197,94,0.4)'
};
