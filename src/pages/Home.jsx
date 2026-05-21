import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { getHistory, fmtTime, fmtDist, blockColor, blockLabel } from '../utils/workout.js'

export default function Home({ onLogout }) {
  const nav = useNavigate()
  const history = useMemo(() => getHistory(), [])

  const weekStats = useMemo(() => {
    const now = Date.now()
    const week = history.filter(w => now - w.date < 7 * 86400000)
    return {
      runs: week.length,
      dist: week.reduce((s, w) => s + (w.distKm || 0), 0),
      time: week.reduce((s, w) => s + (w.durationSec || 0), 0),
      cal:  week.reduce((s, w) => s + (w.calories || 0), 0),
    }
  }, [history])

  const last = history[0]

  return (
    <div style={styles.root}>
      <div style={styles.bgGlow} />

      {/* Header */}
      <div style={styles.header}>
        <div>
          <p style={styles.greeting}>Bom treino,</p>
          <h1 style={styles.name}>Kaue <span style={{ color: 'var(--green)' }}>↗</span></h1>
        </div>
        <button style={styles.logoutBtn} onClick={onLogout}>sair</button>
      </div>

      <div style={styles.scroll}>

        {/* Week stats */}
        <div style={styles.statsGrid}>
          <StatCard label="km esta semana" value={fmtDist(weekStats.dist)} accent="var(--green)" />
          <StatCard label="tempo ativo"     value={fmtTime(weekStats.time)} accent="var(--blue)" />
          <StatCard label="treinos"         value={weekStats.runs}          accent="var(--amber)" />
          <StatCard label="calorias"        value={weekStats.cal}           accent="var(--red)" />
        </div>

        {/* CTA */}
        <button style={styles.ctaBtn} onClick={() => nav('/plan')}>
          <span style={styles.ctaIcon}>▶</span>
          <div>
            <div style={styles.ctaTitle}>Novo treino</div>
            <div style={styles.ctaSub}>Monte seus intervalos</div>
          </div>
        </button>

        {/* Last workout */}
        {last && (
          <>
            <h2 style={styles.sectionTitle}>Último treino</h2>
            <div style={styles.lastCard}>
              <div style={styles.lastRow}>
                <span style={styles.lastDate}>{new Date(last.date).toLocaleDateString('pt-BR', { weekday:'short', day:'numeric', month:'short' })}</span>
                <span style={{ ...styles.lastBadge, background: 'var(--green-dim)', color: 'var(--green)' }}>{fmtDist(last.distKm || 0)} km</span>
              </div>
              <div style={styles.lastMeta}>
                <span>{fmtTime(last.durationSec || 0)}</span>
                <span>·</span>
                <span>{last.calories || 0} kcal</span>
              </div>
              {/* interval bar */}
              {last.blocks && (
                <div style={styles.intervalBar}>
                  {last.blocks.map((b, i) => (
                    <div key={i} style={{ flex: b.dur, height: '6px', borderRadius: '99px', background: blockColor(b.type) }} />
                  ))}
                </div>
              )}
              {last.blocks && (
                <div style={styles.intervalLegend}>
                  {[...new Set(last.blocks.map(b => b.type))].map(t => (
                    <span key={t} style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'11px', color:'var(--text2)' }}>
                      <span style={{ width:8, height:8, borderRadius:'2px', background: blockColor(t), display:'inline-block' }} />
                      {blockLabel(t)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {history.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>◌</div>
            <p>Nenhum treino ainda.<br/>Comece agora!</p>
          </div>
        )}

        <div style={{ height: '100px' }} />
      </div>

      <BottomNav />
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statValue, color: accent }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  )
}

const styles = {
  root: { minHeight: '100dvh', position: 'relative', overflow: 'hidden' },
  bgGlow: {
    position: 'fixed', inset: 0, zIndex: 0,
    background: 'radial-gradient(ellipse at 10% 10%, rgba(0,230,118,0.06) 0%, transparent 50%)',
    pointerEvents: 'none',
  },
  header: {
    position: 'relative', zIndex: 1,
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '60px 20px 20px',
  },
  greeting: { color: 'var(--text2)', fontSize: '14px', fontFamily: 'var(--font-mono)' },
  name: { fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, letterSpacing: '-1px', color: 'var(--text)' },
  logoutBtn: {
    background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
    color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: '11px',
    padding: '6px 12px', marginTop: '8px',
  },
  scroll: { position: 'relative', zIndex: 1, padding: '0 16px', animation: 'fadeUp 0.4s ease both' },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' },
  statCard: {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '16px',
  },
  statValue: { fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 500, marginBottom: '4px' },
  statLabel: { color: 'var(--text2)', fontSize: '11px' },
  ctaBtn: {
    width: '100%', background: 'var(--green-dim)', border: '1px solid rgba(0,230,118,0.2)',
    borderRadius: 'var(--radius)', padding: '18px 20px',
    display: 'flex', alignItems: 'center', gap: '16px',
    marginBottom: '24px', transition: 'background 0.2s',
    textAlign: 'left',
  },
  ctaIcon: { fontSize: '28px', color: 'var(--green)', flexShrink: 0 },
  ctaTitle: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: 'var(--text)' },
  ctaSub: { fontSize: '13px', color: 'var(--text2)', marginTop: '2px' },
  sectionTitle: {
    fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text3)',
    letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px',
  },
  lastCard: {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '16px',
  },
  lastRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  lastDate: { color: 'var(--text)', fontSize: '14px', fontWeight: 500 },
  lastBadge: { fontSize: '12px', fontFamily: 'var(--font-mono)', padding: '3px 10px', borderRadius: '20px' },
  lastMeta: { display: 'flex', gap: '8px', color: 'var(--text2)', fontSize: '13px', fontFamily: 'var(--font-mono)', marginBottom: '12px' },
  intervalBar: { display: 'flex', gap: '3px', height: '6px', marginBottom: '8px' },
  intervalLegend: { display: 'flex', gap: '12px' },
  empty: { textAlign: 'center', padding: '48px 0', color: 'var(--text2)', fontSize: '14px', lineHeight: 1.8 },
  emptyIcon: { fontSize: '40px', marginBottom: '12px', color: 'var(--text3)' },
}
