import React, { useState, useMemo } from 'react'
import BottomNav from '../components/BottomNav.jsx'
import { loadProfile, saveProfile, loadWeekPlan, saveWeekPlan, WORKOUT_TYPES } from '../utils/workout.js'

export default function Profile() {
  const [profile, setProfile] = useState(()=>loadProfile())
  const [weekPlan, setWeekPlan] = useState(()=>loadWeekPlan())
  const [saved, setSaved] = useState(false)

  const update = (key,val) => setProfile(p=>({...p,[key]:val}))

  const updateDay = (i, key, val) => {
    setWeekPlan(wp=>{
      const days=[...wp.days]; days[i]={...days[i],[key]:val}
      return {...wp,days}
    })
  }

  const handleSave = () => {
    saveProfile(profile)
    saveWeekPlan(weekPlan)
    setSaved(true)
    setTimeout(()=>setSaved(false),2000)
  }

  const bmi = useMemo(()=>{
    const h=parseFloat(profile.height), w=parseFloat(profile.weight)
    if(h>0&&w>0){ const b=w/((h/100)**2); return b.toFixed(1) }
    return null
  },[profile])

  const bmiLabel = (b)=>{
    if(!b) return null
    if(b<18.5) return {label:'Abaixo do peso',color:'var(--blue)'}
    if(b<25)   return {label:'Peso ideal',    color:'var(--green)'}
    if(b<30)   return {label:'Sobrepeso',     color:'var(--amber)'}
    return             {label:'Obesidade',    color:'var(--red)'}
  }
  const bmiInfo = bmiLabel(parseFloat(bmi))

  const activeDays  = weekPlan.days.filter(d=>d.active)
  const weeklyKm    = weekPlan.days.reduce((s,d)=>s+(d.active?d.targetKm:0),0)

  return (
    <div style={s.root}>
      <div style={s.header}>
        <p style={s.sup}>Configurações</p>
        <h1 style={s.title}>Perfil</h1>
      </div>

      <div style={s.scroll}>

        {/* Avatar + name preview */}
        <div style={s.avatarCard}>
          <div style={s.avatar}>
            <span style={s.avatarInitial}>{(profile.name||'A')[0].toUpperCase()}</span>
          </div>
          <div>
            <p style={s.avatarName}>{profile.name||'Seu nome'}</p>
            {bmi && <p style={{...s.bmiChip,background:bmiInfo?.color+'22',color:bmiInfo?.color}}>IMC {bmi} · {bmiInfo?.label}</p>}
          </div>
        </div>

        {/* Personal data */}
        <Section title="Dados pessoais">
          <Field label="Nome" value={profile.name||''} onChange={v=>update('name',v)} placeholder="Seu nome" />
          <Row>
            <Field label="Peso (kg)" value={profile.weight||''} onChange={v=>update('weight',v)} placeholder="70" type="number" />
            <Field label="Altura (cm)" value={profile.height||''} onChange={v=>update('height',v)} placeholder="175" type="number" />
          </Row>
          <Row>
            <Field label="Idade" value={profile.age||''} onChange={v=>update('age',v)} placeholder="25" type="number" />
            <div style={{flex:1}}>
              <p style={s.fieldLabel}>Gênero</p>
              <select style={s.select} value={profile.gender||''} onChange={e=>update('gender',e.target.value)}>
                <option value="">Selecionar</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
          </Row>
          <Field label="Meta de peso (kg)" value={profile.goalWeight||''} onChange={v=>update('goalWeight',v)} placeholder="65" type="number" />
        </Section>

        {/* BMI visual */}
        {bmi && (
          <div style={s.bmiCard}>
            <div style={s.bmiHeader}>
              <span style={s.bmiTitle}>IMC (Índice de Massa Corporal)</span>
              <span style={{...s.bmiValue,color:bmiInfo?.color}}>{bmi}</span>
            </div>
            <div style={s.bmiBar}>
              {[{color:'var(--blue)',w:'20%'},{color:'var(--green)',w:'27%'},{color:'var(--amber)',w:'27%'},{color:'var(--red)',w:'26%'}].map((b,i)=>(
                <div key={i} style={{flex:b.w,height:'100%',background:b.color}}/>
              ))}
              <div style={{...s.bmiPointer,left:Math.min(96,Math.max(2,(parseFloat(bmi)-15)/25*100))+'%',background:bmiInfo?.color}}/>
            </div>
            <div style={s.bmiLabels}>
              <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
            </div>
          </div>
        )}

        {/* Week plan */}
        <Section title="Plano semanal">
          <div style={s.weekSummary}>
            <span style={s.weekStat}><strong style={{color:'var(--green)'}}>{activeDays.length}</strong> dias ativos</span>
            <span style={s.weekStat}><strong style={{color:'var(--green)'}}>{weeklyKm} km</strong> por semana</span>
          </div>

          {weekPlan.days.map((d,i)=>(
            <div key={i} style={{...s.dayRow, opacity:d.active?1:0.5}}>
              <button style={{...s.dayToggle, background:d.active?'var(--green)':'var(--bg4)', border:d.active?'none':'1px solid var(--border)'}}
                onClick={()=>updateDay(i,'active',!d.active)}>
                {d.active && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
              <span style={s.dayName}>{d.day}</span>

              {d.active && d.type!=='rest' ? (
                <>
                  <select style={s.daySelect} value={d.type} onChange={e=>updateDay(i,'type',e.target.value)}>
                    {Object.entries(WORKOUT_TYPES).filter(([k])=>k!=='rest').map(([k,v])=>(
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                  <div style={s.kmCtrl}>
                    <button style={s.kmBtn} onClick={()=>updateDay(i,'targetKm',Math.max(1,(d.targetKm||0)-1))}>−</button>
                    <span style={s.kmVal}>{d.targetKm||0}k</span>
                    <button style={s.kmBtn} onClick={()=>updateDay(i,'targetKm',(d.targetKm||0)+1)}>+</button>
                  </div>
                </>
              ) : d.active ? (
                <>
                  <select style={s.daySelect} value={d.type} onChange={e=>updateDay(i,'type',e.target.value)}>
                    <option value="rest">💤 Descanso</option>
                    {Object.entries(WORKOUT_TYPES).filter(([k])=>k!=='rest').map(([k,v])=>(
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>
                  <span style={{fontSize:'12px',color:'var(--text3)',minWidth:50,textAlign:'right'}}>descanso</span>
                </>
              ) : (
                <span style={{fontSize:'12px',color:'var(--text3)',flex:1,textAlign:'right'}}>folga</span>
              )}
            </div>
          ))}
        </Section>

        {/* Save button */}
        <button style={{...s.saveBtn, background:saved?'var(--bg3)':undefined, color:saved?'var(--green)':undefined}} onClick={handleSave}>
          {saved ? '✓ Salvo!' : 'Salvar perfil'}
        </button>

        <div style={{height:100}}/>
      </div>
      <BottomNav/>
    </div>
  )
}

function Section({title,children}){
  return (
    <div style={sec.wrap}>
      <p style={sec.title}>{title}</p>
      {children}
    </div>
  )
}
const sec={
  wrap:{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'16px',marginBottom:'14px' },
  title:{ fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text3)',letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:'14px' },
}

function Row({children}){
  return <div style={{display:'flex',gap:'10px'}}>{children}</div>
}

function Field({label,value,onChange,placeholder,type='text'}){
  return (
    <div style={{flex:1,marginBottom:'12px'}}>
      <p style={s.fieldLabel}>{label}</p>
      <input style={s.input} type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} inputMode={type==='number'?'decimal':undefined}/>
    </div>
  )
}

const s={
  root:{ minHeight:'100dvh',background:'var(--bg)' },
  header:{ padding:'56px 20px 16px',background:'linear-gradient(180deg,var(--bg2),var(--bg))' },
  sup:{ fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text3)',letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:'4px' },
  title:{ fontSize:'28px',fontWeight:700,letterSpacing:'-0.5px',fontFamily:'var(--font-display)' },
  scroll:{ padding:'0 16px',animation:'fadeUp 0.4s ease both' },
  avatarCard:{ display:'flex',alignItems:'center',gap:'16px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'18px',marginBottom:'14px' },
  avatar:{ width:56,height:56,borderRadius:'50%',background:'var(--green-dim)',border:'2px solid var(--green)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 },
  avatarInitial:{ fontFamily:'var(--font-display)',fontSize:'24px',fontWeight:700,color:'var(--green)' },
  avatarName:{ fontSize:'18px',fontWeight:600,color:'var(--text)',marginBottom:'4px' },
  bmiChip:{ display:'inline-block',fontSize:'11px',fontFamily:'var(--font-mono)',padding:'3px 10px',borderRadius:99 },
  fieldLabel:{ fontSize:'10px',color:'var(--text3)',fontFamily:'var(--font-mono)',letterSpacing:'0.5px',marginBottom:'6px' },
  input:{ width:'100%',background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',padding:'11px 13px',color:'var(--text)',fontSize:'15px',outline:'none' },
  select:{ width:'100%',background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:'var(--radius-sm)',padding:'11px 13px',color:'var(--text)',fontSize:'14px',outline:'none' },
  bmiCard:{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'16px',marginBottom:'14px' },
  bmiHeader:{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px' },
  bmiTitle:{ fontSize:'12px',color:'var(--text2)' },
  bmiValue:{ fontFamily:'var(--font-mono)',fontSize:'22px',fontWeight:500 },
  bmiBar:{ position:'relative',height:8,borderRadius:99,overflow:'visible',display:'flex',marginBottom:'6px' },
  bmiPointer:{ position:'absolute',top:-3,width:14,height:14,borderRadius:'50%',transform:'translateX(-50%)',border:'2px solid var(--bg)',transition:'left 0.5s ease' },
  bmiLabels:{ display:'flex',justifyContent:'space-between',fontSize:'9px',color:'var(--text3)',fontFamily:'var(--font-mono)' },
  weekSummary:{ display:'flex',gap:'20px',marginBottom:'14px' },
  weekStat:{ fontSize:'13px',color:'var(--text2)' },
  dayRow:{ display:'flex',alignItems:'center',gap:'10px',paddingBottom:'12px',marginBottom:'12px',borderBottom:'1px solid var(--border)',transition:'opacity 0.2s' },
  dayToggle:{ width:24,height:24,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 0.2s' },
  dayName:{ fontSize:'14px',fontWeight:500,color:'var(--text)',width:32,flexShrink:0 },
  daySelect:{ flex:1,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:8,padding:'7px 8px',color:'var(--text)',fontSize:'12px',outline:'none',minWidth:0 },
  kmCtrl:{ display:'flex',alignItems:'center',gap:'6px',flexShrink:0 },
  kmBtn:{ width:26,height:26,borderRadius:8,background:'var(--bg4)',border:'1px solid var(--border)',color:'var(--text)',fontSize:'16px',display:'flex',alignItems:'center',justifyContent:'center' },
  kmVal:{ fontFamily:'var(--font-mono)',fontSize:'13px',color:'var(--text)',minWidth:28,textAlign:'center' },
  saveBtn:{ width:'100%',padding:'15px',background:'var(--green)',color:'#000',fontFamily:'var(--font-display)',fontWeight:700,fontSize:'16px',borderRadius:'var(--radius)',border:'none',transition:'all 0.3s' },
}
