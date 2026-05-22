import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  buildSequence, fmtTime, fmtDist,
  blockLabel, blockColor, blockDimBg,
  saveWorkout, loadPlan,
} from '../utils/workout.js'

const L = window.L
const fp = (v) => { if(!v) return "--'--"; const m=Math.floor(v),s=String(Math.round((v-m)*60)).padStart(2,'0'); return `${m}'${s}"` }

// ─── haversine distance in km ───────────────────────────────────────────────
function haversine(la1,lo1,la2,lo2) {
  const R=6371, dLa=(la2-la1)*Math.PI/180, dLo=(lo2-lo1)*Math.PI/180
  const a=Math.sin(dLa/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}

export default function Execute() {
  const nav = useNavigate()
  const loc = useLocation()
  const { blocks, targetKm, freeMode } = loc.state || loadPlan()
  const sequence = useRef(buildSequence(blocks, targetKm))

  const [idx, setIdx]         = useState(0)
  const [secLeft, setSecLeft] = useState(sequence.current[0]?.dur || 60)
  const [paused, setPaused]   = useState(false)
  const [totalSec, setTotalSec] = useState(0)
  const [distKm, setDistKm]   = useState(0)
  const [calories, setCals]   = useState(0)
  const [pace, setPace]       = useState(null)
  const [gpsStatus, setGps]   = useState('waiting')
  const [mapReady, setMapReady] = useState(false)
  const [shareScreen, setShareScreen] = useState(null)
  const [photoStart, setPhotoStart] = useState(null)
  const [photoEnd,   setPhotoEnd]   = useState(null)
  const [showPhotoPrompt, setShowPhotoPrompt] = useState(false) // 'start'|'end'|null
  const photoInputRef = useRef(null)
  const photoModeRef  = useRef(null) // {workout, snapshot} — shown at end

  // refs
  const ivRef      = useRef(null)
  const idxRef     = useRef(0)
  const secRef     = useRef(sequence.current[0]?.dur || 60)
  const totalRef   = useRef(0)
  const pausedRef  = useRef(false)
  const distRef    = useRef(0)
  const mapRef     = useRef(null)
  const lmap       = useRef(null)
  const polyline   = useRef(null)
  const dot        = useRef(null)
  const coordsRef  = useRef([])
  const watchId    = useRef(null)
  const lastPos    = useRef(null)

  // ── stats computation ───────────────────────────────────────────────────
  const computeStats = useCallback((elapsed, curIdx, realKm) => {
    let km
    if (realKm > 0) {
      km = freeMode ? realKm : Math.min(targetKm, realKm)
    } else {
      const seq = sequence.current
      let runSec = 0
      for (let i=0;i<curIdx&&i<seq.length;i++) if(seq[i].type==='run') runSec+=seq[i].dur
      const walkSec = elapsed - runSec
      km = (freeMode?999:Math.min(targetKm,999)) && Math.min(freeMode?99:targetKm,
        (runSec/60)*0.133 + Math.max(0,walkSec/60)*0.067)
    }
    return {
      km: parseFloat(km.toFixed(2)),
      cal: Math.round(elapsed/60*7),
      pace: km>0.05&&elapsed>10 ? (elapsed/60)/km : null,
    }
  }, [targetKm, freeMode])

  // ── GPS ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) { setGps('error'); return }

    // Always explicitly request — triggers the browser permission dialog
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps('ok')
        const { latitude: lat, longitude: lng } = pos.coords
        lastPos.current = { lat, lng }
        coordsRef.current = [[lat, lng]]
        if (lmap.current) {
          lmap.current.setView([lat, lng], 17)
        }
      },
      () => setGps('error'),
      { enableHighAccuracy: true, timeout: 15000 }
    )

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setGps('ok')
        if (lastPos.current) {
          const d = haversine(lastPos.current.lat, lastPos.current.lng, lat, lng)
          if (d < 0.5) distRef.current += d
        }
        lastPos.current = { lat, lng }
        coordsRef.current.push([lat, lng])

        if (lmap.current) {
          lmap.current.setView([lat, lng], lmap.current.getZoom(), { animate: true })
          // Update/create Strava-style polyline trail
          if (polyline.current) {
            polyline.current.setLatLngs(coordsRef.current)
          } else if (coordsRef.current.length >= 2) {
            polyline.current = L.polyline(coordsRef.current, {
              color: 'var(--green)', weight: 5, opacity: 0.95,
              lineCap: 'round', lineJoin: 'round',
            }).addTo(lmap.current)
          }
          // Moving dot (user position)
          if (dot.current) {
            dot.current.setLatLng([lat, lng])
          } else {
            // pulsing circle marker
            dot.current = L.circleMarker([lat, lng], {
              radius: 8, color: '#fff', weight: 2.5,
              fillColor: '#C8F04A', fillOpacity: 1,
            }).addTo(lmap.current)
          }
        }
      },
      () => setGps('error'),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
    )
    return () => navigator.geolocation.clearWatch(watchId.current)
  }, [])

  // ── Init map ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !L) return
    const t = setTimeout(() => {
      if (lmap.current) return
      lmap.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        // allow user to zoom/drag
        dragging: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
      }).setView([-14.235, -51.925], 15)

      // Satellite tiles
      L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20, subdomains: ['0','1','2','3'],
      }).addTo(lmap.current)
      // Hybrid label overlay
      L.tileLayer('https://mt{s}.google.com/vt/lyrs=h&x={x}&y={y}&z={z}', {
        maxZoom: 20, subdomains: ['0','1','2','3'], opacity: 0.65,
      }).addTo(lmap.current)

      // Zoom buttons (custom)
      setMapReady(true)
    }, 200)
    return () => clearTimeout(t)
  }, [])

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    ivRef.current = setInterval(() => {
      if (pausedRef.current) return
      totalRef.current += 1
      setTotalSec(totalRef.current)
      const st = computeStats(totalRef.current, idxRef.current, distRef.current)
      setDistKm(st.km); setCals(st.cal); setPace(st.pace)
      secRef.current -= 1
      setSecLeft(secRef.current)
      if (secRef.current <= 0) {
        const next = idxRef.current + 1
        if (next >= sequence.current.length) {
          clearInterval(ivRef.current)
          finishWorkout(st)
        } else {
          idxRef.current = next; setIdx(next)
          secRef.current = sequence.current[next].dur
          setSecLeft(secRef.current)
        }
      }
    }, 1000)
    return () => clearInterval(ivRef.current)
  }, [computeStats])

  // ── Generate share card ──────────────────────────────────────────────────
  const buildShareCard = useCallback(async (stats) => {
    const coords = coordsRef.current
    const W = 540, H = 960
    const ROUTE_H = 340, MID_H = 460, BOT_H = 160
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')

    // -- ROUTE SECTION --
    ctx.fillStyle = '#0d0f0a'
    ctx.fillRect(0, 0, W, ROUTE_H)

    if (coords.length >= 2) {
      const lats = coords.map(c=>c[0]), lngs = coords.map(c=>c[1])
      const minLat=Math.min(...lats), maxLat=Math.max(...lats)
      const minLng=Math.min(...lngs), maxLng=Math.max(...lngs)
      const dLa=(maxLat-minLat)||0.001, dLo=(maxLng-minLng)||0.001
      const pad=0.28
      const bMinLa=minLat-dLa*pad, bMaxLa=maxLat+dLa*pad
      const bMinLo=minLng-dLo*pad, bMaxLo=maxLng+dLo*pad
      const mg=52
      const tX = lo => mg+((lo-bMinLo)/(bMaxLo-bMinLo))*(W-mg*2)
      const tY = la => (ROUTE_H-mg)-((la-bMinLa)/(bMaxLa-bMinLa))*(ROUTE_H-mg*2)

      // Grid lines (subtle)
      ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1
      for(let i=1;i<4;i++){
        ctx.beginPath(); ctx.moveTo(W*i/4,0); ctx.lineTo(W*i/4,ROUTE_H); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0,ROUTE_H*i/4); ctx.lineTo(W,ROUTE_H*i/4); ctx.stroke()
      }

      // Glow halo
      ctx.shadowColor='#C8F04A'; ctx.shadowBlur=22
      ctx.beginPath(); ctx.strokeStyle='rgba(200,240,74,0.22)'; ctx.lineWidth=18
      ctx.lineCap='round'; ctx.lineJoin='round'
      coords.forEach(([la,lo],i)=>i===0?ctx.moveTo(tX(lo),tY(la)):ctx.lineTo(tX(lo),tY(la)))
      ctx.stroke(); ctx.shadowBlur=0

      // White route
      ctx.beginPath(); ctx.strokeStyle='#ffffff'; ctx.lineWidth=3.5
      coords.forEach(([la,lo],i)=>i===0?ctx.moveTo(tX(lo),tY(la)):ctx.lineTo(tX(lo),tY(la)))
      ctx.stroke()

      // Start dot (white)
      const [sLa,sLo]=coords[0]
      ctx.beginPath(); ctx.arc(tX(sLo),tY(sLa),6,0,Math.PI*2)
      ctx.fillStyle='#fff'; ctx.fill()

      // End dot (lime)
      const [eLa,eLo]=coords[coords.length-1]
      ctx.shadowColor='#C8F04A'; ctx.shadowBlur=16
      ctx.beginPath(); ctx.arc(tX(eLo),tY(eLa),9,0,Math.PI*2)
      ctx.fillStyle='#C8F04A'; ctx.fill(); ctx.shadowBlur=0
    } else {
      // No GPS — placeholder
      ctx.fillStyle='rgba(255,255,255,0.06)'
      ctx.font='14px Arial'; ctx.textAlign='center'; ctx.fillStyle='rgba(255,255,255,0.2)'
      ctx.fillText('Sem dados de rota GPS', W/2, ROUTE_H/2)
    }

    // -- STATS SECTION --
    ctx.fillStyle='#0C0C0E'; ctx.fillRect(0,ROUTE_H,W,MID_H)
    // Lime top border
    const grad=ctx.createLinearGradient(0,0,W,0)
    grad.addColorStop(0,'#C8F04A'); grad.addColorStop(1,'#7fd83a')
    ctx.fillStyle=grad; ctx.fillRect(0,ROUTE_H,W,3)

    // "PACEUP" tag
    ctx.textAlign='center'; ctx.font='600 13px Arial'
    ctx.fillStyle='rgba(200,240,74,0.55)'; ctx.letterSpacing='4px'
    ctx.fillText('PACEUP', W/2, ROUTE_H+38); ctx.letterSpacing='0px'
    ctx.fillStyle='rgba(255,255,255,0.07)'; ctx.fillRect(40,ROUTE_H+50,W-80,1)

    const statsData = [
      { val: stats.km>0?stats.km.toFixed(2):'0.00', unit:'km',     label:'Distância', y:ROUTE_H+155 },
      { val: fmtTime(stats.durationSec||totalRef.current), unit:'',  label:'Duração',  y:ROUTE_H+275 },
      { val: fp(stats.pace),                         unit:'min/km', label:'Pace médio',y:ROUTE_H+395 },
    ]

    statsData.forEach(({val,unit,label,y}) => {
      ctx.textAlign='left'; ctx.font='bold 76px Arial'; ctx.fillStyle='#EFEFEF'
      const vw=ctx.measureText(val).width
      const startX = unit ? W/2-vw/2-14 : W/2-vw/2
      ctx.fillText(val, startX, y)
      if(unit){ ctx.font='bold 18px Arial'; ctx.fillStyle='rgba(239,239,239,0.4)'; ctx.fillText(unit, startX+vw+8, y-40) }
      ctx.textAlign='center'; ctx.font='14px Arial'; ctx.fillStyle='rgba(239,239,239,0.3)'
      ctx.fillText(label, W/2, y+28)
      ctx.fillStyle='rgba(255,255,255,0.05)'; ctx.fillRect(40,y+46,W-80,1)
    })

    // -- BRANDING --
    ctx.fillStyle='#0C0C0E'; ctx.fillRect(0,ROUTE_H+MID_H,W,BOT_H)
    ctx.fillStyle='rgba(255,255,255,0.05)'; ctx.fillRect(0,ROUTE_H+MID_H,W,1)

    // Logo
    ctx.textAlign='center'; ctx.font='bold 32px Arial'; ctx.fillStyle='#EFEFEF'
    ctx.fillText('PaceUp', W/2, ROUTE_H+MID_H+62)
    ctx.font='13px Arial'; ctx.fillStyle='rgba(239,239,239,0.25)'
    ctx.fillText('seu ritmo. sua corrida.', W/2, ROUTE_H+MID_H+86)
    // Date
    const ds = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})
    ctx.font='12px Arial'; ctx.fillStyle='rgba(200,240,74,0.7)'
    ctx.fillText(ds, W/2, ROUTE_H+MID_H+116)

    return canvas.toDataURL('image/png')
  }, [])

  // ── Finish ───────────────────────────────────────────────────────────────
  const finishWorkout = useCallback(async (st) => {
    clearInterval(ivRef.current)
    navigator.geolocation.clearWatch(watchId.current)
    const stats = { ...st, durationSec: totalRef.current }
    const snapshot = await buildShareCard(stats)
    const workout = {
      date: Date.now(), blocks, targetKm,
      distKm: stats.km, durationSec: stats.durationSec,
      calories: stats.cal, avgPace: stats.pace,
      route: snapshot,
      coords: coordsRef.current.slice(0,500),
      photoStart, photoEnd,
    }
    saveWorkout(workout)
    setShareScreen({ workout, snapshot })
  }, [blocks, targetKm, buildShareCard, photoStart, photoEnd])

  const stop = useCallback(async () => {
    clearInterval(ivRef.current)
    navigator.geolocation.clearWatch(watchId.current)
    const st = computeStats(totalRef.current, idxRef.current, distRef.current)
    const stats = { ...st, durationSec: totalRef.current }
    const snapshot = await buildShareCard(stats)
    const workout = {
      date: Date.now(), blocks, targetKm,
      distKm: stats.km, durationSec: stats.durationSec,
      calories: stats.cal, avgPace: stats.pace,
      route: snapshot,
      coords: coordsRef.current.slice(0,500),
      photoStart, photoEnd,
    }
    saveWorkout(workout)
    setShareScreen({ workout, snapshot })
  }, [blocks, targetKm, computeStats, buildShareCard, photoStart, photoEnd])

  const togglePause = () => { pausedRef.current=!pausedRef.current; setPaused(p=>!p) }

  const triggerPhoto = (mode) => {
    photoModeRef.current = mode
    photoInputRef.current?.click()
  }
  const handlePhotoFile = (e) => {
    const file = e.target.files?.[0]; if(!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if(photoModeRef.current==='start') setPhotoStart(ev.target.result)
      else setPhotoEnd(ev.target.result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── Show share screen automatically when done ───────────────────────────
  if (shareScreen) {
    return (
      <ShareScreen
        workout={shareScreen.workout}
        snapshot={shareScreen.snapshot}
        onHome={() => nav('/')}
        onHistory={() => nav('/history')}
      />
    )
  }

  const cur = sequence.current[idx]
  if (!cur) return null
  const next = sequence.current[idx+1]
  const isRun = cur.type==='run'
  const accent = isRun ? 'var(--green)' : 'var(--blue)'
  const blockPct = Math.round(((cur.dur-secLeft)/cur.dur)*100)
  const distPct = freeMode
    ? Math.min(100,(distKm/Math.max(distKm,1))*100)
    : Math.min(100,(distKm/targetKm)*100)

  return (
    <div style={{...R.root, background: isRun?'#090E07':'#070C10'}}>
      {/* Header */}
      <div style={R.header}>
        <button style={R.closeBtn} onClick={stop}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
        <div style={R.voltas}>volta {cur.rep}</div>
        {/* GPS dot */}
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <div style={{
            width:7, height:7, borderRadius:'50%',
            background: gpsStatus==='ok'?'var(--green)':gpsStatus==='error'?'var(--red)':'var(--amber)',
            boxShadow: gpsStatus==='ok'?'0 0 8px var(--green)':'none',
            animation: gpsStatus==='waiting'?'pulse 1.5s infinite':'none',
          }}/>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text3)'}}>
            {gpsStatus==='ok'?'GPS':'gps...'}
          </span>
        </div>
      </div>

      {/* Distance bar */}
      <div style={R.barWrap}>
        <div style={R.barTrack}>
          <div style={{...R.barFill, width:distPct+'%', background:`linear-gradient(90deg,${accent}88,${accent})`, boxShadow:`0 0 12px ${accent}55`}} />
          {[0.25,0.5,0.75].map(p=>(
            <div key={p} style={{position:'absolute',left:(p*100)+'%',top:0,bottom:0,width:'1px',background:'rgba(255,255,255,0.08)'}}/>
          ))}
          {/* runner dot */}
          <div style={{
            position:'absolute',left:`calc(${distPct}% - 5px)`,top:'50%',
            width:10,height:10,borderRadius:'50%',background:accent,
            transform:'translateY(-50%)',boxShadow:`0 0 8px ${accent}`,
            transition:'left 1.2s linear',
          }}/>
        </div>
        <div style={R.barLabels}>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'12px',color:accent,fontWeight:500}}>{fmtDist(distKm)} km</span>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text3)'}}>{freeMode?'livre':fmtDist(targetKm)+' km'}</span>
        </div>
      </div>

      {/* Map — zoomable, with Strava trail */}
      <div style={R.mapWrap}>
        <div ref={mapRef} style={{width:'100%',height:'100%'}}/>
        {!mapReady && (
          <div style={R.mapLoader}><span style={{color:'var(--text3)',fontSize:'12px',fontFamily:'var(--font-mono)'}}>carregando mapa…</span></div>
        )}
        {/* Zoom controls */}
        {mapReady && (
          <div style={R.zoomBtns}>
            <button style={R.zoomBtn} onClick={()=>lmap.current?.zoomIn()}>+</button>
            <button style={R.zoomBtn} onClick={()=>lmap.current?.zoomOut()}>−</button>
          </div>
        )}
        {/* Re-center button */}
        {mapReady && lastPos.current && (
          <button style={R.centerBtn} onClick={()=>lastPos.current&&lmap.current?.setView([lastPos.current.lat,lastPos.current.lng],17)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill="currentColor"/>
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Current block */}
      <div style={{...R.block, background: isRun?'rgba(200,240,74,0.06)':'rgba(91,196,245,0.06)', borderColor: isRun?'rgba(200,240,74,0.15)':'rgba(91,196,245,0.15)'}}>
        <div style={{...R.blockBadge, color:accent, background: isRun?'rgba(200,240,74,0.1)':'rgba(91,196,245,0.1)'}}>
          {isRun?'🏃 Corrida':'🚶 Caminhada'}
        </div>
        <div style={{...R.timer, color:accent}}>{fmtTime(secLeft)}</div>
        <div style={R.blockBar}>
          <div style={{...R.blockFill, width:blockPct+'%', background:accent}}/>
        </div>
      </div>

      {/* Next block */}
      {next && (
        <div style={R.nextRow}>
          <span style={R.nextLabel}>a seguir</span>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:blockColor(next.type)}}/>
            <span style={{fontSize:'13px',color:'var(--text2)'}}>{blockLabel(next.type)}</span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:'13px',color:'var(--text3)'}}>{fmtTime(next.dur)}</span>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div style={R.metricsRow}>
        <Metric label="tempo"    value={fmtTime(totalSec)} />
        <Metric label="distância" value={fmtDist(distKm)+' km'} accent={accent} />
        <Metric label="pace"     value={fp(pace)} />
        <Metric label="kcal"     value={String(calories)} />
      </div>

      {/* Controls */}
      <div style={R.controls}>
        <button style={R.pauseBtn} onClick={togglePause}>
          {paused
            ? <><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Retomar</>
            : <><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pausar</>}
        </button>
        <button style={R.stopBtn} onClick={stop}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg> Encerrar
        </button>
      </div>

      {/* Photo capture */}
      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handlePhotoFile}/>
      <div style={{display:'flex',gap:'8px',margin:'6px 14px 0'}}>
        <button style={{flex:1,padding:'9px',borderRadius:10,background:photoStart?'rgba(181,242,61,0.15)':'rgba(255,255,255,0.04)',border:`1px solid ${photoStart?'rgba(181,242,61,0.3)':'rgba(255,255,255,0.08)'}`,color:photoStart?'var(--green)':'var(--text3)',fontSize:'12px',fontFamily:'var(--font-mono)',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}} onClick={()=>triggerPhoto('start')}>
          📷 {photoStart?'Início ✓':'Foto início'}
        </button>
        <button style={{flex:1,padding:'9px',borderRadius:10,background:photoEnd?'rgba(91,196,245,0.15)':'rgba(255,255,255,0.04)',border:`1px solid ${photoEnd?'rgba(91,196,245,0.3)':'rgba(255,255,255,0.08)'}`,color:photoEnd?'var(--blue)':'var(--text3)',fontSize:'12px',fontFamily:'var(--font-mono)',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}} onClick={()=>triggerPhoto('end')}>
          📷 {photoEnd?'Final ✓':'Foto final'}
        </button>
      </div>

      {paused && (
        <div style={R.pauseOverlay}>
          <div style={R.pauseCard}>
            <span style={R.pausedLabel}>PAUSADO</span>
            <button style={{...R.pauseBtn, width:'100%', justifyContent:'center'}} onClick={togglePause}>▶ Retomar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Share / Done Screen ────────────────────────────────────────────────────
function ShareScreen({ workout, snapshot, onHome, onHistory }) {
  const dateStr = new Date(workout.date).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})
  const fp2 = (v) => { if(!v) return "--'--"; const m=Math.floor(v),s=String(Math.round((v-m)*60)).padStart(2,'0'); return `${m}'${s}"` }

  const doDownload = () => {
    const a = document.createElement('a')
    a.href = snapshot
    a.download = `paceup-${new Date(workout.date).toLocaleDateString('pt-BR').replace(/\//g,'-')}.png`
    a.click()
  }

  const doShare = async () => {
    if (navigator.share && snapshot) {
      try {
        const res = await fetch(snapshot)
        const blob = await res.blob()
        const file = new File([blob], 'corrida.png', { type:'image/png' })
        await navigator.share({ title:'Minha corrida - PaceUp', files:[file] })
        return
      } catch {}
    }
    doDownload()
  }

  return (
    <div style={SS.root}>
      {/* Preview of share card */}
      <div style={SS.previewWrap}>
        {snapshot
          ? <img src={snapshot} alt="card" style={SS.previewImg}/>
          : <div style={SS.noRoute}><span style={{color:'var(--text3)',fontSize:'13px'}}>Sem GPS — card indisponível</span></div>}
      </div>

      {/* Actions */}
      <div style={SS.actionsWrap}>
        <p style={SS.doneDate}>{dateStr}</p>

        {/* Stats strip */}
        <div style={SS.statsStrip}>
          <SS_Stat label="distância" value={fmtDist(workout.distKm||0)+' km'} accent="var(--green)" />
          <div style={SS.div}/>
          <SS_Stat label="duração"   value={fmtTime(workout.durationSec||0)} />
          <div style={SS.div}/>
          <SS_Stat label="pace médio" value={fp2(workout.avgPace)} accent="var(--blue)" />
          <div style={SS.div}/>
          <SS_Stat label="kcal"      value={workout.calories||0} />
        </div>

        {/* Share / download */}
        <button style={SS.shareBtn} onClick={doShare}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 12l4 4 4-4M12 3v13" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Salvar / Compartilhar
        </button>
        <div style={{display:'flex',gap:'10px'}}>
          <button style={SS.secBtn} onClick={onHistory}>Ver histórico</button>
          <button style={SS.secBtn} onClick={onHome}>Início</button>
        </div>
      </div>
    </div>
  )
}

