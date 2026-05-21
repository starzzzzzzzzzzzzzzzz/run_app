import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  buildSequence, fmtTime, fmtDist,
  blockLabel, blockColor, blockDimBg, blockMidBg,
  saveWorkout, loadPlan
} from '../utils/workout.js'

// Leaflet loaded from CDN in index.html
const L = window.L

export default function Execute() {
  const nav = useNavigate()
  const loc = useLocation()

  const { blocks, targetKm, freeMode } = loc.state || loadPlan()
  const sequence = useRef(buildSequence(blocks, targetKm))
  const totalBlocks = sequence.current.length

  const [idx, setIdx]           = useState(0)
  const [secLeft, setSecLeft]   = useState(sequence.current[0]?.dur || 60)
  const [paused, setPaused]     = useState(false)
  const [done, setDone]         = useState(false)
  const [totalSec, setTotalSec] = useState(0)
  const [distKm, setDistKm]     = useState(0)
  const [calories, setCalories] = useState(0)
  const [pace, setPace]         = useState(null) // min/km
  const [mapReady, setMapReady] = useState(false)
  const [gpsStatus, setGpsStatus] = useState('waiting') // waiting | ok | error
  const [routeSnapshot, setRouteSnapshot]   = useState(null) // base64 png
  const [savedWorkout, setSavedWorkout]     = useState(null)

  const intervalRef  = useRef(null)
  const idxRef       = useRef(0)
  const secRef       = useRef(sequence.current[0]?.dur || 60)
  const totalSecRef  = useRef(0)
  const pausedRef    = useRef(false)
  const distKmRef    = useRef(0)

  // Map refs
  const mapRef       = useRef(null)
  const leafletMap   = useRef(null)
  const routeLine    = useRef(null)
  const userMarker   = useRef(null)
  const coordsRef    = useRef([]) // [{lat,lng}]
  const watchId      = useRef(null)
  const lastPos      = useRef(null)

  const computeStats = useCallback((elapsedTotal, currentIdx, realKm) => {
    let km
    if (realKm != null && realKm > 0) {
      km = Math.min(targetKm, realKm)
    } else {
      const seq = sequence.current
      let runSec = 0
      for (let i = 0; i < currentIdx && i < seq.length; i++) {
        if (seq[i].type === 'run') runSec += seq[i].dur
      }
      const walkSec = elapsedTotal - runSec
      km = Math.min(targetKm, (runSec / 60) * 0.133 + (Math.max(0, walkSec) / 60) * 0.067)
    }
    const cal = Math.round(elapsedTotal / 60 * 7)
    const paceVal = (km > 0.05 && elapsedTotal > 10)
      ? (elapsedTotal / 60) / km
      : null
    return { km: parseFloat(km.toFixed(2)), cal, pace: paceVal }
  }, [targetKm])

  // GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error')
      return
    }
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords
        setGpsStatus('ok')

        // accumulate distance from GPS
        if (lastPos.current) {
          const d = haversine(lastPos.current.lat, lastPos.current.lng, lat, lng)
          if (d < 0.3) { // ignore jumps > 300m (GPS glitch)
            distKmRef.current = Math.min(targetKm, distKmRef.current + d)
          }
        }
        lastPos.current = { lat, lng }
        coordsRef.current.push([lat, lng])

        // update map
        if (leafletMap.current) {
          leafletMap.current.setView([lat, lng], leafletMap.current.getZoom())
          if (userMarker.current) {
            userMarker.current.setLatLng([lat, lng])
          } else {
            userMarker.current = L.circleMarker([lat, lng], {
              radius: 9, color: '#00e676', fillColor: '#00e676',
              fillOpacity: 1, weight: 3,
            }).addTo(leafletMap.current)
          }
          if (routeLine.current) {
            routeLine.current.setLatLngs(coordsRef.current)
          } else if (coordsRef.current.length >= 2) {
            routeLine.current = L.polyline(coordsRef.current, {
              color: '#00e676', weight: 4, opacity: 0.8,
            }).addTo(leafletMap.current)
          }
        }
      },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    )
    return () => navigator.geolocation.clearWatch(watchId.current)
  }, [targetKm])

  // Init Leaflet map
  useEffect(() => {
    if (!mapRef.current || !L) return
    // slight delay to allow render
    const t = setTimeout(() => {
      if (leafletMap.current) return
      leafletMap.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
      }).setView([-14.235, -51.925], 15)

      // Google Satellite tiles
      L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['0','1','2','3'],
      }).addTo(leafletMap.current)
      // Hybrid label overlay (ruas/nomes em cima do satélite)
      L.tileLayer('https://mt{s}.google.com/vt/lyrs=h&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['0','1','2','3'],
        opacity: 0.7,
      }).addTo(leafletMap.current)

      setMapReady(true)
    }, 300)
    return () => clearTimeout(t)
  }, [])

  // Main timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (pausedRef.current) return

      totalSecRef.current += 1
      setTotalSec(totalSecRef.current)

      const stats = computeStats(totalSecRef.current, idxRef.current, distKmRef.current)
      setDistKm(stats.km)
      setCalories(stats.cal)
      setPace(stats.pace)

      secRef.current -= 1
      setSecLeft(secRef.current)

      if (secRef.current <= 0) {
        const nextIdx = idxRef.current + 1
        if (nextIdx >= sequence.current.length) {
          clearInterval(intervalRef.current)
          finishWorkout(stats)
        } else {
          idxRef.current = nextIdx
          setIdx(nextIdx)
          secRef.current = sequence.current[nextIdx].dur
          setSecLeft(secRef.current)
        }
      }
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [blocks, targetKm, computeStats])

  const captureRoute = useCallback(() => {
    return new Promise((resolve) => {
      const coords   = coordsRef.current
      const dist     = distKmRef.current
      const elapsed  = totalSecRef.current
      const paceVal  = dist > 0.05 ? (elapsed / 60) / dist : null

      // Portrait 9:16 card (stories format)
      const W = 540, H = 960
      const ROUTE_H = 340
      const MID_H   = 460
      const BOT_H   = 160

      const canvas = document.createElement('canvas')
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d')

      const drawBranding = () => {
        ctx.fillStyle = '#0a0a0a'
        ctx.fillRect(0, ROUTE_H + MID_H, W, BOT_H)
        ctx.fillStyle = '#00e676'
        ctx.fillRect(0, ROUTE_H + MID_H, W, 3)
        ctx.textAlign = 'center'
        ctx.font = 'bold 38px Arial'
        ctx.fillStyle = '#ffffff'
        ctx.fillText('PaceUp', W / 2, ROUTE_H + MID_H + 74)
        ctx.font = '15px Arial'
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        ctx.fillText('seu ritmo. sua corrida.', W / 2, ROUTE_H + MID_H + 104)
        const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
        ctx.font = '13px Arial'
        ctx.fillStyle = 'rgba(0,230,118,0.8)'
        ctx.fillText(dateStr, W / 2, ROUTE_H + MID_H + 134)
        resolve(canvas.toDataURL('image/png'))
      }

      const drawStats = () => {
        ctx.fillStyle = '#0a0a0a'
        ctx.fillRect(0, ROUTE_H, W, MID_H)
        ctx.textAlign = 'center'
        ctx.font = 'bold 18px Arial'
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        ctx.letterSpacing = '6px'
        ctx.fillText('RUNNING', W / 2, ROUTE_H + 44)
        ctx.letterSpacing = '0px'
        ctx.fillStyle = 'rgba(255,255,255,0.07)'
        ctx.fillRect(40, ROUTE_H + 56, W - 80, 1)

        const pm = paceVal ? Math.floor(paceVal) : 0
        const ps = paceVal ? String(Math.round((paceVal % 1) * 60)).padStart(2,'0') : '00'
        const statsData = [
          { value: dist > 0 ? dist.toFixed(2) : '0.00', unit: 'km',     label: 'Distância', y: ROUTE_H + 150 },
          { value: fmtTime(elapsed),                      unit: '',       label: 'Duração',   y: ROUTE_H + 270 },
          { value: paceVal ? `${pm}:${ps}` : '--:--',    unit: 'min/km', label: 'Pace médio',y: ROUTE_H + 390 },
        ]

        statsData.forEach(({ value, unit, label, y }) => {
          ctx.textAlign = 'center'
          ctx.font = 'bold 78px Arial'
          ctx.fillStyle = '#ffffff'
          const vw = ctx.measureText(value).width
          ctx.textAlign = 'left'
          let startX = W / 2 - vw / 2
          if (unit) startX -= 18
          ctx.fillText(value, startX, y)
          if (unit) {
            ctx.font = 'bold 20px Arial'
            ctx.fillStyle = 'rgba(255,255,255,0.45)'
            ctx.fillText(unit, startX + vw + 6, y - 42)
          }
          ctx.font = '15px Arial'
          ctx.fillStyle = 'rgba(255,255,255,0.35)'
          ctx.textAlign = 'center'
          ctx.fillText(label, W / 2, y + 30)
          ctx.fillStyle = 'rgba(255,255,255,0.06)'
          ctx.fillRect(40, y + 48, W - 80, 1)
        })

        drawBranding()
      }

      const drawRoute = () => {
        ctx.fillStyle = '#0d0d0d'
        ctx.fillRect(0, 0, W, ROUTE_H)

        if (coords.length >= 2) {
          const lats = coords.map(c => c[0])
          const lngs = coords.map(c => c[1])
          const minLat = Math.min(...lats), maxLat = Math.max(...lats)
          const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
          const dLat = (maxLat - minLat) || 0.001
          const dLng = (maxLng - minLng) || 0.001
          const pad  = 0.25
          const bMinLat = minLat - dLat * pad, bMaxLat = maxLat + dLat * pad
          const bMinLng = minLng - dLng * pad, bMaxLng = maxLng + dLng * pad
          const margin = 44
          const toX = (lng) => margin + ((lng - bMinLng) / (bMaxLng - bMinLng)) * (W - margin * 2)
          const toY = (lat) => (ROUTE_H - margin) - ((lat - bMinLat) / (bMaxLat - bMinLat)) * (ROUTE_H - margin * 2)

          // Glow halo
          ctx.beginPath()
          ctx.strokeStyle = 'rgba(0,230,118,0.25)'
          ctx.lineWidth = 14
          ctx.lineCap = 'round'; ctx.lineJoin = 'round'
          coords.forEach(([lat, lng], i) => i === 0 ? ctx.moveTo(toX(lng), toY(lat)) : ctx.lineTo(toX(lng), toY(lat)))
          ctx.stroke()

          // White route
          ctx.beginPath()
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 4
          coords.forEach(([lat, lng], i) => i === 0 ? ctx.moveTo(toX(lng), toY(lat)) : ctx.lineTo(toX(lng), toY(lat)))
          ctx.stroke()

          // Start dot
          const [sLat, sLng] = coords[0]
          ctx.beginPath()
          ctx.arc(toX(sLng), toY(sLat), 7, 0, Math.PI * 2)
          ctx.fillStyle = '#ffffff'
          ctx.fill()

          // End dot green
          const [eLat, eLng] = coords[coords.length - 1]
          ctx.shadowColor = '#00e676'; ctx.shadowBlur = 18
          ctx.beginPath()
          ctx.arc(toX(eLng), toY(eLat), 10, 0, Math.PI * 2)
          ctx.fillStyle = '#00e676'
          ctx.fill()
          ctx.shadowBlur = 0
        }
        drawStats()
      }

      drawRoute()
    })
  }, [])

  const finishWorkout = useCallback(async (stats) => {
    navigator.geolocation.clearWatch(watchId.current)
    const snapshot = await captureRoute()
    const workout = {
      date: Date.now(), blocks, targetKm,
      distKm: stats.km, durationSec: totalSecRef.current, calories: stats.cal,
      avgPace: stats.pace,
      route: snapshot,
      coords: coordsRef.current.slice(0, 500), // store max 500 pts
    }
    saveWorkout(workout)
    setSavedWorkout(workout)
    setRouteSnapshot(snapshot)
    setDone(true)
  }, [blocks, targetKm, captureRoute])

  const stop = useCallback(async () => {
    clearInterval(intervalRef.current)
    navigator.geolocation.clearWatch(watchId.current)
    const stats = computeStats(totalSecRef.current, idxRef.current, distKmRef.current)
    const snapshot = await captureRoute()
    const workout = {
      date: Date.now(), blocks, targetKm,
      distKm: stats.km, durationSec: totalSecRef.current, calories: stats.cal,
      avgPace: stats.pace,
      route: snapshot,
      coords: coordsRef.current.slice(0, 500),
    }
    saveWorkout(workout)
    nav('/')
  }, [blocks, targetKm, computeStats, captureRoute, nav])

  const togglePause = () => {
    pausedRef.current = !pausedRef.current
    setPaused(p => !p)
  }

  const sharePhoto = () => {
    if (!routeSnapshot) return
    const link = document.createElement('a')
    link.download = `corrida-${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.png`
    link.href = routeSnapshot
    link.click()
  }

  const cur = sequence.current[idx]
  const distPct = freeMode ? Math.min(100, (distKm / 10) * 100) : Math.min(100, (distKm / targetKm) * 100)
  const blockPct = cur ? Math.round(((cur.dur - secLeft) / cur.dur) * 100) : 100
  const isRun = cur?.type === 'run'
  const accentColor = isRun ? 'var(--green)' : 'var(--blue)'

  if (!cur && !done) return null

  if (done && savedWorkout) {
    return (
      <DoneScreen
        workout={savedWorkout}
        routeSnapshot={routeSnapshot}
        onShare={sharePhoto}
        onHome={() => nav('/')}
        onHistory={() => nav('/history')}
      />
    )
  }

  return (
    <div style={{ ...styles.root, background: isRun ? '#050f09' : '#050a10' }}>

      {/* Top bar */}
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={stop}>✕</button>
        <div style={styles.repBadge}>
          <span style={styles.repText}>volta {cur.rep}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: gpsStatus === 'ok' ? '#00e676' : gpsStatus === 'error' ? '#ff5252' : '#ffab40',
            boxShadow: gpsStatus === 'ok' ? '0 0 6px #00e676' : 'none',
          }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)' }}>
            {gpsStatus === 'ok' ? 'GPS' : gpsStatus === 'error' ? 'sem GPS' : 'aguardando'}
          </span>
        </div>
      </div>

      {/* ── DISTANCE PROGRESS BAR (redesigned) ── */}
      <div style={styles.distBarWrap}>
        <div style={styles.distBarTrack}>
          {/* Segmented background */}
          <div style={styles.distBarBg} />
          {/* Fill */}
          <div style={{
            ...styles.distBarFill,
            width: distPct + '%',
            background: `linear-gradient(90deg, ${accentColor}99, ${accentColor})`,
            boxShadow: `0 0 10px ${accentColor}66`,
          }} />
          {/* Milestones */}
          {[0.25, 0.5, 0.75].map(pct => (
            <div key={pct} style={{
              position: 'absolute', left: (pct * 100) + '%', top: 0, bottom: 0,
              width: '1px', background: 'rgba(255,255,255,0.1)',
              transform: 'translateX(-50%)',
            }} />
          ))}
          {/* Runner dot */}
          <div style={{
            position: 'absolute', left: `calc(${distPct}% - 6px)`, top: '50%',
            width: '12px', height: '12px', borderRadius: '50%',
            background: accentColor, transform: 'translateY(-50%)',
            boxShadow: `0 0 8px ${accentColor}`,
            transition: 'left 1s linear',
          }} />
        </div>
        <div style={styles.distBarLabels}>
          <span style={{ color: accentColor, fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500 }}>
            {fmtDist(distKm)} km
          </span>
          <span style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            {freeMode ? 'livre' : fmtDist(targetKm) + ' km'}
          </span>
        </div>
      </div>

      {/* ── LIVE MAP ── */}
      <div style={styles.mapWrap}>
        <div ref={mapRef} style={styles.map} />
        {!mapReady && (
          <div style={styles.mapLoading}>
            <span style={{ color: 'var(--text3)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
              carregando mapa…
            </span>
          </div>
        )}
        {gpsStatus === 'waiting' && mapReady && (
          <div style={styles.mapOverlayMsg}>
            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Aguardando GPS…</span>
          </div>
        )}
      </div>

      {/* Current block */}
      <div style={{ ...styles.currentBlock, background: blockDimBg(cur.type) }}>
        <div style={{ ...styles.blockTypeBadge, background: blockMidBg(cur.type), color: accentColor }}>
          {cur.type === 'run' ? '🏃 ' : '🚶 '}{blockLabel(cur.type)}
        </div>
        <div style={{ ...styles.bigTimer, color: accentColor }}>
          {fmtTime(secLeft)}
        </div>
        {/* Block progress bar */}
        <div style={styles.blockProgRow}>
          <div style={styles.blockProgBar}>
            <div style={{
              ...styles.blockProgFill,
              width: blockPct + '%',
              background: accentColor,
            }} />
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{blockPct}%</span>
        </div>
      </div>

      {/* Next block */}
      {idx + 1 < totalBlocks && (
        <div style={styles.nextBox}>
          <span style={styles.nextLabel}>a seguir</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: blockColor(sequence.current[idx + 1].type) }} />
            <span style={styles.nextName}>{blockLabel(sequence.current[idx + 1].type)}</span>
            <span style={styles.nextDur}>{fmtTime(sequence.current[idx + 1].dur)}</span>
          </div>
        </div>
      )}

      {/* Live metrics */}
      <div style={styles.metricsRow}>
        <Metric label="tempo"    value={fmtTime(totalSec)} />
        <Metric label="distância" value={fmtDist(distKm) + ' km'} accent={accentColor} />
        <Metric label="pace"     value={pace ? fmtPace(pace) : '--:--'} unit="/km" />
        <Metric label="calorias" value={String(calories)} />
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <button style={styles.pauseBtn} onClick={togglePause}>
          {paused
            ? <><span style={{ fontSize: '20px' }}>▶</span> Retomar</>
            : <><span style={{ fontSize: '20px' }}>⏸</span> Pausar</>}
        </button>
        <button style={styles.stopBtn} onClick={stop}>
          ⏹ Encerrar
        </button>
      </div>

      {paused && (
        <div style={styles.pauseOverlay}>
          <span style={styles.pauseText}>PAUSADO</span>
        </div>
      )}
    </div>
  )
}

