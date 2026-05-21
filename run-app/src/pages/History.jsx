import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { getHistory, fmtTime, fmtDist, blockColor } from '../utils/workout.js'

function fmtPace(minPerKm) {
  if (!minPerKm) return '--:--'
  const m = Math.floor(minPerKm)
  const s = Math.round((minPerKm - m) * 60)
  return `${m}:${String(s).padStart(2,'0')}`
}

export default function History() {
  const nav = useNavigate()
  const history = useMemo(() => getHistory(), [])

  const totalDist = history.reduce((s, w) => s + (w.distKm || 0), 0)
  const totalTime = history.reduce((s, w) => s + (w.durationSec || 0), 0)
  const bestPace  = history.reduce((best, w) => {
    if (!w.avgPace) return best
    return (!best || w.avgPace < best) ? w.avgPace : best
  }, null)

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div>
          <p style={styles.sup}>Seus registros</p>
          <h1 style={styles.title}>Histórico</h1>
        </div>
        <div style={styles.totals}>
          <div style={styles.totalItem}>
            <span style={styles.totalVal}>{fmtDist(totalDist)}</span>
            <span style={styles.totalLabel}>km total</span>
          </div>
          <div style={styles.totalItem}>
            <span style={styles.totalVal}>{history.length}</span>
            <span style={styles.totalLabel}>treinos</span>
          </div>
          {bestPace && (
            <div style={styles.totalItem}>
              <span style={{ ...styles.totalVal, color: 'var(--blue)' }}>{fmtPace(bestPace)}</span>
              <span style={styles.totalLabel}>melhor pace</span>
            </div>
          )}
        </div>
      </div>

      <div style={styles.scroll}>
        {history.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>◌</div>
            <p>Nenhum treino ainda.<br />Complete seu primeiro!</p>
            <button style={styles.emptyBtn} onClick={() => nav('/plan')}>Começar agora</button>
          </div>
        ) : (
          history.map((w, i) => <WorkoutCard key={w.id} w={w} index={i} />)
        )}
        <div style={{ height: '100px' }} />
      </div>

      <BottomNav />
    </div>
  )
}

function WorkoutCard({ w, index }) {
  const date = new Date(w.date)
  const dateStr = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ ...styles.card, animationDelay: `${index * 0.05}s` }}>
      <div style={styles.cardTop}>
        <div>
          <div style={styles.cardDate}>{dateStr}</div>
          <div style={styles.cardTime}>{timeStr}</div>
        </div>
        <div style={styles.distBadge}>{fmtDist(w.distKm || 0)} km</div>
      </div>

      <div style={styles.cardMeta}>
        <MetaItem icon="⏱" value={fmtTime(w.durationSec || 0)} label="tempo" />
        <MetaItem icon="⚡" value={fmtPace(w.avgPace)} label="pace/km" accent="var(--blue)" />
        <MetaItem icon="🔥" value={(w.calories || 0) + ' kcal'} label="calorias" />
        <MetaItem icon="🎯" value={(w.targetKm || 0) + ' km'} label="meta" />
      </div>

      {/* Route thumbnail if available */}
      {w.route && (
        <img src={w.route} alt="percurso" style={styles.routeThumb} />
      )}

      {w.blocks && (
        <div style={styles.intervalBar}>
          {w.blocks.map((b, i) => (
            <div key={i} style={{
              flex: b.dur, height: '4px', borderRadius: '99px',
              background: blockColor(b.type),
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

function MetaItem({ icon, value, label, accent }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '13px', marginBottom: '1px' }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: accent || 'var(--text)', fontWeight: 500 }}>{value}</div>
      <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{label}</div>
    </div>
  )
}

const styles = {
  root: { minHeight: '100dvh', background: 'var(--bg)' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    padding: '60px 20px 20px',
    background: 'linear-gradient(to bottom, var(--bg2), var(--bg))',
  },
  sup: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', letterSpacing: '1px', marginBottom: '4px' },
  title: { fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px' },
  totals: { display: 'flex', gap: '12px', alignItems: 'flex-end' },
  totalItem: { textAlign: 'right' },
  totalVal: { display: 'block', fontFamily: 'var(--font-mono)', fontSize: '16px', color: 'var(--green)', fontWeight: 500 },
  totalLabel: { fontSize: '10px', color: 'var(--text3)' },
  scroll: { padding: '0 16px', animation: 'fadeUp 0.4s ease both' },
  card: {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '16px',
    marginBottom: '10px', animation: 'fadeUp 0.3s ease both',
  },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' },
  cardDate: { fontSize: '14px', fontWeight: 500, color: 'var(--text)', textTransform: 'capitalize' },
  cardTime: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)', marginTop: '2px' },
  distBadge: {
    background: 'var(--green-dim)', color: 'var(--green)',
    fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500,
    padding: '4px 12px', borderRadius: '20px',
  },
  cardMeta: { display: 'flex', justifyContent: 'space-around', marginBottom: '12px' },
  routeThumb: {
    width: '100%', borderRadius: '8px', marginBottom: '10px',
    border: '1px solid var(--border)', display: 'block',
  },
  intervalBar: { display: 'flex', gap: '3px', height: '4px' },
  empty: {
    textAlign: 'center', padding: '60px 0', color: 'var(--text2)',
    fontSize: '14px', lineHeight: 1.8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
  },
  emptyIcon: { fontSize: '48px', color: 'var(--text3)' },
  emptyBtn: {
    background: 'var(--green)', color: '#000',
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px',
    border: 'none', borderRadius: '12px', padding: '12px 24px',
  },
}
