import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const ITEMS = [
  { path: '/',        icon: '⌂', label: 'Início' },
  { path: '/plan',    icon: '◈', label: 'Treino' },
  { path: '/history', icon: '◎', label: 'Histórico' },
]

export default function BottomNav() {
  const nav = useNavigate()
  const loc = useLocation()

  return (
    <nav style={styles.nav}>
      {ITEMS.map(item => {
        const active = loc.pathname === item.path
        return (
          <button
            key={item.path}
            style={{ ...styles.item, color: active ? 'var(--green)' : 'var(--text3)' }}
            onClick={() => nav(item.path)}
          >
            <span style={{ ...styles.icon, color: active ? 'var(--green)' : 'var(--text3)' }}>
              {item.icon}
            </span>
            <span style={{ ...styles.label, color: active ? 'var(--green)' : 'var(--text3)' }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

const styles = {
  nav: {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    background: 'rgba(10,10,10,0.95)',
    backdropFilter: 'blur(12px)',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-around',
    padding: '10px 0 max(14px, env(safe-area-inset-bottom))',
    zIndex: 100,
  },
  item: {
    background: 'none',
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
    padding: '4px 20px',
    transition: 'color 0.2s',
  },
  icon: { fontSize: '22px', lineHeight: 1 },
  label: { fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.3px' },
}
