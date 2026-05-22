import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { getHistory, fmtTime, fmtDist } from '../utils/workout.js'

const fp = (v) => {
  if (!v) return '--\'--'
  const m = Math.floor(v), s = String(Math.round((v-m)*60)).padStart(2,'0')
  return `${m}'${s}"`
}

export default function History() {
  const nav = useNavigate()
  const history = useMemo(() => getHistory(), [])
  const [expanded, setExpanded] = useState(null)

  const totalDist = history.reduce((s,w) => s+(w.distKm||0), 0)
  const totalTime = history.reduce((s,w) => s+(w.durationSec||0), 0)
  const bestPace  = history.reduce((b,w) => (!w.avgPace?b:(!b||w.avgPace<b)?w.avgPace:b), null)

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div>
          <p style={s.sup}>Seus registros</p>
          <h1 style={s.title}>Histórico</h1>
        </div>
      </div>

      {/* Totals strip */}
      {history.length > 0 && (
        <div style={s.strip}>
          <StripStat label="km total"  value={parseFloat(totalDist.toFixed(1))} color="var(--green)" />
          <div style={s.stripDiv} />
          <StripStat label="treinos"   value={history.length} />
          <div style={s.stripDiv} />
          <StripStat label="tempo"     value={fmtTime(totalTime)} />
          {bestPace && <><div style={s.stripDiv} /><StripStat label="melhor pace" value={fp(bestPace)} color="var(--blue)" /></>}
        </div>
      )}

      <div style={s.scroll}>
        {history.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyRing}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M13 3L4 14h8l-1 7 9-11h-8l1-10z" stroke="var(--text3)" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={s.emptyText}>Nenhum treino ainda</p>
            <p style={s.emptySub}>Complete seu primeiro treino para ver o histórico aqui.</p>
            <button style={s.emptyBtn} onClick={() => nav('/plan')}>Começar agora →</button>
          </div>
        ) : history.map((w, i) => (
          <WorkoutCard
            key={w.id||i} w={w} index={i}
            open={expanded===i}
            onToggle={() => setExpanded(expanded===i ? null : i)}
          />
        ))}
        <div style={{ height: 110 }} />
      </div>
      <BottomNav />
    </div>
  )
}

function StripStat({ label, value, color }) {
  return (
    <div style={{ textAlign:'center', flex:1 }}>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:'15px', fontWeight:500, color: color||'var(--text)', marginBottom:'2px' }}>{value}</div>
      <div style={{ fontSize:'10px', color:'var(--text3)', letterSpacing:'0.5px' }}>{label}</div>
    </div>
  )
}

function WorkoutCard({ w, index, open, onToggle }) {
  const date = new Date(w.date)
  const dateStr = date.toLocaleDateString('pt-BR', { weekday:'short', day:'numeric', month:'short' })
  const timeStr = date.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })

  return (
    <div style={{ ...s.card, animationDelay:`${Math.min(index*0.04,0.3)}s` }}>
      {/* Top row — always visible */}
      <div style={s.cardRow} onClick={onToggle}>
        <div style={s.cardLeft}>
          <div style={s.dateBadge}>
            <span style={s.dateDay}>{date.getDate()}</span>
            <span style={s.dateMon}>{date.toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}</span>
          </div>
          <div>
            <div style={s.cardDate}>{dateStr} • {timeStr}</div>
            <div style={s.cardDist}>{fmtDist(w.distKm||0)} <span style={s.cardDistUnit}>km</span></div>
          </div>
        </div>
        <div style={s.chevron}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ transform: open?'rotate(180deg)':'none', transition:'transform 0.2s' }}>
            <path d="M6 9l6 6 6-6" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Quick stats row */}
      <div style={s.quickStats}>
        <QuickStat label="tempo"    value={fmtTime(w.durationSec||0)} />
        <QuickStat label="pace"     value={fp(w.avgPace)} color="var(--blue)" />
        <QuickStat label="kcal"     value={w.calories||0} />
      </div>

      {/* Expanded: route photo */}
      {open && w.route && (
        <div style={s.expandedRoute}>
          <img src={w.route} alt="percurso" style={s.routeImg} />
          <a
            href={w.route}
            download={`corrida-${date.toLocaleDateString('pt-BR').replace(/\//g,'-')}.png`}
            style={s.downloadBtn}
          >
            ↓ Salvar foto
          </a>
        </div>
      )}
    </div>
  )
}

