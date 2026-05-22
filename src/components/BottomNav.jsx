import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const ITEMS = [
  { path: '/',        label: 'Início',    icon: HomeIcon },
  { path: '/plan',    label: 'Treino',    icon: PlayIcon },
  { path: '/history', label: 'Histórico', icon: HistoryIcon },
]

export default function BottomNav() {
  const nav = useNavigate()
  const loc = useLocation()
  return (
    <nav style={s.nav}>
      {ITEMS.map(({ path, label, icon: Icon }) => {
        const active = loc.pathname === path
        return (
          <button key={path} style={s.item} onClick={() => nav(path)}>
            <div style={{ ...s.iconWrap, background: active ? 'var(--green)' : 'transparent' }}>
              <Icon color={active ? '#000' : 'rgba(245,245,245,0.35)'} />
            </div>
            <span style={{ ...s.label, color: active ? 'var(--green)' : 'var(--text3)' }}>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function HomeIcon({ color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
    <path d="M9 21V12h6v9" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
  </svg>
}
function PlayIcon({ color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2"/>
    <path d="M10 8.5l5 3.5-5 3.5V8.5z" fill={color}/>
  </svg>
}
function HistoryIcon({ color }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 8v4l3 3" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M3.05 11a9 9 0 1 0 .5-3M3 5v3h3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
}

const s = {
  nav: {
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
    background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(20px)',
    borderTop: '1px solid var(--border)',
    display: 'flex', justifyContent: 'space-around',
    padding: '10px 0 max(16px, env(safe-area-inset-bottom))',
  },
  item: {
    background: 'none', border: 'none',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
    padding: '2px 24px',
  },
  iconWrap: {
    width: '40px', height: '40px', borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s',
  },
  label: { fontSize: '10px', fontFamily: 'var(--font-mono)', letterSpacing: '0.3px', transition: 'color 0.2s' },
}
