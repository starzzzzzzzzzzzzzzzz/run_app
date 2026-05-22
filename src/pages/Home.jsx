import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { getHistory, loadProfile, loadWeekPlan, fmtTime, fmtDist, fmtPace, WORKOUT_TYPES } from '../utils/workout.js'

export default function Home({ onLogout }) {
  const nav     = useNavigate()
  const history = useMemo(()=>getHistory(),[])
  const profile = useMemo(()=>loadProfile(),[])
  const weekPlan= useMemo(()=>loadWeekPlan(),[])

  const now = Date.now()
  const todayIdx = new Date().getDay() // 0=Sun
  const dayMap   = [6,0,1,2,3,4,5] // Sun->Dom(6), Mon->Seg(0)...
  const todayPlanIdx = dayMap[todayIdx]
  const todayPlan = weekPlan.days[todayPlanIdx]

  const weekStats = useMemo(()=>{
    const week = history.filter(w=>now-w.date<7*86400000)
    return {
      runs: week.length,
      dist: week.reduce((s,w)=>s+(w.distKm||0),0),
      time: week.reduce((s,w)=>s+(w.durationSec||0),0),
      cal:  week.reduce((s,w)=>s+(w.calories||0),0),
    }
  },[history])

  const monthStats = useMemo(()=>{
    const month=history.filter(w=>now-w.date<30*86400000)
    return { dist: month.reduce((s,w)=>s+(w.distKm||0),0), runs:month.length }
  },[history])

  const last5 = history.slice(0,5)
  const bestPace = history.reduce((b,w)=>(!w.avgPace?b:(!b||w.avgPace<b)?w.avgPace:b),null)

  // Week completion
  const activeDays = weekPlan.days.filter(d=>d.active)
  const completedThisWeek = history.filter(w=>now-w.date<7*86400000).length
  const weekGoalPct = activeDays.length>0 ? Math.min(100,Math.round((completedThisWeek/activeDays.length)*100)) : 0

  return (
    <div style={s.root}>
      {/* Ambient glow */}
      <div style={s.glow1}/><div style={s.glow2}/>

      {/* Header */}
      <div style={s.header}>
        <div>
          <p style={s.greeting}>Bom treino,</p>
          <h1 style={s.name}>{profile.name||'Atleta'} <span style={{color:'var(--green)'}}>↗</span></h1>
        </div>
        <button style={s.logoutBtn} onClick={onLogout}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      <div style={s.scroll}>

        {/* Today card */}
        {todayPlan && (
          <div style={s.todayCard} onClick={()=>nav('/plan')}>
            <div style={s.todayLeft}>
              <span style={s.todayIcon}>{WORKOUT_TYPES[todayPlan.type]?.icon||'🏃'}</span>
              <div>
                <p style={s.todayLabel}>Treino de hoje</p>
                <p style={s.todayType}>{WORKOUT_TYPES[todayPlan.type]?.label||'Corrida'}</p>
                {todayPlan.targetKm>0 && <p style={s.todayKm}>{todayPlan.targetKm} km planejados</p>}
              </div>
            </div>
            <div style={s.todayArrow}>→</div>
          </div>
        )}

        {/* Week stats grid */}
        <div style={s.statsGrid}>
          <StatCard label="km esta semana" value={parseFloat(weekStats.dist.toFixed(1))} unit="km"  color="var(--green)" />
          <StatCard label="tempo ativo"    value={fmtTime(weekStats.time)}                unit=""   color="var(--blue)" />
          <StatCard label="treinos"        value={weekStats.runs}                          unit=""   color="var(--amber)" />
          <StatCard label="calorias"       value={weekStats.cal}                           unit="kcal" color="var(--red)" />
        </div>

        {/* Weekly plan progress */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>Plano semanal</span>
            <span style={{...s.badge, background:'var(--green-dim)', color:'var(--green)'}}>{weekGoalPct}%</span>
          </div>
          <div style={s.weekRow}>
            {weekPlan.days.map((d,i)=>{
              const isToday = i===todayPlanIdx
              const type    = WORKOUT_TYPES[d.type]
              return (
                <div key={i} style={{...s.dayCol, opacity: d.active?1:0.35}}>
                  <div style={{
                    ...s.dayDot,
                    background: isToday ? 'var(--green)' : d.active ? type?.color||'var(--green-dim)' : 'var(--bg4)',
                    boxShadow: isToday ? '0 0 12px var(--green)' : 'none',
                  }}>{d.active && !isToday && <span style={{fontSize:'9px'}}>{type?.icon}</span>}</div>
                  <span style={{...s.dayLabel, color: isToday?'var(--green)':'var(--text3)'}}>{d.day}</span>
                  {d.active && d.targetKm>0 && <span style={s.dayKm}>{d.targetKm}k</span>}
                </div>
              )
            })}
          </div>
          <div style={s.progressBar}>
            <div style={{...s.progressFill, width:weekGoalPct+'%'}}/>
          </div>
          <p style={s.progressLabel}>{completedThisWeek}/{activeDays.length} treinos completados</p>
        </div>

        {/* Records strip */}
        {history.length>0 && (
          <div style={s.card}>
            <p style={s.cardTitle}>Seus recordes</p>
            <div style={{display:'flex',gap:'0',marginTop:'12px'}}>
              <RecordItem label="Melhor pace" value={fmtPace(bestPace)} color="var(--blue)" />
              <div style={s.divider}/>
              <RecordItem label="Total 30 dias" value={`${parseFloat(monthStats.dist.toFixed(0))} km`} color="var(--green)" />
              <div style={s.divider}/>
              <RecordItem label="Total treinos" value={history.length} color="var(--amber)" />
            </div>
          </div>
        )}

        {/* Recent activity feed */}
        {last5.length>0 && (
          <div style={s.card}>
            <div style={s.cardHeader}>
              <span style={s.cardTitle}>Atividade recente</span>
              <button style={s.seeAll} onClick={()=>nav('/history')}>Ver tudo →</button>
            </div>
            {last5.map((w,i)=><ActivityRow key={w.id||i} w={w}/>)}
          </div>
        )}

        {/* CTA when empty */}
        {history.length===0 && (
          <div style={s.emptyState}>
            <div style={s.emptyGlyph}>◌</div>
            <p style={s.emptyTitle}>Nenhum treino ainda</p>
            <p style={s.emptySub}>Monte seu primeiro treino e comece agora.</p>
          </div>
        )}

        {/* Start button */}
        <button style={s.ctaBtn} onClick={()=>nav('/plan')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          Iniciar treino
        </button>

        <div style={{height:100}}/>
      </div>
      <BottomNav/>
    </div>
  )
}

function StatCard({label,value,unit,color}){
  return (
    <div style={sc.wrap}>
      <div style={{...sc.val,color}}>{value}<span style={sc.unit}>{unit}</span></div>
      <div style={sc.label}>{label}</div>
    </div>
  )
}
const sc={
  wrap:{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'16px 14px' },
  val:{ fontFamily:'var(--font-mono)',fontSize:'20px',fontWeight:500,marginBottom:'4px',display:'flex',alignItems:'baseline',gap:'3px' },
  unit:{ fontSize:'11px',opacity:0.7 },
  label:{ fontSize:'11px',color:'var(--text3)' },
}

function RecordItem({label,value,color}){
  return (
    <div style={{flex:1,textAlign:'center'}}>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'16px',fontWeight:500,color,marginBottom:'3px'}}>{value}</div>
      <div style={{fontSize:'10px',color:'var(--text3)'}}>{label}</div>
    </div>
  )
}