// ── Done Screen ──
function DoneScreen({ workout, routeSnapshot, onShare, onHome, onHistory }) {
  const pace = workout.avgPace
  return (
    <div style={styles.doneRoot}>
      <div style={styles.doneGlow} />

      <div style={styles.doneIcon}>✓</div>
      <h1 style={styles.doneTitle}>Treino concluído!</h1>
      <p style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)', fontSize: '11px', marginTop: '-8px' }}>
        {new Date(workout.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {/* Stats */}
      <div style={styles.doneStats}>
        <DoneStat label="distância" value={fmtDist(workout.distKm) + ' km'} />
        <DoneStat label="tempo"     value={fmtTime(workout.durationSec)} />
        <DoneStat label="pace médio" value={pace ? fmtPace(pace) : '--:--'} unit="/km" />
        <DoneStat label="calorias"  value={workout.calories + ' kcal'} />
      </div>

      {/* Route snapshot */}
      {routeSnapshot ? (
        <div style={styles.routeCard}>
          <div style={styles.routeHeader}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', letterSpacing: '1px' }}>
              PERCURSO
            </span>
            <button style={styles.shareBtn} onClick={onShare}>
              ⬇ salvar foto
            </button>
          </div>
          <img src={routeSnapshot} alt="percurso" style={styles.routeImg} />
        </div>
      ) : (
        <div style={{ ...styles.routeCard, alignItems: 'center', justifyContent: 'center', height: '120px' }}>
          <span style={{ color: 'var(--text3)', fontSize: '12px' }}>Percurso não disponível (sem GPS)</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
        <button style={styles.historyBtn} onClick={onHistory}>Ver histórico</button>
        <button style={styles.doneBtn} onClick={onHome}>Início</button>
      </div>
    </div>
  )
}

function Metric({ label, value, accent, unit }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', color: accent || 'var(--text)', fontWeight: 500 }}>
        {value}{unit && <span style={{ fontSize: '10px', color: 'var(--text3)', marginLeft: '1px' }}>{unit}</span>}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

function DoneStat({ label, value, unit }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: 'var(--green)', fontWeight: 500 }}>
        {value}{unit && <span style={{ fontSize: '10px', color: 'var(--text3)', marginLeft: '1px' }}>{unit}</span>}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text2)', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

// ── helpers ──
function fmtPace(minPerKm) {
  const m = Math.floor(minPerKm)
  const s = Math.round((minPerKm - m) * 60)
  return `${m}:${String(s).padStart(2,'0')}`
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

const styles = {
  root: { minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '0 0 16px', transition: 'background 0.8s ease', position: 'relative', overflow: 'hidden' },
  topBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '52px 20px 12px',
  },
  backBtn: { background: 'none', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', fontSize: '16px', padding: '6px 12px' },
  repBadge: { background: 'var(--bg3)', borderRadius: '20px', padding: '4px 12px' },
  repText: { fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text2)' },

  // ── NEW distance bar ──
  distBarWrap: { padding: '0 20px', marginBottom: '12px' },
  distBarTrack: {
    position: 'relative', height: '8px',
    background: 'rgba(255,255,255,0.06)', borderRadius: '99px',
    overflow: 'visible', marginBottom: '6px',
  },
  distBarBg: {
    position: 'absolute', inset: 0, borderRadius: '99px',
    background: 'rgba(255,255,255,0.04)',
  },
  distBarFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    borderRadius: '99px', transition: 'width 1s linear',
    minWidth: '4px',
  },
  distBarLabels: { display: 'flex', justifyContent: 'space-between', marginTop: '8px' },

  // ── Map ──
  mapWrap: {
    margin: '0 16px', borderRadius: '14px', overflow: 'hidden',
    height: '160px', position: 'relative',
    border: '1px solid rgba(255,255,255,0.06)',
    background: '#111', flexShrink: 0,
  },
  map: { width: '100%', height: '100%' },
  mapLoading: {
    position: 'absolute', inset: 0, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  mapOverlayMsg: {
    position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.7)', borderRadius: '8px', padding: '4px 10px',
  },

  currentBlock: {
    margin: '12px 16px 0', borderRadius: '16px', padding: '20px 24px 16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    transition: 'background 0.8s',
  },
  blockTypeBadge: {
    borderRadius: '20px', padding: '5px 14px',
    fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600,
  },
  bigTimer: {
    fontFamily: 'var(--font-mono)', fontSize: '60px', fontWeight: 500,
    letterSpacing: '-2px', lineHeight: 1, transition: 'color 0.8s',
  },
  blockProgRow: { width: '100%', display: 'flex', alignItems: 'center', gap: '8px' },
  blockProgBar: { flex: 1, height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' },
  blockProgFill: { height: '100%', borderRadius: '99px', transition: 'width 1s linear' },

  nextBox: {
    margin: '10px 20px 0',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '8px 14px',
  },
  nextLabel: { fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase' },
  nextName: { fontSize: '13px', color: 'var(--text)' },
  nextDur: { fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text2)' },

  metricsRow: {
    display: 'flex', justifyContent: 'space-around',
    margin: '10px 16px 0',
    background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '12px 8px',
  },
  controls: { display: 'flex', gap: '10px', margin: '12px 16px 0' },
  pauseBtn: {
    flex: 1, padding: '13px', borderRadius: '12px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border2)',
    color: 'var(--text)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  },
  stopBtn: {
    flex: 1, padding: '13px', borderRadius: '12px',
    background: 'rgba(255,82,82,0.15)', border: '1px solid rgba(255,82,82,0.25)',
    color: 'var(--red)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  },
  pauseOverlay: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    animation: 'fadeIn 0.2s ease', zIndex: 10,
  },
  pauseText: {
    fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: 800,
    color: 'rgba(255,255,255,0.15)', letterSpacing: '4px',
  },

  // Done screen
  doneRoot: {
    minHeight: '100dvh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '56px 20px 32px', gap: '16px',
    position: 'relative', overflow: 'hidden',
  },
  doneGlow: {
    position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse at 50% 20%, rgba(0,230,118,0.1) 0%, transparent 60%)',
  },
  doneIcon: {
    width: '64px', height: '64px', borderRadius: '50%',
    background: 'var(--green-dim)', border: '1px solid var(--green)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--green)', fontSize: '28px', position: 'relative',
  },
  doneTitle: { fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800, color: 'var(--text)' },
  doneStats: {
    display: 'flex', gap: '4px', width: '100%',
    background: 'var(--bg2)', borderRadius: '14px', padding: '16px 8px',
    border: '1px solid var(--border)',
  },
  routeCard: {
    width: '100%', background: 'var(--bg2)', borderRadius: '14px',
    border: '1px solid var(--border)', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
  routeHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px',
  },
  shareBtn: {
    background: 'var(--green-dim)', color: 'var(--green)',
    border: '1px solid rgba(0,230,118,0.2)', borderRadius: '8px',
    fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '5px 10px',
  },
  routeImg: { width: '100%', display: 'block', borderTop: '1px solid var(--border)' },
  doneBtn: {
    flex: 1, padding: '14px', background: 'var(--green)', color: '#000',
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px',
    border: 'none', borderRadius: '12px',
  },
  historyBtn: {
    flex: 1, padding: '14px', background: 'var(--bg2)', color: 'var(--text)',
    fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px',
    border: '1px solid var(--border)', borderRadius: '12px',
  },
}
