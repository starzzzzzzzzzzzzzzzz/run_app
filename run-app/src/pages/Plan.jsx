import React, { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import {
  fmtTime, blockLabel, blockColor, blockDimBg,
  savePlan, loadPlan,
} from '../utils/workout.js'

// Estimate total time only when a fixed km is set
function estimateTime(blocks, targetKm) {
  if (!targetKm || blocks.length === 0) return null
  const RUN_SPEED = 0.133, WALK_SPEED = 0.067
  const cycleDist = blocks.reduce((s, b) =>
    s + (b.dur / 60) * (b.type === 'run' ? RUN_SPEED : WALK_SPEED), 0)
  if (cycleDist <= 0) return null
  const cycles = Math.ceil(targetKm / cycleDist)
  return blocks.reduce((s, b) => s + b.dur, 0) * cycles
}

export default function Plan() {
  const nav = useNavigate()
  const saved = useMemo(() => loadPlan(), [])

  // blocks: sequência que o usuário monta — se vazia, é só corrida livre
  const [blocks, setBlocks] = useState(saved.blocks || [])

  // targetKm: número ou null (null = correr até parar)
  const [targetKm, setTargetKm] = useState(saved.targetKm || null)
  const [kmInput, setKmInput]   = useState(saved.targetKm ? String(saved.targetKm) : '')
  const [freeMode, setFreeMode] = useState(!saved.targetKm)

  const estSec = useMemo(() =>
    freeMode ? null : estimateTime(blocks, targetKm),
    [blocks, targetKm, freeMode]
  )

  // Duration control
  const changeDur = (i, delta) =>
    setBlocks(bs => bs.map((b, idx) =>
      idx === i ? { ...b, dur: Math.max(15, b.dur + delta) } : b
    ))

  const delBlock = (i) =>
    setBlocks(bs => bs.filter((_, idx) => idx !== i))

  const addBlock = (type) =>
    setBlocks(bs => [...bs, { type, dur: 60 }])

  // Reorder via drag-and-drop (simple swap on mobile: tap up/down)
  const moveBlock = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= blocks.length) return
    setBlocks(bs => {
      const n = [...bs]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  }

  const handleKmInput = (val) => {
    setKmInput(val)
    const n = parseFloat(val)
    if (n > 0) setTargetKm(n)
    else setTargetKm(null)
  }

  const toggleFree = () => {
    setFreeMode(f => {
      if (!f) { setTargetKm(null); setKmInput('') }
      return !f
    })
  }

  const canStart = blocks.length > 0 || freeMode

  const start = () => {
    const km = freeMode ? 9999 : (targetKm || 5)
    savePlan({ blocks: blocks.length > 0 ? blocks : [{ type: 'run', dur: 3600 }], targetKm: km })
    nav('/execute', { state: {
      blocks: blocks.length > 0 ? blocks : [{ type: 'run', dur: 3600 }],
      targetKm: km,
      freeMode,
    }})
  }

  const totalCycleSec = blocks.reduce((s, b) => s + b.dur, 0)

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div>
          <p style={styles.sup}>Configurar</p>
          <h1 style={styles.title}>Meu treino</h1>
        </div>
        <div style={styles.estBox}>
          {estSec != null ? (
            <>
              <div style={styles.estVal}>{fmtTime(estSec)}</div>
              <div style={styles.estLabel}>estimado</div>
            </>
          ) : (
            <>
              <div style={{ ...styles.estVal, color: 'var(--text3)' }}>—</div>
              <div style={styles.estLabel}>livre</div>
            </>
          )}
        </div>
      </div>

      <div style={styles.scroll}>

        {/* ── DISTÂNCIA ── */}
        <div style={styles.section}>
          <p style={styles.sectionLabel}>Distância</p>

          {/* Free mode toggle */}
          <button style={{ ...styles.freeToggle, ...(freeMode ? styles.freeToggleOn : {}) }} onClick={toggleFree}>
            <div style={{ ...styles.freeToggleDot, ...(freeMode ? styles.freeToggleDotOn : {}) }} />
            <span style={{ fontSize: '13px', color: freeMode ? 'var(--green)' : 'var(--text2)', fontFamily: 'var(--font-mono)' }}>
              Correr até parar
            </span>
          </button>

          {!freeMode && (
            <div style={styles.kmInputWrap}>
              <input
                type="number"
                inputMode="decimal"
                value={kmInput}
                onChange={e => handleKmInput(e.target.value)}
                placeholder="ex: 5"
                style={styles.kmInput}
              />
              <span style={styles.kmUnit}>km</span>
            </div>
          )}
        </div>

        {/* ── SEQUÊNCIA ── */}
        <div style={styles.section}>
          <div style={styles.sectionRow}>
            <p style={styles.sectionLabel}>
              Sequência de intervalos
            </p>
            {totalCycleSec > 0 && (
              <span style={styles.cycleTime}>ciclo: {fmtTime(totalCycleSec)}</span>
            )}
          </div>

          {blocks.length === 0 ? (
            <div style={styles.emptyBlocks}>
              <span style={{ fontSize: '28px', marginBottom: '8px' }}>➕</span>
              <p>Nenhum intervalo adicionado.</p>
              <p style={{ color: 'var(--text3)', fontSize: '12px', marginTop: '4px' }}>
                Adicione blocos abaixo — eles se repetem até o fim.
              </p>
            </div>
          ) : (
            <>
              {/* Visual bar */}
              <div style={styles.vizBar}>
                {blocks.map((b, i) => (
                  <div key={i} style={{
                    flex: b.dur, height: '100%',
                    background: blockColor(b.type),
                    borderRadius: '2px',
                    transition: 'flex 0.3s',
                  }} />
                ))}
              </div>

              <div style={styles.blockList}>
                {blocks.map((b, i) => (
                  <div key={i} style={styles.blockItem}>
                    {/* Color bar */}
                    <div style={{ width: '3px', alignSelf: 'stretch', borderRadius: '99px', background: blockColor(b.type), flexShrink: 0, minHeight: '44px' }} />

                    {/* Icon */}
                    <div style={{ ...styles.blockIconBox, background: blockDimBg(b.type) }}>
                      <span style={{ fontSize: '18px' }}>{b.type === 'run' ? '🏃' : '🚶'}</span>
                    </div>

                    {/* Info */}
                    <div style={styles.blockInfo}>
                      <div style={{ ...styles.blockType, color: blockColor(b.type) }}>{blockLabel(b.type)}</div>
                      <div style={styles.blockDur}>{fmtTime(b.dur)}</div>
                    </div>

                    {/* Duration control */}
                    <div style={styles.durCtrl}>
                      <button style={styles.durBtn} onClick={() => changeDur(i, -15)}>−</button>
                      <button style={styles.durBtn} onClick={() => changeDur(i, +15)}>+</button>
                    </div>

                    {/* Reorder */}
                    <div style={styles.reorderCtrl}>
                      <button style={styles.reorderBtn} onClick={() => moveBlock(i, -1)} disabled={i === 0}>↑</button>
                      <button style={styles.reorderBtn} onClick={() => moveBlock(i, +1)} disabled={i === blocks.length - 1}>↓</button>
                    </div>

                    {/* Delete */}
                    <button style={styles.delBtn} onClick={() => delBlock(i)}>✕</button>
                  </div>
                ))}
              </div>

              {/* Repeat hint */}
              <div style={styles.repeatHint}>
                <span style={{ color: 'var(--green)', marginRight: '6px' }}>↺</span>
                Repete até {freeMode ? 'você parar' : `${targetKm || '?'} km`}
              </div>
            </>
          )}

          {/* Add buttons */}
          <div style={styles.addRow}>
            <button
              style={{ ...styles.addBtn, borderColor: 'rgba(0,230,118,0.3)', color: 'var(--green)' }}
              onClick={() => addBlock('run')}
            >
              + Corrida
            </button>
            <button
              style={{ ...styles.addBtn, borderColor: 'rgba(79,195,247,0.3)', color: 'var(--blue)' }}
              onClick={() => addBlock('walk')}
            >
              + Caminhada
            </button>
          </div>
        </div>

        {/* Start */}
        <button
          style={{ ...styles.startBtn, opacity: canStart ? 1 : 0.4 }}
          onClick={canStart ? start : undefined}
        >
          ▶ Iniciar treino
        </button>

        <div style={{ height: '100px' }} />
      </div>

      <BottomNav />
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
  estBox: { textAlign: 'right' },
  estVal: { fontFamily: 'var(--font-mono)', fontSize: '22px', color: 'var(--green)', fontWeight: 500 },
  estLabel: { fontSize: '11px', color: 'var(--text3)' },
  scroll: { padding: '0 16px', animation: 'fadeUp 0.4s ease both' },
  section: { marginBottom: '24px' },
  sectionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  sectionLabel: {
    fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text3)',
    letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px',
  },
  cycleTime: { fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text2)' },

  // Free mode toggle
  freeToggle: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: '10px', padding: '12px 14px', width: '100%',
    marginBottom: '10px', transition: 'border-color 0.2s',
  },
  freeToggleOn: { borderColor: 'rgba(0,230,118,0.35)', background: 'var(--green-dim)' },
  freeToggleDot: {
    width: '18px', height: '18px', borderRadius: '50%',
    border: '2px solid var(--border2)', background: 'var(--bg3)',
    flexShrink: 0, transition: 'all 0.2s',
  },
  freeToggleDotOn: { background: 'var(--green)', border: '2px solid var(--green)', boxShadow: '0 0 6px var(--green)' },

  kmInputWrap: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: '10px', padding: '4px 14px',
  },
  kmInput: {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '24px',
    fontWeight: 500, padding: '10px 0',
    MozAppearance: 'textfield',
  },
  kmUnit: { fontFamily: 'var(--font-mono)', fontSize: '16px', color: 'var(--text3)' },

  // Blocks
  emptyBlocks: {
    background: 'var(--bg2)', border: '1px dashed var(--border)',
    borderRadius: '12px', padding: '28px 16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    color: 'var(--text2)', fontSize: '13px', marginBottom: '12px',
    textAlign: 'center',
  },
  vizBar: { display: 'flex', gap: '3px', height: '8px', borderRadius: '99px', overflow: 'hidden', marginBottom: '12px' },
  blockList: { display: 'flex', flexDirection: 'column', marginBottom: '10px' },
  blockItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 0', borderBottom: '1px solid var(--border)',
    animation: 'fadeIn 0.2s ease both',
  },
  blockIconBox: {
    width: '36px', height: '36px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  blockInfo: { flex: 1 },
  blockType: { fontSize: '13px', fontWeight: 500 },
  blockDur: { fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text2)', marginTop: '1px' },
  durCtrl: { display: 'flex', gap: '6px' },
  durBtn: {
    width: '28px', height: '28px', borderRadius: '8px',
    background: 'var(--bg3)', border: '1px solid var(--border2)',
    color: 'var(--text)', fontSize: '18px', lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  reorderCtrl: { display: 'flex', flexDirection: 'column', gap: '2px' },
  reorderBtn: {
    width: '22px', height: '20px', borderRadius: '5px',
    background: 'var(--bg3)', border: '1px solid var(--border)',
    color: 'var(--text3)', fontSize: '11px', lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  delBtn: {
    background: 'none', border: 'none', color: 'var(--text3)', fontSize: '14px',
    width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  repeatHint: {
    fontSize: '12px', color: 'var(--text2)', fontFamily: 'var(--font-mono)',
    padding: '8px 0', marginBottom: '4px',
  },
  addRow: { display: 'flex', gap: '10px' },
  addBtn: {
    flex: 1, padding: '12px', borderRadius: '10px',
    border: '1px dashed', background: 'transparent',
    fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500,
    transition: 'background 0.2s',
  },
  startBtn: {
    width: '100%', padding: '16px',
    background: 'var(--green)', color: '#000',
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px',
    border: 'none', borderRadius: '14px',
    letterSpacing: '0.5px', transition: 'opacity 0.2s',
  },
}