function SS_Stat({ label, value, accent }) {
  return (
    <div style={{flex:1,textAlign:'center'}}>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'14px',color:accent||'var(--text)',fontWeight:500}}>{value}</div>
      <div style={{fontSize:'10px',color:'var(--text3)',marginTop:'2px'}}>{label}</div>
    </div>
  )
}

function Metric({ label, value, accent }) {
  return (
    <div style={{textAlign:'center'}}>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'14px',color:accent||'var(--text)',fontWeight:500}}>{value}</div>
      <div style={{fontSize:'10px',color:'var(--text3)',marginTop:'2px'}}>{label}</div>
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const R = {
  root:{minHeight:'100dvh',display:'flex',flexDirection:'column',paddingBottom:'16px',transition:'background 1s',position:'relative',overflow:'hidden'},
  header:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'52px 18px 10px'},
  closeBtn:{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'var(--text2)',padding:'8px 10px',display:'flex',alignItems:'center',justifyContent:'center'},
  voltas:{fontFamily:'var(--font-mono)',fontSize:'12px',color:'var(--text3)',background:'rgba(255,255,255,0.05)',padding:'5px 12px',borderRadius:'99px'},
  barWrap:{padding:'0 18px',marginBottom:'10px'},
  barTrack:{position:'relative',height:'7px',background:'rgba(255,255,255,0.05)',borderRadius:'99px',overflow:'visible',marginBottom:'6px'},
  barFill:{position:'absolute',left:0,top:0,bottom:0,borderRadius:'99px',transition:'width 1.2s linear',minWidth:'4px'},
  barLabels:{display:'flex',justifyContent:'space-between',marginTop:'6px'},
  mapWrap:{margin:'0 14px',height:'180px',borderRadius:'14px',overflow:'hidden',position:'relative',border:'1px solid rgba(255,255,255,0.07)',flexShrink:0},
  mapLoader:{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'#0d0d0d'},
  zoomBtns:{position:'absolute',right:'8px',bottom:'8px',display:'flex',flexDirection:'column',gap:'4px',zIndex:1000},
  zoomBtn:{width:'30px',height:'30px',background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'8px',color:'var(--text)',fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:300},
  centerBtn:{position:'absolute',left:'8px',bottom:'8px',width:'30px',height:'30px',background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'8px',color:'var(--text2)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000},
  block:{margin:'10px 14px 0',borderRadius:'var(--radius)',padding:'18px 20px 14px',display:'flex',flexDirection:'column',alignItems:'center',gap:'10px',border:'1px solid'},
  blockBadge:{padding:'5px 14px',borderRadius:'99px',fontSize:'13px',fontWeight:600},
  timer:{fontFamily:'var(--font-mono)',fontSize:'58px',fontWeight:500,letterSpacing:'-2px',lineHeight:1},
  blockBar:{width:'100%',height:'4px',background:'rgba(255,255,255,0.07)',borderRadius:'99px',overflow:'hidden'},
  blockFill:{height:'100%',borderRadius:'99px',transition:'width 1s linear'},
  nextRow:{display:'flex',justifyContent:'space-between',alignItems:'center',margin:'8px 18px 0',background:'rgba(255,255,255,0.03)',borderRadius:'10px',padding:'8px 14px'},
  nextLabel:{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text3)',letterSpacing:'1px',textTransform:'uppercase'},
  metricsRow:{display:'flex',justifyContent:'space-around',margin:'8px 14px 0',background:'rgba(255,255,255,0.03)',borderRadius:'12px',padding:'12px 8px',border:'1px solid rgba(255,255,255,0.04)'},
  controls:{display:'flex',gap:'10px',margin:'10px 14px 0'},
  pauseBtn:{flex:1,padding:'13px',borderRadius:'12px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',color:'var(--text)',fontFamily:'var(--font-display)',fontWeight:600,fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'},
  stopBtn:{flex:1,padding:'13px',borderRadius:'12px',background:'rgba(255,80,80,0.12)',border:'1px solid rgba(255,80,80,0.2)',color:'var(--red)',fontFamily:'var(--font-display)',fontWeight:600,fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'},
  pauseOverlay:{position:'absolute',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',padding:'32px'},
  pauseCard:{background:'var(--bg2)',borderRadius:'20px',padding:'32px',width:'100%',display:'flex',flexDirection:'column',gap:'20px',alignItems:'center'},
  pausedLabel:{fontFamily:'var(--font-mono)',fontSize:'13px',letterSpacing:'4px',color:'var(--text3)'},
}

const SS = {
  root:{minHeight:'100dvh',display:'flex',flexDirection:'column',background:'var(--bg)',animation:'scaleIn 0.3s ease both'},
  previewWrap:{flex:1,overflow:'auto',display:'flex',justifyContent:'center',alignItems:'flex-start',padding:'16px 24px 8px',background:'#0a0a0a'},
  previewImg:{maxWidth:'320px',width:'100%',borderRadius:'12px',boxShadow:'0 8px 48px rgba(0,0,0,0.6)',display:'block'},
  noRoute:{width:'100%',height:'200px',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg2)',borderRadius:'12px'},
  actionsWrap:{padding:'16px 18px max(24px,env(safe-area-inset-bottom))',background:'var(--bg2)',borderTop:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:'12px'},
  doneDate:{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text3)',textAlign:'center',letterSpacing:'0.5px',textTransform:'capitalize'},
  statsStrip:{display:'flex',alignItems:'center',background:'var(--bg3)',borderRadius:'12px',padding:'12px 6px',border:'1px solid var(--border)'},
  div:{width:'1px',height:'28px',background:'var(--border)',flexShrink:0},
  shareBtn:{padding:'15px',borderRadius:'13px',background:'var(--green)',color:'#000',fontFamily:'var(--font-display)',fontWeight:700,fontSize:'15px',border:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'},
  secBtn:{flex:1,padding:'13px',borderRadius:'12px',background:'var(--bg3)',border:'1px solid var(--border)',color:'var(--text2)',fontFamily:'var(--font-display)',fontWeight:600,fontSize:'14px'},
}
