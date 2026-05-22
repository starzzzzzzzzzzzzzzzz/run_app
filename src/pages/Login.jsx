import React, { useState } from 'react'

const CREDENTIALS = { user: 'kaue', pass: 'paceup123' }

export default function Login({ onLogin }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr]   = useState('')
  const [loading, setLoading] = useState(false)

  const submit = () => {
    setErr(''); setLoading(true)
    setTimeout(() => {
      if (user.trim() === CREDENTIALS.user && pass === CREDENTIALS.pass) {
        onLogin()
      } else {
        setErr('Usuário ou senha incorretos')
        setLoading(false)
      }
    }, 500)
  }

  return (
    <div style={s.root}>
      <div style={s.noise} />

      <div style={s.inner}>
        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoBadge}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M13 3L4 14h8l-1 7 9-11h-8l1-10z" fill="var(--green)" stroke="var(--green)" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 style={s.logo}>PaceUp</h1>
            <p style={s.tagline}>Seu ritmo, sua corrida.</p>
          </div>
        </div>

        {/* Card */}
        <div style={s.card}>
          <p style={s.cardTitle}>Entrar</p>

          <div style={s.fieldGroup}>
            <div style={s.field}>
              <span style={s.fieldLabel}>Usuário</span>
              <input
                style={s.input}
                value={user}
                onChange={e => setUser(e.target.value)}
                placeholder="seu usuário"
                autoCapitalize="none"
                onKeyDown={e => e.key === 'Enter' && submit()}
              />
            </div>
            <div style={s.field}>
              <span style={s.fieldLabel}>Senha</span>
              <input
                style={s.input}
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && submit()}
              />
            </div>
          </div>

          {err && <p style={s.err}>{err}</p>}

          <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} onClick={submit} disabled={loading}>
            {loading
              ? <span style={s.spinner} />
              : <>Entrar <span style={{ marginLeft: '6px' }}>→</span></>}
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  root: {
    minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px', position: 'relative', overflow: 'hidden',
    background: 'var(--bg)',
  },
  noise: {
    position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(198,241,53,0.07) 0%, transparent 70%)',
  },
  inner: {
    position: 'relative', zIndex: 1, width: '100%', maxWidth: '360px',
    display: 'flex', flexDirection: 'column', gap: '32px',
    animation: 'fadeUp 0.5s ease both',
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: '14px' },
  logoBadge: {
    width: '52px', height: '52px', borderRadius: '14px',
    background: 'var(--green-dim)', border: '1px solid var(--green-mid)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logo: { fontSize: '28px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' },
  tagline: { fontSize: '13px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginTop: '2px' },
  card: {
    background: 'var(--bg2)', border: '1px solid var(--border2)',
    borderRadius: '20px', padding: '28px',
  },
  cardTitle: { fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: 'var(--text)' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  fieldLabel: { fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)', letterSpacing: '1px', textTransform: 'uppercase' },
  input: {
    background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: '10px', padding: '13px 14px',
    color: 'var(--text)', fontSize: '15px', outline: 'none',
    transition: 'border-color 0.2s',
  },
  err: { color: 'var(--red)', fontSize: '12px', fontFamily: 'var(--font-mono)', marginBottom: '12px', textAlign: 'center' },
  btn: {
    width: '100%', padding: '14px', borderRadius: '12px',
    background: 'var(--green)', color: '#000',
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px',
    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'opacity 0.2s',
  },
  spinner: {
    width: '18px', height: '18px', borderRadius: '50%',
    border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid #000',
    display: 'inline-block', animation: 'spin 0.7s linear infinite',
  },
}
