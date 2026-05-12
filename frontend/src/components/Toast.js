import React, { useState, useEffect, useCallback } from 'react';

// ── Global toast event system ──────────────────────────────────
const listeners = [];

function emit(message, type) {
  const id = Date.now() + Math.random();
  listeners.forEach(fn => fn({ id, message, type }));
}

export const toast = {
  success: (msg) => emit(msg, 'success'),
  error:   (msg) => emit(msg, 'error'),
  info:    (msg) => emit(msg, 'info'),
};

// Make toast available globally
if (typeof window !== 'undefined') {
  window.__toast = toast;
}

// ── Individual Toast Item ──────────────────────────────────────
function ToastItem({ id, message, type, onRemove }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));
    // Auto remove after 3.5 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(id), 300);
    }, 3500);
    return () => clearTimeout(timer);
  }, [id, onRemove]);

  const colors = {
    success: { bg: '#023E58', border: '#02C39A', icon: '✅' },
    error:   { bg: '#2A0A10', border: '#D64F6E', icon: '❌' },
    info:    { bg: '#023E58', border: '#028090', icon: 'ℹ️'  },
  };
  const c = colors[type] || colors.info;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 16px',
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderLeft: `4px solid ${c.border}`,
      borderRadius: 10,
      marginBottom: 8,
      minWidth: 280,
      maxWidth: 380,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      cursor: 'pointer',
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.3s ease, opacity 0.3s ease',
    }}
      onClick={() => {
        setVisible(false);
        setTimeout(() => onRemove(id), 300);
      }}
    >
      <span style={{ fontSize: 16 }}>{c.icon}</span>
      <span style={{ color: 'white', fontSize: 13, fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500, flex: 1, lineHeight: 1.4 }}>
        {message}
      </span>
    </div>
  );
}

// ── Toast Container ────────────────────────────────────────────
export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (t) => {
      setToasts(prev => [...prev, t]);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem
            id={t.id}
            message={t.message}
            type={t.type}
            onRemove={remove}
          />
        </div>
      ))}
    </div>
  );
}

export default toast;