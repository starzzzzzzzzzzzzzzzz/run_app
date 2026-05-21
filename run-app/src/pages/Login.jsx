import React, { useState } from 'react'

const CREDENTIALS = { user: 'kaue', pass: 'paceup123' }

export default function Login({ onLogin }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    setTimeout(() => {
      if (user === CREDENTIALS.user && pass === CREDENTIALS.pass) {
        onLogin()
      } else {
        setErr('Usuário ou senha incorretos')
        setLoading(false)
      }
    }, 600)
  }

  return (
    <div style={styles.root}>
      <div style={styles.bg} />
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoText}>PACE</span>
          <span style={styles.logoAccent}>UP</span>
        </div>
        <p style={styles.sub}>Seu treino intervalado pessoal</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Usuário</label>
            <input
              style={styles.input}
              value={user}
              onChange={e => setUser(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              placeholder="seu usuário"
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Senha</label>
            <input
              style={styles.input}
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          {err && <p style={styles.err}>{err}</p>}
          <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? <span style={styles.spinner} /> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  bg: {
    position: 'fixed',
    inset: 0,
    background: 'radial-gradient(ellipse at 20% 80%, rgba(0,230,118,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(79,195,247,0.06) 0%, transparent 60%)',
    zIndex: 0,
  },
  card: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '360px',
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '36px 28px',
    animation: 'fadeUp 0.5s ease both',
  },
  logo: {
    fontFamily: 'var(--font-display)',
    fontSize: '36px',
    fontWeight: 800,
    letterSpacing: '-1px',
    marginBottom: '4px',
  },
  logoText: { color: 'var(--text)' },
  logoAccent: { color: 'var(--green)' },
  sub: {
    color: 'var(--text2)',
    fontSize: '14px',
    marginBottom: '32px',
    fontFamily: 'var(--font-body)',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', color: 'var(--text2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.5px' },
  input: {
    background: 'var(--bg3)',
    border: '1px solid var(--border2)',
    borderRadius: '10px',
    padding: '12px 14px',
    color: 'var(--text)',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  err: {
    color: 'var(--red)',
    fontSize: '13px',
    textAlign: 'center',
    fontFamily: 'var(--font-mono)',
  },
  btn: {
    marginTop: '8px',
    background: 'var(--green)',
    color: '#000',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '15px',
    padding: '14px',
    border: 'none',
    borderRadius: '12px',
    transition: 'opacity 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '18px', height: '18px',
    border: '2px solid rgba(0,0,0,0.3)',
    borderTop: '2px solid #000',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },
}