function ActivityRow({w}){
  const date=new Date(w.date)
  const hasPhoto = w.photoStart||w.photoEnd
  return (
    <div style={ar.row}>
      {hasPhoto
        ? <img src={w.photoStart||w.photoEnd} alt="" style={ar.thumb}/>
        : <div style={ar.iconBox}><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="var(--green)" strokeWidth="1.8" strokeLinejoin="round"/></svg></div>
      }
      <div style={ar.info}>
        <p style={ar.date}>{date.toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'})}</p>
        <p style={ar.dist}>{(w.distKm||0).toFixed(1)} km</p>
      </div>
      <div style={ar.right}>
        <p style={ar.time}>{fmtTime(w.durationSec||0)}</p>
        <p style={ar.pace}>{fmtPace(w.avgPace)}</p>
      </div>
    </div>
  )
}
const ar={
  row:{ display:'flex',alignItems:'center',gap:'12px',padding:'10px 0',borderBottom:'1px solid var(--border)' },
  thumb:{ width:38,height:38,borderRadius:10,objectFit:'cover',flexShrink:0 },
  iconBox:{ width:38,height:38,borderRadius:10,background:'var(--green-dim)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 },
  info:{ flex:1 },
  date:{ fontSize:'12px',color:'var(--text3)',textTransform:'capitalize',marginBottom:'2px' },
  dist:{ fontSize:'16px',fontWeight:600,color:'var(--text)' },
  right:{ textAlign:'right' },
  time:{ fontSize:'13px',color:'var(--text2)',fontFamily:'var(--font-mono)' },
  pace:{ fontSize:'11px',color:'var(--text3)',fontFamily:'var(--font-mono)' },
}

const s={
  root:{ minHeight:'100dvh',position:'relative',overflow:'hidden',background:'var(--bg)' },
  glow1:{ position:'fixed',top:-80,left:-80,width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(181,242,61,0.07) 0%,transparent 70%)',pointerEvents:'none',zIndex:0 },
  glow2:{ position:'fixed',bottom:100,right:-60,width:260,height:260,borderRadius:'50%',background:'radial-gradient(circle,rgba(91,196,245,0.05) 0%,transparent 70%)',pointerEvents:'none',zIndex:0 },
  header:{ position:'relative',zIndex:1,display:'flex',justifyContent:'space-between',alignItems:'flex-end',padding:'56px 20px 20px' },
  greeting:{ color:'var(--text3)',fontSize:'13px',fontFamily:'var(--font-mono)',marginBottom:'2px' },
  name:{ fontFamily:'var(--font-display)',fontSize:'30px',fontWeight:800,letterSpacing:'-0.5px' },
  logoutBtn:{ background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'9px 10px',color:'var(--text2)',display:'flex',alignItems:'center',justifyContent:'center' },
  scroll:{ position:'relative',zIndex:1,padding:'0 16px',animation:'fadeUp 0.4s ease both' },
  todayCard:{ display:'flex',alignItems:'center',justifyContent:'space-between',background:'linear-gradient(135deg,var(--green-dim),var(--bg2))',border:'1px solid rgba(181,242,61,0.2)',borderRadius:'var(--radius)',padding:'16px 18px',marginBottom:'14px',cursor:'pointer' },
  todayLeft:{ display:'flex',alignItems:'center',gap:'14px' },
  todayIcon:{ fontSize:'28px',flexShrink:0 },
  todayLabel:{ fontSize:'11px',color:'var(--green)',fontFamily:'var(--font-mono)',letterSpacing:'0.5px',marginBottom:'2px' },
  todayType:{ fontSize:'17px',fontWeight:700,color:'var(--text)',fontFamily:'var(--font-display)' },
  todayKm:{ fontSize:'12px',color:'var(--text2)',marginTop:'2px' },
  todayArrow:{ fontSize:'20px',color:'var(--green)',flexShrink:0 },
  statsGrid:{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'14px' },
  card:{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'16px',marginBottom:'14px' },
  cardHeader:{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px' },
  cardTitle:{ fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text3)',letterSpacing:'1px',textTransform:'uppercase' },
  badge:{ fontSize:'11px',fontFamily:'var(--font-mono)',padding:'3px 9px',borderRadius:99 },
  seeAll:{ fontSize:'12px',color:'var(--green)',fontFamily:'var(--font-mono)' },
  weekRow:{ display:'flex',justifyContent:'space-between',marginBottom:'14px' },
  dayCol:{ display:'flex',flexDirection:'column',alignItems:'center',gap:'5px' },
  dayDot:{ width:30,height:30,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.3s' },
  dayLabel:{ fontSize:'10px',fontFamily:'var(--font-mono)' },
  dayKm:{ fontSize:'9px',color:'var(--text3)',fontFamily:'var(--font-mono)' },
  progressBar:{ height:3,background:'rgba(255,255,255,0.06)',borderRadius:99,overflow:'hidden',marginBottom:'8px' },
  progressFill:{ height:'100%',background:'var(--green)',borderRadius:99,transition:'width 0.8s ease',transformOrigin:'left' },
  progressLabel:{ fontSize:'11px',color:'var(--text3)',fontFamily:'var(--font-mono)' },
  divider:{ width:1,background:'var(--border)',margin:'0 4px' },
  ctaBtn:{ width:'100%',padding:'16px',background:'var(--green)',color:'#000',fontFamily:'var(--font-display)',fontWeight:700,fontSize:'16px',borderRadius:'var(--radius)',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',marginBottom:'14px',border:'none' },
  emptyState:{ textAlign:'center',padding:'40px 0 20px' },
  emptyGlyph:{ fontSize:'40px',color:'var(--text3)',marginBottom:'12px' },
  emptyTitle:{ fontSize:'16px',fontWeight:600,color:'var(--text2)',marginBottom:'6px' },
  emptySub:{ fontSize:'13px',color:'var(--text3)',lineHeight:1.6 },
}
