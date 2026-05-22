import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const ITEMS = [
  { path:'/',        label:'Início',    icon:(a)=>(<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" stroke={a?'var(--green)':'rgba(255,255,255,0.28)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
  { path:'/plan',    label:'Treino',    icon:(a)=>(<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={a?'var(--green)':'rgba(255,255,255,0.28)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>) },
  { path:'/history', label:'Histórico', icon:(a)=>(<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke={a?'var(--green)':'rgba(255,255,255,0.28)'} strokeWidth="1.8" strokeLinecap="round"/></svg>) },
  { path:'/profile', label:'Perfil',    icon:(a)=>(<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" stroke={a?'var(--green)':'rgba(255,255,255,0.28)'} strokeWidth="1.8" strokeLinecap="round"/></svg>) },
]

export default function BottomNav() {
  const nav=useNavigate(), loc=useLocation()
  return (
    <nav style={st.nav}>
      {ITEMS.map(item=>{
        const active=loc.pathname===item.path
        return (
          <button key={item.path} style={st.item} onClick={()=>nav(item.path)}>
            {item.icon(active)}
            <span style={{...st.lbl, color:active?'var(--green)':'rgba(255,255,255,0.28)'}}>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

const st = {
  nav:{ position:'fixed',bottom:0,left:0,right:0,background:'rgba(8,8,8,0.96)',backdropFilter:'blur(16px)',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'space-around',padding:'10px 0 max(14px,env(safe-area-inset-bottom))',zIndex:100 },
  item:{ display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',padding:'4px 16px' },
  lbl:{ fontSize:'10px',fontFamily:'var(--font-mono)',letterSpacing:'0.3px',transition:'color 0.2s' },
}
