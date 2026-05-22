export const fmtTime = (s) => {
  const abs = Math.abs(s||0)
  const m = Math.floor(abs/60), sec = abs%60
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}
export const fmtDist = (km) => (km||0).toFixed(2)
export const fmtPace = (minPerKm) => {
  if (!minPerKm) return "--'--"
  const m = Math.floor(minPerKm), s = String(Math.round((minPerKm-m)*60)).padStart(2,'0')
  return `${m}'${s}"`
}

// Speed km/min
const RUN_SPEED  = 0.133
const WALK_SPEED = 0.067
export const blockSpeed = (t) => t==='run' ? RUN_SPEED : WALK_SPEED
export const blockLabel = (t) => t==='run' ? 'Corrida' : 'Caminhada'
export const blockColor = (t) => t==='run' ? 'var(--green)' : 'var(--blue)'
export const blockDimBg = (t) => t==='run' ? 'var(--green-dim)' : 'var(--blue-dim)'

export const buildSequence = (blocks, targetKm) => {
  const seq=[]; let dist=0, rep=1
  while(dist<targetKm){
    for(const b of blocks){
      if(dist>=targetKm) break
      const remaining=targetKm-dist, speed=blockSpeed(b.type)
      const maxDur=Math.ceil((remaining/speed)*60)
      const dur=Math.min(b.dur,maxDur)
      seq.push({...b,dur,rep}); dist+=(dur/60)*speed
    }
    rep++
  }
  return seq
}

export const estimateTotalTime = (blocks, targetKm) =>
  buildSequence(blocks,targetKm).reduce((s,b)=>s+b.dur,0)

// Calorie calculation using MET + weight
export const calcCalories = (durationSec, isRunning, weightKg) => {
  const met = isRunning ? 9.8 : 3.5
  return Math.round((met * (weightKg||70) * (durationSec/3600)))
}

// localStorage
const KEYS = { history:'pu_history', plan:'pu_plan', profile:'pu_profile', weekplan:'pu_weekplan' }

export const saveWorkout   = (w)  => { const h=getHistory(); h.unshift({...w,id:Date.now()}); localStorage.setItem(KEYS.history,JSON.stringify(h.slice(0,60))) }
export const getHistory    = ()   => { try{return JSON.parse(localStorage.getItem(KEYS.history)||'[]')}catch{return[]} }
export const deleteWorkout = (id) => { localStorage.setItem(KEYS.history,JSON.stringify(getHistory().filter(w=>w.id!==id))) }
export const clearHistory  = ()   => localStorage.removeItem(KEYS.history)

export const savePlan = (p) => localStorage.setItem(KEYS.plan, JSON.stringify(p))
export const loadPlan = () => {
  try{ const p=JSON.parse(localStorage.getItem(KEYS.plan)); if(p?.blocks&&p?.targetKm) return p }catch{}
  return { blocks:[{type:'run',dur:60},{type:'walk',dur:60}], targetKm:5, freeMode:false }
}

export const saveProfile = (p) => localStorage.setItem(KEYS.profile, JSON.stringify(p))
export const loadProfile = () => {
  try{ return JSON.parse(localStorage.getItem(KEYS.profile))||{} }catch{ return {} }
}

export const saveWeekPlan = (p) => localStorage.setItem(KEYS.weekplan, JSON.stringify(p))
export const loadWeekPlan = () => {
  try{ return JSON.parse(localStorage.getItem(KEYS.weekplan))||defaultWeekPlan() }catch{ return defaultWeekPlan() }
}
const defaultWeekPlan = () => ({
  days: [
    {day:'Seg',active:true,  type:'run',   targetKm:5},
    {day:'Ter',active:false, type:'walk',  targetKm:3},
    {day:'Qua',active:true,  type:'run',   targetKm:8},
    {day:'Qui',active:false, type:'rest',  targetKm:0},
    {day:'Sex',active:true,  type:'run',   targetKm:5},
    {day:'Sáb',active:true,  type:'long',  targetKm:12},
    {day:'Dom',active:false, type:'rest',  targetKm:0},
  ]
})

export const WORKOUT_TYPES = {
  run:   { label:'Corrida',       color:'var(--green)',  icon:'🏃' },
  walk:  { label:'Caminhada',     color:'var(--blue)',   icon:'🚶' },
  long:  { label:'Longo',         color:'var(--amber)',  icon:'🛣️' },
  hiit:  { label:'HIIT',          color:'var(--red)',    icon:'⚡' },
  rest:  { label:'Descanso',      color:'var(--text3)',  icon:'💤' },
}

export const PRESETS = {
  'C25K':          { blocks:[{type:'run',dur:60},{type:'walk',dur:90}],   label:'1min correr / 1m30 andar' },
  'Queima gordura':{ blocks:[{type:'walk',dur:180},{type:'run',dur:120}], label:'3min andar / 2min correr' },
  'Fartlek':       { blocks:[{type:'run',dur:180},{type:'walk',dur:60}],  label:'3min correr / 1min andar' },
  'HIIT 30/30':    { blocks:[{type:'run',dur:30},{type:'walk',dur:30}],   label:'30s correr / 30s andar'  },
}