function QuickStat({ label, value, color }) {
  return (
    <div style={{ flex:1, textAlign:'center' }}>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:'13px', color:color||'var(--text)', fontWeight:500 }}>{value}</div>
      <div style={{ fontSize:'10px', color:'var(--text3)', marginTop:'2px' }}>{label}</div>
    </div>
  )
}

const s = {
  root: { minHeight:'100dvh', background:'var(--bg)' },
  header: {
    padding:'56px 20px 16px',
    background:'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)',
  },
  sup: { fontFamily:'var(--font-mono)', fontSize:'10px', color:'var(--text3)', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:'4px' },
  title: { fontSize:'28px', fontWeight:700, letterSpacing:'-0.5px' },
  strip: {
    display:'flex', alignItems:'center',
    margin:'0 16px 16px', padding:'14px 8px',
    background:'var(--bg2)', border:'1px solid var(--border)',
    borderRadius:'var(--radius)',
  },
  stripDiv: { width:'1px', height:'28px', background:'var(--border)', flexShrink:0 },
  scroll: { padding:'0 16px' },
  card: {
    background:'var(--bg2)', border:'1px solid var(--border)',
    borderRadius:'var(--radius)', marginBottom:'10px',
    overflow:'hidden', animation:'fadeUp 0.35s ease both',
  },
  cardRow: {
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'14px 16px',
  },
  cardLeft: { display:'flex', alignItems:'center', gap:'12px' },
  dateBadge: {
    width:'40px', height:'44px', background:'var(--bg3)', borderRadius:'10px',
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    flexShrink:0,
  },
  dateDay: { fontFamily:'var(--font-mono)', fontSize:'16px', fontWeight:500, color:'var(--text)', lineHeight:1 },
  dateMon: { fontSize:'10px', color:'var(--text3)', marginTop:'2px', letterSpacing:'0.5px' },
  cardDate: { fontSize:'12px', color:'var(--text3)', fontFamily:'var(--font-mono)', textTransform:'capitalize', marginBottom:'2px' },
  cardDist: { fontSize:'22px', fontWeight:700, letterSpacing:'-0.5px', color:'var(--text)' },
  cardDistUnit: { fontSize:'14px', color:'var(--text2)', fontWeight:400 },
  chevron: { padding:'4px' },
  quickStats: {
    display:'flex', borderTop:'1px solid var(--border)',
    padding:'10px 8px',
  },
  expandedRoute: {
    borderTop:'1px solid var(--border)',
    padding:'12px 12px',
    display:'flex', flexDirection:'column', gap:'10px',
  },
  routeImg: { width:'100%', borderRadius:'10px', display:'block' },
  downloadBtn: {
    display:'block', textAlign:'center', padding:'10px',
    background:'var(--green-dim)', color:'var(--green)',
    border:'1px solid var(--green-mid)', borderRadius:'10px',
    fontFamily:'var(--font-mono)', fontSize:'13px', fontWeight:500,
    textDecoration:'none',
  },
  empty: {
    padding:'64px 0', display:'flex', flexDirection:'column',
    alignItems:'center', gap:'12px', textAlign:'center',
  },
  emptyRing: {
    width:'64px', height:'64px', borderRadius:'50%',
    border:'1px solid var(--border)', display:'flex',
    alignItems:'center', justifyContent:'center', marginBottom:'4px',
  },
  emptyText: { fontSize:'16px', fontWeight:600, color:'var(--text2)' },
  emptySub: { fontSize:'13px', color:'var(--text3)', maxWidth:'240px', lineHeight:1.6 },
  emptyBtn: {
    marginTop:'8px', padding:'12px 24px', borderRadius:'12px',
    background:'var(--green)', color:'#000',
    fontFamily:'var(--font-display)', fontWeight:700, fontSize:'14px',
    border:'none',
  },
}
