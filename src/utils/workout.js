export const fmtTime = (s) => {
  const m = Math.floor(Math.abs(s) / 60)
  const sec = Math.abs(s) % 60
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

export const fmtDist = (km) => km.toFixed(2)

// Speed constants (km/min)
const RUN_SPEED  = 0.133  // ~8 km/h
const WALK_SPEED = 0.067  // ~4 km/h

export const blockSpeed = (type) => type === 'run' ? RUN_SPEED : WALK_SPEED

// Estimate distance covered by a sequence of blocks (one cycle)
export const estimateCycleDist = (blocks) =>
  blocks.reduce((acc, b) => acc + (b.dur / 60) * blockSpeed(b.type), 0)

// How many full cycles + remaining dist to reach targetKm
export const cyclesNeeded = (blocks, targetKm) => {
  const cycleDist = estimateCycleDist(blocks)
  if (cycleDist <= 0) return 0
  return Math.ceil(targetKm / cycleDist)
}

// Build the full execution sequence until targetKm is reached
export const buildSequence = (blocks, targetKm) => {
  const seq = []
  let distSoFar = 0
  let rep = 1
  while (distSoFar < targetKm) {
    for (const b of blocks) {
      if (distSoFar >= targetKm) break
      const dist = (b.dur / 60) * blockSpeed(b.type)
      // If this block would overshoot, trim its duration
      const remaining = targetKm - distSoFar
      const speed = blockSpeed(b.type)
      const maxDur = Math.ceil((remaining / speed) * 60)
      const dur = Math.min(b.dur, maxDur)
      seq.push({ ...b, dur, rep })
      distSoFar += (dur / 60) * speed
    }
    rep++
  }
  return seq
}

export const estimateTotalTime = (blocks, targetKm) => {
  const seq = buildSequence(blocks, targetKm)
  return seq.reduce((s, b) => s + b.dur, 0)
}

// localStorage helpers
const HISTORY_KEY = 'paceup_history'
const PLAN_KEY    = 'paceup_plan'

export const saveWorkout = (workout) => {
  const history = getHistory()
  history.unshift({ ...workout, id: Date.now() })
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)))
}

export const getHistory = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') }
  catch { return [] }
}

export const deleteWorkout = (id) => {
  const history = getHistory().filter(w => w.id !== id)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

export const clearHistory = () => {
  localStorage.removeItem(HISTORY_KEY)
}

export const savePlan = (plan) =>
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan))

export const loadPlan = () => {
  try {
    const p = JSON.parse(localStorage.getItem(PLAN_KEY))
    if (p && p.blocks && p.targetKm) return p
  } catch {}
  return { blocks: [{ type: 'run', dur: 60 }, { type: 'walk', dur: 60 }], targetKm: 5 }
}

export const blockLabel  = (t) => t === 'run' ? 'Corrida' : 'Caminhada'
export const blockColor  = (t) => t === 'run' ? 'var(--green)' : 'var(--blue)'
export const blockDimBg  = (t) => t === 'run' ? 'var(--green-dim)' : 'var(--blue-dim)'
export const blockMidBg  = (t) => t === 'run' ? 'var(--green-mid)' : 'rgba(79,195,247,0.25)'

export const PRESETS = {
  'C25K':         { blocks: [{ type:'run',dur:60},{type:'walk',dur:90}], label:'1min correr / 1m30 andar' },
  'Queima gordura':{ blocks: [{ type:'walk',dur:180},{type:'run',dur:120}], label:'3min andar / 2min correr' },
  'Fartlek':      { blocks: [{ type:'run',dur:180},{type:'walk',dur:60}], label:'3min correr / 1min andar' },
  'HIIT 30/30':   { blocks: [{ type:'run',dur:30},{type:'walk',dur:30}], label:'30s correr / 30s andar' },
}

export const fmtPace = (minPerKm) => {
  if (!minPerKm) return '--:--'
  const m = Math.floor(minPerKm)
  const s = Math.round((minPerKm - m) * 60)
  return `${m}:${String(s).padStart(2,'0')}`
}
