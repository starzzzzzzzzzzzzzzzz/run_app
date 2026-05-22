import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { getHistory, fmtTime, fmtDist, deleteWorkout, clearHistory } from '../utils/workout.js'

const fp = (v) => {
  if (!v) return "--'--"
  const m = Math.floor(v), sec = String(Math.round((v - m) * 60)).padStart(2, '0')
  return `${m}'${sec}"`
}

// ── Save photo modal ─────────────────────────────────────────────────────────
function SavePhotoModal({ workout, onClose }) {
  const [mapStyle, setMapStyle] = useState('clean') // 'clean' | 'satellite'
  const [format, setFormat]     = useState('png')   // 'png' | 'jpg' | 'webp'
  const [loading, setLoading]   = useState(false)

  const buildCard = useCallback(async (useSatellite) => {
    const coords = workout.coords || []
    const W = 540, H = 960
    const ROUTE_H = 340, MID_H = 460, BOT_H = 160
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')

    // ── Route section background ──────────────────────────────────────────
    if (useSatellite && coords.length >= 2) {
      // Draw satellite tile from OpenStreetMap aerial tiles (CORS-friendly)
      try {
        const lats = coords.map(c => c[0]), lngs = coords.map(c => c[1])
        const minLat = Math.min(...lats), maxLat = Math.max(...lats)
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
        const centerLat = (minLat + maxLat) / 2
        const centerLng = (minLng + maxLng) / 2

        // Compute tile zoom
        const latRange = (maxLat - minLat) || 0.005
        const zoom = Math.min(17, Math.max(13, Math.floor(Math.log2(360 / latRange)) - 1))

        const tileX = (lng) => Math.floor((lng + 180) / 360 * Math.pow(2, zoom))
        const tileY = (lat) => {
          const r = Math.PI / 180
          return Math.floor((1 - Math.log(Math.tan(lat * r) + 1 / Math.cos(lat * r)) / Math.PI) / 2 * Math.pow(2, zoom))
        }

        const tx = tileX(centerLng), ty = tileY(centerLat)
        const tileSize = 256
        const tilesX = 3, tilesY = 2
        const offX = Math.floor(tilesX / 2), offY = Math.floor(tilesY / 2)
        const canvasTileW = W / tilesX, canvasTileH = ROUTE_H / tilesY

        // Load tiles
        const tilePromises = []
        for (let dy = -offY; dy <= offY; dy++) {
          for (let dx = -offX; dx <= offX; dx++) {
            const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty + dy}/${tx + dx}`
            tilePromises.push(new Promise(res => {
              const img = new Image(); img.crossOrigin = 'anonymous'
              img.onload = () => res({ img, dx: dx + offX, dy: dy + offY })
              img.onerror = () => res(null)
              img.src = url
            }))
          }
        }

        const tiles = await Promise.all(tilePromises)
        ctx.fillStyle = '#101510'
        ctx.fillRect(0, 0, W, ROUTE_H)
        tiles.forEach(t => {
          if (!t) return
          ctx.drawImage(t.img, t.dx * canvasTileW, t.dy * canvasTileH, canvasTileW + 1, canvasTileH + 1)
        })

        // Dark overlay for contrast
        ctx.fillStyle = 'rgba(0,0,0,0.28)'
        ctx.fillRect(0, 0, W, ROUTE_H)
      } catch {
        ctx.fillStyle = '#0d0f0a'
        ctx.fillRect(0, 0, W, ROUTE_H)
      }
    } else {
      ctx.fillStyle = '#0d0f0a'
      ctx.fillRect(0, 0, W, ROUTE_H)
      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1
      for (let i = 1; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(W * i / 4, 0); ctx.lineTo(W * i / 4, ROUTE_H); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, ROUTE_H * i / 4); ctx.lineTo(W, ROUTE_H * i / 4); ctx.stroke()
      }
    }

    // ── Draw route on top ─────────────────────────────────────────────────
    if (coords.length >= 2) {
      const lats = coords.map(c => c[0]), lngs = coords.map(c => c[1])
      const minLat = Math.min(...lats), maxLat = Math.max(...lats)
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
      const dLa = (maxLat - minLat) || 0.001, dLo = (maxLng - minLng) || 0.001
      const pad = 0.28
      const bMinLa = minLat - dLa * pad, bMaxLa = maxLat + dLa * pad
      const bMinLo = minLng - dLo * pad, bMaxLo = maxLng + dLo * pad
      const mg = 52
      const tX = lo => mg + ((lo - bMinLo) / (bMaxLo - bMinLo)) * (W - mg * 2)
      const tY = la => (ROUTE_H - mg) - ((la - bMinLa) / (bMaxLa - bMinLa)) * (ROUTE_H - mg * 2)

      // Glow
      ctx.shadowColor = '#C8F04A'; ctx.shadowBlur = useSatellite ? 28 : 22
      ctx.beginPath(); ctx.strokeStyle = 'rgba(200,240,74,0.25)'; ctx.lineWidth = useSatellite ? 22 : 18
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      coords.forEach(([la, lo], i) => i === 0 ? ctx.moveTo(tX(lo), tY(la)) : ctx.lineTo(tX(lo), tY(la)))
      ctx.stroke(); ctx.shadowBlur = 0

      // Main route line
      ctx.beginPath()
      ctx.strokeStyle = useSatellite ? '#C8F04A' : '#ffffff'
      ctx.lineWidth = useSatellite ? 5 : 3.5
      coords.forEach(([la, lo], i) => i === 0 ? ctx.moveTo(tX(lo), tY(la)) : ctx.lineTo(tX(lo), tY(la)))
      ctx.stroke()

      // Start dot
      const [sLa, sLo] = coords[0]
      ctx.beginPath(); ctx.arc(tX(sLo), tY(sLa), 6, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'; ctx.fill()

      // End dot
      const [eLa, eLo] = coords[coords.length - 1]
      ctx.shadowColor = '#C8F04A'; ctx.shadowBlur = 16
      ctx.beginPath(); ctx.arc(tX(eLo), tY(eLa), 9, 0, Math.PI * 2)
      ctx.fillStyle = '#C8F04A'; ctx.fill(); ctx.shadowBlur = 0
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Sem dados de rota GPS', W / 2, ROUTE_H / 2)
    }

    // ── Stats section ─────────────────────────────────────────────────────
    ctx.fillStyle = '#0C0C0E'; ctx.fillRect(0, ROUTE_H, W, MID_H)
    const grad = ctx.createLinearGradient(0, 0, W, 0)
    grad.addColorStop(0, '#C8F04A'); grad.addColorStop(1, '#7fd83a')
    ctx.fillStyle = grad; ctx.fillRect(0, ROUTE_H, W, 3)

    ctx.textAlign = 'center'; ctx.font = '600 13px Arial'
    ctx.fillStyle = 'rgba(200,240,74,0.55)'
    ctx.fillText('PACEUP', W / 2, ROUTE_H + 38)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(40, ROUTE_H + 50, W - 80, 1)

    const statsData = [
      { val: (workout.distKm || 0).toFixed(2), unit: 'km',     label: 'Distância', y: ROUTE_H + 155 },
      { val: fmtTime(workout.durationSec || 0), unit: '',       label: 'Duração',   y: ROUTE_H + 275 },
      { val: fp(workout.avgPace),               unit: 'min/km', label: 'Pace médio',y: ROUTE_H + 395 },
    ]

    statsData.forEach(({ val, unit, label, y }) => {
      ctx.textAlign = 'left'; ctx.font = 'bold 76px Arial'; ctx.fillStyle = '#EFEFEF'
      const vw = ctx.measureText(val).width
      const startX = unit ? W / 2 - vw / 2 - 14 : W / 2 - vw / 2
      ctx.fillText(val, startX, y)
      if (unit) { ctx.font = 'bold 18px Arial'; ctx.fillStyle = 'rgba(239,239,239,0.4)'; ctx.fillText(unit, startX + vw + 8, y - 40) }
      ctx.textAlign = 'center'; ctx.font = '14px Arial'; ctx.fillStyle = 'rgba(239,239,239,0.3)'
      ctx.fillText(label, W / 2, y + 28)
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(40, y + 46, W - 80, 1)
    })

    // ── Branding ──────────────────────────────────────────────────────────
    ctx.fillStyle = '#0C0C0E'; ctx.fillRect(0, ROUTE_H + MID_H, W, BOT_H)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, ROUTE_H + MID_H, W, 1)
    ctx.textAlign = 'center'; ctx.font = 'bold 32px Arial'; ctx.fillStyle = '#EFEFEF'
    ctx.fillText('PaceUp', W / 2, ROUTE_H + MID_H + 62)
    ctx.font = '13px Arial'; ctx.fillStyle = 'rgba(239,239,239,0.25)'
    ctx.fillText('seu ritmo. sua corrida.', W / 2, ROUTE_H + MID_H + 86)
    const ds = new Date(workout.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    ctx.font = '12px Arial'; ctx.fillStyle = 'rgba(200,240,74,0.7)'
    ctx.fillText(ds, W / 2, ROUTE_H + MID_H + 116)

    return canvas
  }, [workout])

  const handleSave = async () => {
    setLoading(true)
    try {
      const canvas = await buildCard(mapStyle === 'satellite')
      const mimeMap = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }
      const qualityMap = { png: 1, jpg: 0.92, webp: 0.92 }
      const mime = mimeMap[format]
      const quality = qualityMap[format]
      const dataUrl = canvas.toDataURL(mime, quality)
      const dateStr = new Date(workout.date).toLocaleDateString('pt-BR').replace(/\//g, '-')
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `paceup-${dateStr}.${format}`
      a.click()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={m.sheet} onClick={e => e.stopPropagation()}>
        <div style={m.handle} />
        <h2 style={m.title}>Salvar foto do treino</h2>

        {/* Map style */}
        <p style={m.label}>Estilo do mapa</p>
        <div style={m.optRow}>
          <button
            style={{ ...m.optBtn, ...(mapStyle === 'clean' ? m.optBtnActive : {}) }}
            onClick={() => setMapStyle('clean')}
          >
            <span style={m.optIcon}>◉</span>
            <div>
              <div style={m.optName}>Rota limpa</div>
              <div style={m.optSub}>Fundo escuro, traço verde</div>
            </div>
          </button>
          <button
            style={{ ...m.optBtn, ...(mapStyle === 'satellite' ? m.optBtnActive : {}) }}
            onClick={() => setMapStyle('satellite')}
          >
            <span style={m.optIcon}>🛰</span>
            <div>
              <div style={m.optName}>Satélite</div>
              <div style={m.optSub}>Imagem aérea com rota</div>
            </div>
          </button>
        </div>

        {/* Format */}
        <p style={m.label}>Formato</p>
        <div style={m.fmtRow}>
          {['png', 'jpg', 'webp'].map(f => (
            <button
              key={f}
              style={{ ...m.fmtBtn, ...(format === f ? m.fmtBtnActive : {}) }}
              onClick={() => setFormat(f)}
            >
              <div style={m.fmtName}>{f.toUpperCase()}</div>
              <div style={m.fmtSub}>
                {f === 'png' ? 'Sem perda' : f === 'jpg' ? 'Menor arquivo' : 'Melhor web'}
              </div>
            </button>
          ))}
        </div>

        <button style={{ ...m.saveBtn, opacity: loading ? 0.7 : 1 }} onClick={handleSave} disabled={loading}>
          {loading
            ? <span style={m.spinner} />
            : <>↓ Baixar .{format}</>}
        </button>
        <button style={m.cancelBtn} onClick={onClose}>Cancelar</button>
      </div>
    </div>
  )
}

// ── Main History page ────────────────────────────────────────────────────────
export default function History() {
  const nav = useNavigate()
  const [history, setHistory] = useState(() => getHistory())
  const [expanded, setExpanded] = useState(null)
  const [saveTarget, setSaveTarget] = useState(null)   // workout to save as photo
  const [confirmClear, setConfirmClear] = useState(false)

  const totalDist = history.reduce((s, w) => s + (w.distKm || 0), 0)
  const totalTime = history.reduce((s, w) => s + (w.durationSec || 0), 0)
  const bestPace  = history.reduce((b, w) => (!w.avgPace ? b : (!b || w.avgPace < b) ? w.avgPace : b), null)

  const handleDelete = (id) => {
    deleteWorkout(id)
    setHistory(getHistory())
    setExpanded(null)
  }

  const handleClearAll = () => {
    clearHistory()
    setHistory([])
    setConfirmClear(false)
  }

  return (
    <div style={s.root}>
      {saveTarget && (
        <SavePhotoModal workout={saveTarget} onClose={() => setSaveTarget(null)} />
      )}

      {confirmClear && (
        <div style={m.overlay} onClick={() => setConfirmClear(false)}>
          <div style={{ ...m.sheet, padding: '28px 20px' }} onClick={e => e.stopPropagation()}>
            <div style={m.handle} />
            <h2 style={{ ...m.title, color: 'var(--red)' }}>Limpar histórico?</h2>
            <p style={{ color: 'var(--text2)', fontSize: '14px', textAlign: 'center', marginBottom: '20px', lineHeight: 1.6 }}>
              Todos os {history.length} treinos serão excluídos permanentemente.
            </p>
            <button style={{ ...m.saveBtn, background: 'var(--red)', marginBottom: '10px' }} onClick={handleClearAll}>
              Sim, excluir tudo
            </button>
            <button style={m.cancelBtn} onClick={() => setConfirmClear(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={s.header}>
        <div>
          <p style={s.sup}>Seus registros</p>
          <h1 style={s.title}>Histórico</h1>
        </div>
        {history.length > 0 && (
          <button style={s.clearBtn} onClick={() => setConfirmClear(true)}>
            Limpar tudo
          </button>
        )}
      </div>

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
            key={w.id || i} w={w} index={i}
            open={expanded === i}
            onToggle={() => setExpanded(expanded === i ? null : i)}
            onDelete={() => handleDelete(w.id)}
            onSavePhoto={() => setSaveTarget(w)}
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
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 500, color: color || 'var(--text)', marginBottom: '2px' }}>{value}</div>
      <div style={{ fontSize: '10px', color: 'var(--text3)', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  )
}

function WorkoutCard({ w, index, open, onToggle, onDelete, onSavePhoto }) {
  const date = new Date(w.date)
  const dateStr = date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const [confirmDel, setConfirmDel] = useState(false)

  return (
    <div style={{ ...s.card, animationDelay: `${Math.min(index * 0.04, 0.3)}s` }}>
      <div style={s.cardRow} onClick={onToggle}>
        <div style={s.cardLeft}>
          <div style={s.dateBadge}>
            <span style={s.dateDay}>{date.getDate()}</span>
            <span style={s.dateMon}>{date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
          </div>
          <div>
            <div style={s.cardDate}>{dateStr} • {timeStr}</div>
            <div style={s.cardDist}>{fmtDist(w.distKm || 0)} <span style={s.cardDistUnit}>km</span></div>
          </div>
        </div>
        <div style={s.chevron}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <path d="M6 9l6 6 6-6" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <div style={s.quickStats}>
        <QuickStat label="tempo"  value={fmtTime(w.durationSec || 0)} />
        <QuickStat label="pace"   value={fp(w.avgPace)} color="var(--blue)" />
        <QuickStat label="kcal"   value={w.calories || 0} />
      </div>

      {open && (
        <div style={s.expandedRoute}>
          {/* Route preview if available */}
          {w.route && (
            <img src={w.route} alt="percurso" style={s.routeImg} />
          )}

          {/* Save photo button */}
          <button style={s.savePhotoBtn} onClick={onSavePhoto}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 12l4 4 4-4M12 3v13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Salvar foto do treino
          </button>

          {/* Delete */}
          {!confirmDel ? (
            <button style={s.deleteBtn} onClick={() => setConfirmDel(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Excluir treino
            </button>
          ) : (
            <div style={s.confirmRow}>
              <span style={{ fontSize: '13px', color: 'var(--text2)' }}>Tem certeza?</span>
              <button style={s.confirmYes} onClick={onDelete}>Excluir</button>
              <button style={s.confirmNo} onClick={() => setConfirmDel(false)}>Cancelar</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function QuickStat({ label, value, color }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: color || 'var(--text)', fontWeight: 500 }}>{value}</div>
      <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

const s = {
  root: { minHeight: '100dvh', background: 'var(--bg)' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    padding: '56px 20px 16px',
    background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)',
  },
  sup: { fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' },
  title: { fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' },
  clearBtn: {
    background: 'transparent', border: '1px solid rgba(255,82,82,0.3)',
    borderRadius: '8px', color: 'var(--red)', fontSize: '12px',
    fontFamily: 'var(--font-mono)', padding: '7px 12px',
  },
  strip: {
    display: 'flex', alignItems: 'center',
    margin: '0 16px 16px', padding: '14px 8px',
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
  },
  stripDiv: { width: '1px', height: '28px', background: 'var(--border)', flexShrink: 0 },
  scroll: { padding: '0 16px' },
  card: {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', marginBottom: '10px',
    overflow: 'hidden', animation: 'fadeUp 0.35s ease both',
  },
  cardRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer' },
  cardLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  dateBadge: {
    width: '40px', height: '44px', background: 'var(--bg3)', borderRadius: '10px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  dateDay: { fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 500, color: 'var(--text)', lineHeight: 1 },
  dateMon: { fontSize: '10px', color: 'var(--text3)', marginTop: '2px', letterSpacing: '0.5px' },
  cardDate: { fontSize: '12px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', textTransform: 'capitalize', marginBottom: '2px' },
  cardDist: { fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text)' },
  cardDistUnit: { fontSize: '14px', color: 'var(--text2)', fontWeight: 400 },
  chevron: { padding: '4px', cursor: 'pointer' },
  quickStats: { display: 'flex', borderTop: '1px solid var(--border)', padding: '10px 8px' },
  expandedRoute: {
    borderTop: '1px solid var(--border)',
    padding: '12px',
    display: 'flex', flexDirection: 'column', gap: '8px',
  },
  routeImg: { width: '100%', borderRadius: '10px', display: 'block' },
  savePhotoBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '11px', background: 'var(--green-dim)', color: 'var(--green)',
    border: '1px solid rgba(0,230,118,0.2)', borderRadius: '10px',
    fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500,
  },
  deleteBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
    padding: '10px', background: 'rgba(255,82,82,0.08)', color: 'var(--red)',
    border: '1px solid rgba(255,82,82,0.18)', borderRadius: '10px',
    fontFamily: 'var(--font-mono)', fontSize: '12px',
  },
  confirmRow: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '4px 0',
  },
  confirmYes: {
    padding: '8px 14px', background: 'var(--red)', color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 500,
  },
  confirmNo: {
    padding: '8px 14px', background: 'var(--bg3)', color: 'var(--text2)',
    border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', fontFamily: 'var(--font-mono)',
  },
  empty: {
    padding: '64px 0', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '12px', textAlign: 'center',
  },
  emptyRing: {
    width: '64px', height: '64px', borderRadius: '50%',
    border: '1px solid var(--border)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', marginBottom: '4px',
  },
  emptyText: { fontSize: '16px', fontWeight: 600, color: 'var(--text2)' },
  emptySub: { fontSize: '13px', color: 'var(--text3)', maxWidth: '240px', lineHeight: 1.6 },
  emptyBtn: {
    marginTop: '8px', padding: '12px 24px', borderRadius: '12px',
    background: 'var(--green)', color: '#000',
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
    border: 'none',
  },
}

const m = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(8px)', zIndex: 200,
    display: 'flex', alignItems: 'flex-end',
  },
  sheet: {
    width: '100%', background: 'var(--bg2)',
    borderRadius: '20px 20px 0 0', padding: '20px 20px 36px',
    display: 'flex', flexDirection: 'column', gap: '12px',
    animation: 'fadeUp 0.25s ease both',
  },
  handle: {
    width: '40px', height: '4px', borderRadius: '99px',
    background: 'var(--border2)', margin: '0 auto 8px',
  },
  title: {
    fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700,
    textAlign: 'center', color: 'var(--text)',
  },
  label: {
    fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)',
    letterSpacing: '1.5px', textTransform: 'uppercase',
  },
  optRow: { display: 'flex', gap: '10px' },
  optBtn: {
    flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: '12px', padding: '12px', textAlign: 'left',
    display: 'flex', alignItems: 'center', gap: '10px',
    transition: 'all 0.15s',
  },
  optBtnActive: { border: '1px solid var(--green)', background: 'var(--green-dim)' },
  optIcon: { fontSize: '22px', flexShrink: 0 },
  optName: { fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' },
  optSub: { fontSize: '11px', color: 'var(--text3)' },
  fmtRow: { display: 'flex', gap: '8px' },
  fmtBtn: {
    flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: '10px', padding: '10px 6px', textAlign: 'center',
    transition: 'all 0.15s',
  },
  fmtBtnActive: { border: '1px solid var(--green)', background: 'var(--green-dim)' },
  fmtName: { fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px' },
  fmtSub: { fontSize: '10px', color: 'var(--text3)' },
  saveBtn: {
    padding: '14px', background: 'var(--green)', color: '#000',
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px',
    border: 'none', borderRadius: '13px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  },
  cancelBtn: {
    padding: '12px', background: 'transparent', color: 'var(--text3)',
    border: 'none', fontFamily: 'var(--font-mono)', fontSize: '13px',
    textAlign: 'center',
  },
  spinner: {
    width: '18px', height: '18px',
    border: '2px solid rgba(0,0,0,0.3)', borderTop: '2px solid #000',
    borderRadius: '50%', display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },
}
