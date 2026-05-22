import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { getHistory, fmtTime, fmtDist, blockColor } from '../utils/workout.js'

function fmtPace(v) {
  if (!v) return '--\'--'
  const m = Math.floor(v), s = String(Math.round((v-m)*60)).padStart(2,'0')
  return `${m}'${s}"`
}

export default function Home({ onLogout }) {
  const nav = useNavigate()
  const history = useMemo(() => getHistory(), [])

  const week = useMemo(() => {
    const now = Date.now()
    return history.filter(w => now - w.date < 7*86400000)
  }, [history])

  const weekDist = week.reduce((s,w) => s+(w.distKm||0), 0)
  const weekTime = week.reduce((s,w) => s+(w.durationSec||0), 0)
  const weekCal  = week.reduce((s,w) => s+(w.calories||0), 0)
  const last = history[0]

  // Days of week activity
  const days = ['D','S','T','Q','Q','S','S']
  const today = new Date().getDay()
  const dayActivity = days.map((_, i) => {
    const dayOffset = (today - i + 7) % 7
    return week.some(w => {
      const d = new Date(w.date).getDay()
      return d === (today - dayOffset + 7) % 7
    })
  }).reverse()

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerTop}>
          <div>
            <p style={s.greeting}>Bom treino 👋</p>
            <h1 style={s.name}>Kaue</h1>
          </div>
          <button style={s.logoutBtn} onClick={onLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" stroke="rgba(245,245,245,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Week dot tracker */}
        <div style={s.weekRow}>
          {days.map((d, i) => (
            <div key={i} style={s.dayCol}>
              <div style={{ ...s.dayDot, background: dayActivity[i] ? 'var(--green)' : 'var(--bg4)' }} />
              <span style={{ ...s.dayLabel, color: i === 6 ? 'var(--green)' : 'var(--text3)' }}>{d}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={s.scroll}>
        {/* Week stats */}
        <div style={s.statsRow}>
          <StatPill label="km" value={fmtDist(weekDist)} color="var(--green)" />
          <StatPill label="tempo" value={fmtTime(weekTime)} color="var(--blue)" />
          <StatPill label="kcal" value={weekCal} color="var(--amber)" />
          <StatPill label="treinos" value={week.length} color="var(--text2)" />
        </div>

        {/* CTA */}
        <button style={s.cta} onClick={() => nav('/plan')}>
          <div style={s.ctaLeft}>
            <div style={s.ctaIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M13 3L4 14h8l-1 7 9-11h-8l1-10z" fill="#000" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div style={s.ctaTitle}>Novo treino</div>
              <div style={s.ctaSub}>Monte seus intervalos →</div>
            </div>
          </div>
        </button>

        {/* Last workout */}
        {last && (
          <div style={s.section}>
            <p style={s.sectionTitle}>Último treino</p>
            <div style={s.lastCard}>
              <div style={s.lastTop}>
                <div>
                  <div style={s.lastDate}>
                    {new Date(last.date).toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'short' })}
                  </div>
                  <div style={s.lastTime}>
                    {new Date(last.date).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
                <div style={s.distChip}>{fmtDist(last.distKm||0)} km</div>
              </div>

              <div style={s.lastStats}>
                <MiniStat label="duração" value={fmtTime(last.durationSec||0)} />
                <div style={s.statDivider} />
                <MiniStat label="pace" value={fmtPace(last.avgPace)} />
                <div style={s.statDivider} />
                <MiniStat label="kcal" value={last.calories||0} />
              </div>

              {last.route && (
                <img src={last.route} alt="percurso" style={s.routeThumb} />
              )}

              {last.blocks && (
                <div style={s.intervalBar}>
                  {last.blocks.map((b,i) => (
                    <div key={i} style={{ flex:b.dur, height:'3px', borderRadius:'99px', background:blockColor(b.type) }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {history.length === 0 && (
          <div style={s.empty}>
            <p style={{ color:'var(--text3)', fontSize:'14px', textAlign:'center', lineHeight:1.7 }}>
              Nenhum treino ainda.<br/>Comece agora!
            </p>
          </div>
        )}

        <div style={{ height:'110px' }} />
      </div>
      <BottomNav />
    </div>
  )
}

function StatPill({ label, value, color }) {
  return (
    <div style={s.pill}>
      <span style={{ ...s.pillVal, color }}>{value}</span>
      <span style={s.pillLabel}>{label}</span>
    </div>
  )
}
function MiniStat({ label, value }) {
  return (
    <div style={{ textAlign:'center', flex:1 }}>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:'14px', color:'var(--text)', fontWeight:500 }}>{value}</div>
      <div style={{ fontSize:'10px', color:'var(--text3)', marginTop:'2px' }}>{label}</div>
    </div>
  )
}

const s = {
  root: { minHeight:'100dvh', background:'var(--bg)' },
  header: {
    padding:'56px 20px 16px',
    background:'linear-gradient(to bottom, var(--bg2), var(--bg))',
    borderBottom:'1px solid var(--border)',
  },
  headerTop: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' },
  greeting: { fontSize:'13px', color:'var(--text3)', fontFamily:'var(--font-mono)', marginBottom:'2px' },
  name: { fontSize:'30px', fontWeight:700, letterSpacing:'-0.5px' },
  logoutBtn: {
    background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'10px',
    padding:'10px', display:'flex', alignItems:'center', justifyContent:'center',
  },
  weekRow: { display:'flex', gap:'6px', justifyContent:'space-between' },
  dayCol: { display:'flex', flexDirection:'column', alignItems:'center', gap:'5px', flex:1 },
  dayDot: { width:'8px', height:'8px', borderRadius:'50%', transition:'background 0.3s' },
  dayLabel: { fontSize:'10px', fontFamily:'var(--font-mono)' },
  scroll: { padding:'16px 16px 0', animation:'fadeUp 0.4s ease both' },
  statsRow: { display:'flex', gap:'8px', marginBottom:'16px' },
  pill: {
    flex:1, background:'var(--bg2)', border:'1px solid var(--border)',
    borderRadius:'12px', padding:'12px 8px', textAlign:'center',
  },
  pillVal: { display:'block', fontFamily:'var(--font-mono)', fontSize:'16px', fontWeight:500, marginBottom:'3px' },
  pillLabel: { fontSize:'10px', color:'var(--text3)' },
  cta: {
    width:'100%', background:'var(--green)', border:'none',
    borderRadius:'16px', padding:'18px 20px', marginBottom:'24px',
    display:'flex', alignItems:'center', textAlign:'left',
  },
  ctaLeft: { display:'flex', alignItems:'center', gap:'14px' },
  ctaIcon: {
    width:'44px', height:'44px', borderRadius:'12px',
    background:'rgba(0,0,0,0.2)',
    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
  },
  ctaTitle: { fontWeight:700, fontSize:'17px', color:'#000', marginBottom:'2px' },
  ctaSub: { fontSize:'13px', color:'rgba(0,0,0,0.55)' },
  section: { marginBottom:'16px' },
  sectionTitle: { fontSize:'11px', color:'var(--text3)', fontFamily:'var(--font-mono)', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'10px' },
  lastCard: {
    background:'var(--bg2)', border:'1px solid var(--border)',
    borderRadius:'var(--radius)', padding:'16px',
  },
  lastTop: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px' },
  lastDate: { fontSize:'14px', fontWeight:600, color:'var(--text)', textTransform:'capitalize' },
  lastTime: { fontSize:'11px', color:'var(--text3)', fontFamily:'var(--font-mono)', marginTop:'2px' },
  distChip: {
    background:'var(--green-dim)', color:'var(--green)',
    fontFamily:'var(--font-mono)', fontSize:'13px', fontWeight:500,
    padding:'5px 12px', borderRadius:'99px', border:'1px solid var(--green-mid)',
  },
  lastStats: { display:'flex', alignItems:'center', paddingBottom:'14px', marginBottom:'14px', borderBottom:'1px solid var(--border)' },
  statDivider: { width:'1px', height:'28px', background:'var(--border)', flexShrink:0 },
  routeThumb: { width:'100%', borderRadius:'10px', marginBottom:'10px', display:'block', border:'1px solid var(--border)' },
  intervalBar: { display:'flex', gap:'3px', height:'3px' },
  empty: { padding:'48px 0', display:'flex', justifyContent:'center' },
}
