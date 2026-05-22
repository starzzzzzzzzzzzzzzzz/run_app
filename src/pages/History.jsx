import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav.jsx'
import { getHistory, fmtTime, fmtDist, fmtPace, deleteWorkout, clearHistory } from '../utils/workout.js'

// ── Save Photo Modal ─────────────────────────────────────────────────────────
function SavePhotoModal({ workout, onClose }) {
  const [mapStyle, setMapStyle]   = useState('clean')    // clean | satellite
  const [traceStyle, setTrace]    = useState('solid')    // solid | dashed
  const [bgStyle, setBg]          = useState('dark')     // dark | white | transparent
  const [format, setFormat]       = useState('png')
  const [loading, setLoading]     = useState(false)
  const [preview, setPreview]     = useState(null)

  const buildCanvas = useCallback(async ()=>{
    const coords  = workout.coords || []
    const W=540, H=960, ROUTE_H=340, MID_H=460, BOT_H=160
    const canvas  = document.createElement('canvas')
    canvas.width=W; canvas.height=H
    const ctx = canvas.getContext('2d')
    const transparent = bgStyle==='transparent'

    // ── Route BG ───────────────────────────────────────────────────────
    if(transparent){
      ctx.clearRect(0,0,W,ROUTE_H)
    } else if(mapStyle==='satellite' && coords.length>=2){
      try{
        const lats=coords.map(c=>c[0]), lngs=coords.map(c=>c[1])
        const minLat=Math.min(...lats),maxLat=Math.max(...lats)
        const minLng=Math.min(...lngs),maxLng=Math.max(...lngs)
        const cLat=(minLat+maxLat)/2, cLng=(minLng+maxLng)/2
        const latRange=(maxLat-minLat)||0.005
        const zoom=Math.min(17,Math.max(13,Math.floor(Math.log2(360/latRange))-1))
        const tileX=lng=>Math.floor((lng+180)/360*Math.pow(2,zoom))
        const tileY=lat=>{const r=Math.PI/180;return Math.floor((1-Math.log(Math.tan(lat*r)+1/Math.cos(lat*r))/Math.PI)/2*Math.pow(2,zoom))}
        const tx=tileX(cLng),ty=tileY(cLat)
        const offX=1,offY=1
        const promises=[]
        for(let dy=-offY;dy<=offY;dy++) for(let dx=-offX;dx<=offX;dx++){
          const url=`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty+dy}/${tx+dx}`
          promises.push(new Promise(res=>{
            const img=new Image(); img.crossOrigin='anonymous'
            img.onload=()=>res({img,dx:dx+offX,dy:dy+offY})
            img.onerror=()=>res(null)
            img.src=url
          }))
        }
        const tiles=await Promise.all(promises)
        const tilesX=3,tilesY=3
        const tw=W/tilesX,th=ROUTE_H/tilesY
        ctx.fillStyle='#101510'; ctx.fillRect(0,0,W,ROUTE_H)
        tiles.forEach(t=>{ if(t) ctx.drawImage(t.img,t.dx*tw,t.dy*th,tw+1,th+1) })
        ctx.fillStyle='rgba(0,0,0,0.32)'; ctx.fillRect(0,0,W,ROUTE_H)
      } catch{
        ctx.fillStyle='#0d0f0a'; ctx.fillRect(0,0,W,ROUTE_H)
      }
    } else if(bgStyle==='white'){
      ctx.fillStyle='#f5f5f5'; ctx.fillRect(0,0,W,ROUTE_H)
      ctx.strokeStyle='rgba(0,0,0,0.05)'; ctx.lineWidth=1
      for(let i=1;i<6;i++){
        ctx.beginPath();ctx.moveTo(W*i/6,0);ctx.lineTo(W*i/6,ROUTE_H);ctx.stroke()
        ctx.beginPath();ctx.moveTo(0,ROUTE_H*i/6);ctx.lineTo(W,ROUTE_H*i/6);ctx.stroke()
      }
    } else {
      ctx.fillStyle='#0d0f0a'; ctx.fillRect(0,0,W,ROUTE_H)
      ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1
      for(let i=1;i<4;i++){
        ctx.beginPath();ctx.moveTo(W*i/4,0);ctx.lineTo(W*i/4,ROUTE_H);ctx.stroke()
        ctx.beginPath();ctx.moveTo(0,ROUTE_H*i/4);ctx.lineTo(W,ROUTE_H*i/4);ctx.stroke()
      }
    }

    // ── Draw route ─────────────────────────────────────────────────────
    if(coords.length>=2){
      const lats=coords.map(c=>c[0]),lngs=coords.map(c=>c[1])
      const minLat=Math.min(...lats),maxLat=Math.max(...lats)
      const minLng=Math.min(...lngs),maxLng=Math.max(...lngs)
      const dLa=(maxLat-minLat)||0.001, dLo=(maxLng-minLng)||0.001
      const pad=0.28
      const bMinLa=minLat-dLa*pad,bMaxLa=maxLat+dLa*pad
      const bMinLo=minLng-dLo*pad,bMaxLo=maxLng+dLo*pad
      const mg=52
      const tX=lo=>mg+((lo-bMinLo)/(bMaxLo-bMinLo))*(W-mg*2)
      const tY=la=>(ROUTE_H-mg)-((la-bMinLa)/(bMaxLa-bMinLa))*(ROUTE_H-mg*2)

      const lineColor = bgStyle==='white'
        ? (mapStyle==='satellite'?'#00c853':'#00a040')
        : (mapStyle==='satellite'?'#b5f23d':'#ffffff')
      const glowColor = '#b5f23d'

      // Glow halo
      ctx.shadowColor=glowColor; ctx.shadowBlur=mapStyle==='satellite'?30:22
      ctx.beginPath()
      ctx.strokeStyle=glowColor.replace(')',',0.2)').replace('rgb','rgba')||'rgba(181,242,61,0.2)'
      ctx.lineWidth=18; ctx.lineCap='round'; ctx.lineJoin='round'
      coords.forEach(([la,lo],i)=>i===0?ctx.moveTo(tX(lo),tY(la)):ctx.lineTo(tX(lo),tY(la)))
      ctx.stroke(); ctx.shadowBlur=0

      // Main route (solid or dashed)
      ctx.beginPath()
      ctx.strokeStyle=lineColor
      ctx.lineWidth=traceStyle==='dashed'?3:3.5
      if(traceStyle==='dashed') ctx.setLineDash([14,10])
      else ctx.setLineDash([])
      ctx.lineCap='round'; ctx.lineJoin='round'
      coords.forEach(([la,lo],i)=>i===0?ctx.moveTo(tX(lo),tY(la)):ctx.lineTo(tX(lo),tY(la)))
      ctx.stroke()
      ctx.setLineDash([])

      // Distance markers every ~1km
      let markerDist=0, lastCoord=coords[0]
      coords.forEach(([la,lo],i)=>{
        if(i===0) return
        const [pLa,pLo]=lastCoord
        const d=Math.sqrt((la-pLa)**2+(lo-pLo)**2)*111
        markerDist+=d; lastCoord=[la,lo]
        if(markerDist>1){
          markerDist=0
          ctx.beginPath(); ctx.arc(tX(lo),tY(la),4,0,Math.PI*2)
          ctx.fillStyle=lineColor; ctx.fill()
        }
      })

      // Start dot
      const [sLa,sLo]=coords[0]
      ctx.beginPath(); ctx.arc(tX(sLo),tY(sLa),7,0,Math.PI*2)
      ctx.fillStyle='#fff'; ctx.fill()
      ctx.beginPath(); ctx.arc(tX(sLo),tY(sLa),4,0,Math.PI*2)
      ctx.fillStyle='#333'; ctx.fill()

      // End dot (lime)
      const [eLa,eLo]=coords[coords.length-1]
      ctx.shadowColor='#b5f23d'; ctx.shadowBlur=20
      ctx.beginPath(); ctx.arc(tX(eLo),tY(eLa),10,0,Math.PI*2)
      ctx.fillStyle='#b5f23d'; ctx.fill(); ctx.shadowBlur=0
      ctx.beginPath(); ctx.arc(tX(eLo),tY(eLa),5,0,Math.PI*2)
      ctx.fillStyle='#000'; ctx.fill()
    } else {
      ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.font='14px Arial'
      ctx.textAlign='center'; ctx.fillText('Sem dados de rota GPS',W/2,ROUTE_H/2)
    }

    // ── Stats section ──────────────────────────────────────────────────
    if(transparent){
      ctx.clearRect(0,ROUTE_H,W,MID_H+BOT_H)
    } else {
      const statsBg = bgStyle==='white'?'#ffffff':'#0C0C0E'
      ctx.fillStyle=statsBg; ctx.fillRect(0,ROUTE_H,W,MID_H)
      const grad=ctx.createLinearGradient(0,0,W,0)
      grad.addColorStop(0,'#b5f23d'); grad.addColorStop(1,'#7fd83a')
      ctx.fillStyle=grad; ctx.fillRect(0,ROUTE_H,W,3)

      const textCol = bgStyle==='white'?'#111':'#EFEFEF'
      const subCol  = bgStyle==='white'?'rgba(0,0,0,0.35)':'rgba(239,239,239,0.3)'
      const divCol  = bgStyle==='white'?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.05)'

      ctx.textAlign='center'; ctx.font='600 13px Arial'
      ctx.fillStyle='rgba(181,242,61,0.7)'; ctx.fillText('PACEUP',W/2,ROUTE_H+38)
      ctx.fillStyle=divCol; ctx.fillRect(40,ROUTE_H+50,W-80,1)

      const statsData=[
        {val:(workout.distKm||0).toFixed(2), unit:'km',     label:'Distância', y:ROUTE_H+155},
        {val:fmtTime(workout.durationSec||0), unit:'',       label:'Duração',   y:ROUTE_H+275},
        {val:fmtPace(workout.avgPace),         unit:'min/km', label:'Pace médio',y:ROUTE_H+395},
      ]
      statsData.forEach(({val,unit,label,y})=>{
        ctx.textAlign='left'; ctx.font='bold 76px Arial'; ctx.fillStyle=textCol
        const vw=ctx.measureText(val).width
        const sx=unit?W/2-vw/2-14:W/2-vw/2
        ctx.fillText(val,sx,y)
        if(unit){ctx.font='bold 18px Arial';ctx.fillStyle=subCol;ctx.fillText(unit,sx+vw+8,y-40)}
        ctx.textAlign='center';ctx.font='14px Arial';ctx.fillStyle=subCol;ctx.fillText(label,W/2,y+28)
        ctx.fillStyle=divCol;ctx.fillRect(40,y+46,W-80,1)
      })

      // Branding
      ctx.fillStyle=statsBg; ctx.fillRect(0,ROUTE_H+MID_H,W,BOT_H)
      ctx.fillStyle=divCol; ctx.fillRect(0,ROUTE_H+MID_H,W,1)
      ctx.textAlign='center'; ctx.font='bold 32px Arial'; ctx.fillStyle=textCol
      ctx.fillText('PaceUp',W/2,ROUTE_H+MID_H+62)
      ctx.font='13px Arial'; ctx.fillStyle=subCol
      ctx.fillText('seu ritmo. sua corrida.',W/2,ROUTE_H+MID_H+86)
      const ds=new Date(workout.date).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})
      ctx.font='12px Arial'; ctx.fillStyle='rgba(181,242,61,0.8)'
      ctx.fillText(ds,W/2,ROUTE_H+MID_H+116)
    }

    return canvas
  },[workout,mapStyle,traceStyle,bgStyle])

  const handlePreview = async ()=>{
    setLoading(true)
    try{
      const canvas=await buildCanvas()
      setPreview(canvas.toDataURL('image/png'))
    }finally{ setLoading(false) }
  }

  const handleSave = async ()=>{
    setLoading(true)
    try{
      const canvas=await buildCanvas()
      const mimes={png:'image/png',jpg:'image/jpeg',webp:'image/webp'}
      const q={png:1,jpg:0.92,webp:0.92}
      const url=canvas.toDataURL(mimes[format],q[format])
      const a=document.createElement('a')
      a.href=url
      a.download=`paceup-${new Date(workout.date).toLocaleDateString('pt-BR').replace(/\//g,'-')}.${format}`
      a.click()
    }finally{ setLoading(false) }
  }

  return (
    <div style={m.overlay} onClick={onClose}>
      <div style={m.sheet} onClick={e=>e.stopPropagation()}>
        <div style={m.handle}/>
        <h2 style={m.title}>Salvar foto do treino</h2>

        {/* Preview */}
        {preview && <img src={preview} alt="preview" style={m.preview}/>}

        {/* Map style */}
        <p style={m.label}>Estilo do mapa</p>
        <div style={m.optRow}>
          <Opt icon="◉"  title="Rota limpa"  sub="Fundo escuro" active={mapStyle==='clean'}     onClick={()=>setMapStyle('clean')}/>
          <Opt icon="🛰"  title="Satélite"    sub="Imagem aérea" active={mapStyle==='satellite'} onClick={()=>setMapStyle('satellite')}/>
        </div>

        {/* Trace style */}
        <p style={m.label}>Traçado da rota</p>
        <div style={m.optRow}>
          <Opt icon="─"  title="Contínuo"    sub="Linha sólida"    active={traceStyle==='solid'}  onClick={()=>setTrace('solid')}/>
          <Opt icon="╌"  title="Tracejado"   sub="Linha pontilhada" active={traceStyle==='dashed'} onClick={()=>setTrace('dashed')}/>
        </div>

        {/* Background style */}
        <p style={m.label}>Fundo das estatísticas</p>
        <div style={{...m.optRow, flexWrap:'wrap', gap:'8px'}}>
          <Opt icon="🌑" title="Escuro"       sub="Fundo preto"       active={bgStyle==='dark'}        onClick={()=>setBg('dark')} flex="1"/>
          <Opt icon="⬜" title="Branco"       sub="Fundo branco"      active={bgStyle==='white'}       onClick={()=>setBg('white')} flex="1"/>
          <Opt icon="◻" title="Transparente" sub="Só rota (PNG)"     active={bgStyle==='transparent'} onClick={()=>setBg('transparent')} flex="1"/>
        </div>

        {/* Format */}
        <p style={m.label}>Formato</p>
        <div style={m.fmtRow}>
          {[['png','PNG','Sem perda'],['jpg','JPG','Menor'],['webp','WebP','Web']].map(([f,n,d])=>(
            <button key={f} style={Object.assign({},m.fmtBtn,format===f?m.fmtActive:{})} onClick={()=>setFormat(f)}>
              <div style={m.fmtName}>{n}</div>
              <div style={m.fmtSub}>{d}</div>
            </button>
          ))}
        </div>

        <div style={{display:'flex',gap:'8px'}}>
          <button style={m.previewBtn} onClick={handlePreview} disabled={loading}>
            {loading?<span style={m.spinner}/>:'👁 Preview'}
          </button>
          <button style={{...m.saveBtn,flex:2}} onClick={handleSave} disabled={loading}>
            {loading?<span style={m.spinner}/>:`↓ Baixar .${format}`}
          </button>
        </div>
        <button style={m.cancelBtn} onClick={onClose}>Cancelar</button>
      </div>
    </div>
  )
}

function Opt({icon,title,sub,active,onClick,flex}){
  return (
    <button style={{flex:flex||1,background:active?'var(--green-dim)':'var(--bg3)',border:`1px solid ${active?'var(--green)':'var(--border)'}`,borderRadius:12,padding:'11px',textAlign:'left',display:'flex',alignItems:'center',gap:'8px',transition:'all 0.15s'}} onClick={onClick}>
      <span style={{fontSize:'18px',flexShrink:0}}>{icon}</span>
      <div>
        <div style={{fontSize:'12px',fontWeight:600,color:'var(--text)',marginBottom:'1px'}}>{title}</div>
        <div style={{fontSize:'10px',color:'var(--text3)'}}>{sub}</div>
      </div>
    </button>
  )
}

// ── History page ─────────────────────────────────────────────────────────────
export default function History() {
  const nav = useNavigate()
  const [history, setHistory] = useState(()=>getHistory())
  const [expanded, setExpanded] = useState(null)
  const [saveTarget, setSaveTarget] = useState(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [tab, setTab] = useState('list') // list | evolution

  const totalDist = history.reduce((s,w)=>s+(w.distKm||0),0)
  const totalTime = history.reduce((s,w)=>s+(w.durationSec||0),0)
  const bestPace  = history.reduce((b,w)=>(!w.avgPace?b:(!b||w.avgPace<b)?w.avgPace:b),null)

  const handleDelete = (id)=>{ deleteWorkout(id); setHistory(getHistory()); setExpanded(null) }
  const handleClearAll = ()=>{ clearHistory(); setHistory([]); setConfirmClear(false) }

  // Photos with before/after for evolution tab
  const workoutsWithPhotos = history.filter(w=>w.photoStart||w.photoEnd)

  return (
    <div style={s.root}>
      {saveTarget && <SavePhotoModal workout={saveTarget} onClose={()=>setSaveTarget(null)}/>}

      {confirmClear && (
        <div style={m.overlay} onClick={()=>setConfirmClear(false)}>
          <div style={{...m.sheet,padding:'28px 20px'}} onClick={e=>e.stopPropagation()}>
            <div style={m.handle}/>
            <h2 style={{...m.title,color:'var(--red)'}}>Limpar histórico?</h2>
            <p style={{color:'var(--text2)',fontSize:'14px',textAlign:'center',marginBottom:'20px',lineHeight:1.6}}>
              Todos os {history.length} treinos serão excluídos permanentemente.
            </p>
            <button style={{...m.saveBtn,background:'var(--red)',color:'#fff',marginBottom:'10px'}} onClick={handleClearAll}>Excluir tudo</button>
            <button style={m.cancelBtn} onClick={()=>setConfirmClear(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={s.header}>
        <div>
          <p style={s.sup}>Seus registros</p>
          <h1 style={s.title}>Histórico</h1>
        </div>
        {history.length>0 && (
          <button style={s.clearBtn} onClick={()=>setConfirmClear(true)}>Limpar</button>
        )}
      </div>

      {/* Stats strip */}
      {history.length>0 && (
        <div style={s.strip}>
          <SS label="km total"    value={parseFloat(totalDist.toFixed(1))} color="var(--green)"/>
          <div style={s.div}/>
          <SS label="treinos"     value={history.length}/>
          <div style={s.div}/>
          <SS label="tempo total" value={fmtTime(totalTime)}/>
          {bestPace&&<><div style={s.div}/><SS label="melhor pace" value={fmtPace(bestPace)} color="var(--blue)"/></>}
        </div>
      )}

      {/* Tabs */}
      <div style={s.tabRow}>
        <button style={{...s.tabBtn,color:tab==='list'?'var(--green)':'var(--text3)',borderBottom:tab==='list'?'2px solid var(--green)':'2px solid transparent'}} onClick={()=>setTab('list')}>Lista</button>
        <button style={{...s.tabBtn,color:tab==='evolution'?'var(--green)':'var(--text3)',borderBottom:tab==='evolution'?'2px solid var(--green)':'2px solid transparent'}} onClick={()=>setTab('evolution')}>Evolução</button>
      </div>

      <div style={s.scroll}>
        {tab==='list' ? (
          history.length===0 ? (
            <div style={s.empty}>
              <div style={s.emptyRing}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M13 3L4 14h8l-1 7 9-11h-8l1-10z" stroke="var(--text3)" strokeWidth="1.5" strokeLinejoin="round"/></svg>
              </div>
              <p style={s.emptyTitle}>Nenhum treino ainda</p>
              <p style={s.emptySub}>Complete seu primeiro treino.</p>
              <button style={s.emptyBtn} onClick={()=>nav('/plan')}>Começar agora →</button>
            </div>
          ) : history.map((w,i)=>(
            <WorkoutCard key={w.id||i} w={w} index={i}
              open={expanded===i}
              onToggle={()=>setExpanded(expanded===i?null:i)}
              onDelete={()=>handleDelete(w.id)}
              onSave={()=>setSaveTarget(w)}
            />
          ))
        ) : (
          <EvolutionTab workouts={workoutsWithPhotos} history={history}/>
        )}
        <div style={{height:110}}/>
      </div>
      <BottomNav/>
    </div>
  )
}

function SS({label,value,color}){
  return (
    <div style={{textAlign:'center',flex:1}}>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'15px',fontWeight:500,color:color||'var(--text)',marginBottom:'2px'}}>{value}</div>
      <div style={{fontSize:'10px',color:'var(--text3)',letterSpacing:'0.5px'}}>{label}</div>
    </div>
  )
}

function WorkoutCard({w,index,open,onToggle,onDelete,onSave}){
  const date=new Date(w.date)
  const dateStr=date.toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'})
  const timeStr=date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
  const [confirmDel,setConfirmDel]=useState(false)

  return (
    <div style={{...s.card,animationDelay:`${Math.min(index*0.04,0.3)}s`}}>
      <div style={s.cardRow} onClick={onToggle}>
        <div style={s.cardLeft}>
          <div style={s.dateBadge}>
            <span style={s.dateDay}>{date.getDate()}</span>
            <span style={s.dateMon}>{date.toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}</span>
          </div>
          <div>
            <div style={s.cardDate}>{dateStr} · {timeStr}</div>
            <div style={s.cardDist}>{fmtDist(w.distKm||0)} <span style={s.distUnit}>km</span></div>
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{transform:open?'rotate(180deg)':'none',transition:'transform 0.2s',flexShrink:0}}>
          <path d="M6 9l6 6 6-6" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <div style={s.quickStats}>
        <QS label="tempo"  value={fmtTime(w.durationSec||0)}/>
        <QS label="pace"   value={fmtPace(w.avgPace)} color="var(--blue)"/>
        <QS label="kcal"   value={w.calories||0}/>
      </div>

      {open && (
        <div style={s.expanded}>
          {/* Start/End photos */}
          {(w.photoStart||w.photoEnd) && (
            <div style={s.photoRow}>
              {w.photoStart && (
                <div style={s.photoWrap}>
                  <img src={w.photoStart} alt="início" style={s.photo}/>
                  <span style={s.photoLabel}>Início</span>
                </div>
              )}
              {w.photoEnd && (
                <div style={s.photoWrap}>
                  <img src={w.photoEnd} alt="final" style={s.photo}/>
                  <span style={s.photoLabel}>Final</span>
                </div>
              )}
            </div>
          )}

          {/* Route preview */}
          {w.route && <img src={w.route} alt="rota" style={s.routeImg}/>}

          <button style={s.savePhotoBtn} onClick={onSave}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M8 12l4 4 4-4M12 3v13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Salvar foto do treino
          </button>

          {!confirmDel
            ? <button style={s.deleteBtn} onClick={()=>setConfirmDel(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Excluir treino
              </button>
            : <div style={s.confirmRow}>
                <span style={{fontSize:'13px',color:'var(--text2)'}}>Tem certeza?</span>
                <button style={s.confirmYes} onClick={onDelete}>Excluir</button>
                <button style={s.confirmNo} onClick={()=>setConfirmDel(false)}>Cancelar</button>
              </div>
          }
        </div>
      )}
    </div>
  )
}

function QS({label,value,color}){
  return (
    <div style={{flex:1,textAlign:'center'}}>
      <div style={{fontFamily:'var(--font-mono)',fontSize:'13px',color:color||'var(--text)',fontWeight:500}}>{value}</div>
      <div style={{fontSize:'10px',color:'var(--text3)',marginTop:'2px'}}>{label}</div>
    </div>
  )
}

function EvolutionTab({workouts, history}){
  // Distance evolution chart (last 10 workouts)
  const last10 = [...history].reverse().slice(-10)
  const maxDist = Math.max(...last10.map(w=>w.distKm||0),1)

  return (
    <div>
      {/* Distance chart */}
      <div style={ev.card}>
        <p style={ev.label}>Distância por treino (últimos 10)</p>
        <div style={ev.chart}>
          {last10.map((w,i)=>{
            const pct=(w.distKm||0)/maxDist*100
            const date=new Date(w.date)
            return (
              <div key={i} style={ev.barCol}>
                <div style={{...ev.barWrap}}>
                  <div style={{...ev.bar,height:pct+'%',animationDelay:`${i*0.06}s`}}/>
                </div>
                <span style={ev.barLabel}>{date.getDate()}/{date.getMonth()+1}</span>
                <span style={ev.barVal}>{(w.distKm||0).toFixed(1)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pace evolution */}
      {last10.filter(w=>w.avgPace).length>1 && (
        <div style={ev.card}>
          <p style={ev.label}>Evolução de pace</p>
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            {[...last10].filter(w=>w.avgPace).reverse().slice(0,6).map((w,i)=>{
              const pace=w.avgPace||10
              const best=Math.min(...last10.filter(x=>x.avgPace).map(x=>x.avgPace))
              const pct=Math.min(100,Math.round((best/pace)*100))
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text3)',width:40}}>{new Date(w.date).toLocaleDateString('pt-BR',{day:'numeric',month:'short'})}</span>
                  <div style={{flex:1,height:6,background:'var(--bg4)',borderRadius:99,overflow:'hidden'}}>
                    <div style={{height:'100%',width:pct+'%',background:pct>90?'var(--green)':'var(--blue)',borderRadius:99,animation:'growBar 0.6s ease both',animationDelay:`${i*0.1}s`,transformOrigin:'left'}}/>
                  </div>
                  <span style={{fontFamily:'var(--font-mono)',fontSize:'11px',color:'var(--text2)',width:36}}>{fmtPace(pace)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Photo evolution */}
      {workouts.length>0 ? (
        <div style={ev.card}>
          <p style={ev.label}>Fotos da evolução</p>
          <div style={ev.photoGrid}>
            {workouts.slice(0,8).map((w,i)=>{
              const src=w.photoStart||w.photoEnd
              const date=new Date(w.date)
              return (
                <div key={i} style={ev.photoItem}>
                  <img src={src} alt="" style={ev.photoImg}/>
                  <div style={ev.photoMeta}>
                    <span style={ev.photoDate}>{date.toLocaleDateString('pt-BR',{day:'numeric',month:'short'})}</span>
                    <span style={ev.photoDist}>{(w.distKm||0).toFixed(1)}km</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={ev.emptyPhotos}>
          <span style={{fontSize:'32px'}}>📷</span>
          <p style={{color:'var(--text2)',fontSize:'14px',marginTop:'8px'}}>Adicione fotos nos seus treinos</p>
          <p style={{color:'var(--text3)',fontSize:'12px',marginTop:'4px'}}>Elas aparecerão aqui como evolução</p>
        </div>
      )}
    </div>
  )
}

const ev={
  card:{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'16px',marginBottom:'14px' },
  label:{ fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text3)',letterSpacing:'1px',textTransform:'uppercase',marginBottom:'14px' },
  chart:{ display:'flex',alignItems:'flex-end',gap:'6px',height:'100px' },
  barCol:{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',height:'100%' },
  barWrap:{ flex:1,width:'100%',display:'flex',alignItems:'flex-end' },
  bar:{ width:'100%',background:'var(--green)',borderRadius:'4px 4px 0 0',minHeight:2,animation:'fadeUp 0.5s ease both',transformOrigin:'bottom' },
  barLabel:{ fontSize:'9px',color:'var(--text3)',fontFamily:'var(--font-mono)' },
  barVal:{ fontSize:'9px',color:'var(--green)',fontFamily:'var(--font-mono)' },
  photoGrid:{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px' },
  photoItem:{ position:'relative',borderRadius:10,overflow:'hidden' },
  photoImg:{ width:'100%',aspectRatio:'1',objectFit:'cover',display:'block' },
  photoMeta:{ position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,0.7))',padding:'20px 8px 6px',display:'flex',justifyContent:'space-between',alignItems:'flex-end' },
  photoDate:{ fontSize:'10px',color:'rgba(255,255,255,0.8)',fontFamily:'var(--font-mono)' },
  photoDist:{ fontSize:'11px',color:'var(--green)',fontFamily:'var(--font-mono)',fontWeight:500 },
  emptyPhotos:{ textAlign:'center',padding:'40px 0' },
}

const s={
  root:{ minHeight:'100dvh',background:'var(--bg)' },
  header:{ display:'flex',justifyContent:'space-between',alignItems:'flex-end',padding:'56px 20px 12px',background:'linear-gradient(180deg,var(--bg2),var(--bg))' },
  sup:{ fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text3)',letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:'4px' },
  title:{ fontSize:'28px',fontWeight:700,letterSpacing:'-0.5px',fontFamily:'var(--font-display)' },
  clearBtn:{ background:'transparent',border:'1px solid rgba(255,82,82,0.3)',borderRadius:8,color:'var(--red)',fontSize:'12px',fontFamily:'var(--font-mono)',padding:'7px 12px' },
  strip:{ display:'flex',alignItems:'center',margin:'0 16px 0',padding:'14px 8px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius)' },
  div:{ width:1,height:28,background:'var(--border)',flexShrink:0 },
  tabRow:{ display:'flex',gap:'0',padding:'0 16px',borderBottom:'1px solid var(--border)',marginTop:'12px' },
  tabBtn:{ flex:1,padding:'10px 0',fontSize:'13px',fontFamily:'var(--font-mono)',background:'none',border:'none',borderBottom:'2px solid transparent',transition:'all 0.2s',letterSpacing:'0.3px' },
  scroll:{ padding:'14px 16px 0' },
  card:{ background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:'var(--radius)',marginBottom:'10px',overflow:'hidden',animation:'fadeUp 0.35s ease both' },
  cardRow:{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',cursor:'pointer' },
  cardLeft:{ display:'flex',alignItems:'center',gap:'12px' },
  dateBadge:{ width:40,height:44,background:'var(--bg3)',borderRadius:10,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0 },
  dateDay:{ fontFamily:'var(--font-mono)',fontSize:'16px',fontWeight:500,color:'var(--text)',lineHeight:1 },
  dateMon:{ fontSize:'10px',color:'var(--text3)',marginTop:'2px',letterSpacing:'0.5px' },
  cardDate:{ fontSize:'12px',color:'var(--text3)',fontFamily:'var(--font-mono)',textTransform:'capitalize',marginBottom:'2px' },
  cardDist:{ fontSize:'22px',fontWeight:700,letterSpacing:'-0.5px',color:'var(--text)' },
  distUnit:{ fontSize:'14px',color:'var(--text2)',fontWeight:400 },
  quickStats:{ display:'flex',borderTop:'1px solid var(--border)',padding:'10px 8px' },
  expanded:{ borderTop:'1px solid var(--border)',padding:'12px',display:'flex',flexDirection:'column',gap:'8px' },
  photoRow:{ display:'flex',gap:'8px' },
  photoWrap:{ flex:1,position:'relative' },
  photo:{ width:'100%',borderRadius:10,objectFit:'cover',aspectRatio:'4/3',display:'block' },
  photoLabel:{ position:'absolute',bottom:6,left:8,fontSize:'10px',color:'#fff',fontFamily:'var(--font-mono)',background:'rgba(0,0,0,0.5)',padding:'2px 6px',borderRadius:4 },
  routeImg:{ width:'100%',borderRadius:10,display:'block' },
  savePhotoBtn:{ display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',padding:'11px',background:'var(--green-dim)',color:'var(--green)',border:'1px solid rgba(181,242,61,0.2)',borderRadius:10,fontFamily:'var(--font-mono)',fontSize:'13px',fontWeight:500 },
  deleteBtn:{ display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',padding:'10px',background:'rgba(255,82,82,0.08)',color:'var(--red)',border:'1px solid rgba(255,82,82,0.18)',borderRadius:10,fontFamily:'var(--font-mono)',fontSize:'12px' },
  confirmRow:{ display:'flex',alignItems:'center',gap:'8px',padding:'4px 0' },
  confirmYes:{ padding:'8px 14px',background:'var(--red)',color:'#fff',border:'none',borderRadius:8,fontSize:'12px',fontFamily:'var(--font-mono)',fontWeight:500 },
  confirmNo:{ padding:'8px 14px',background:'var(--bg3)',color:'var(--text2)',border:'1px solid var(--border)',borderRadius:8,fontSize:'12px',fontFamily:'var(--font-mono)' },
  empty:{ padding:'64px 0',display:'flex',flexDirection:'column',alignItems:'center',gap:'12px',textAlign:'center' },
  emptyRing:{ width:64,height:64,borderRadius:'50%',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'4px' },
  emptyTitle:{ fontSize:'16px',fontWeight:600,color:'var(--text2)' },
  emptySub:{ fontSize:'13px',color:'var(--text3)',maxWidth:240,lineHeight:1.6 },
  emptyBtn:{ marginTop:'8px',padding:'12px 24px',borderRadius:12,background:'var(--green)',color:'#000',fontFamily:'var(--font-display)',fontWeight:700,fontSize:'14px',border:'none' },
}

const m={
  overlay:{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(10px)',zIndex:200,display:'flex',alignItems:'flex-end' },
  sheet:{ width:'100%',background:'var(--bg2)',borderRadius:'20px 20px 0 0',padding:'20px 20px 36px',display:'flex',flexDirection:'column',gap:'10px',animation:'slideUp 0.25s ease both',maxHeight:'90dvh',overflowY:'auto' },
  handle:{ width:40,height:4,borderRadius:99,background:'var(--border2)',margin:'0 auto 6px',flexShrink:0 },
  title:{ fontFamily:'var(--font-display)',fontSize:'18px',fontWeight:700,textAlign:'center',color:'var(--text)' },
  label:{ fontFamily:'var(--font-mono)',fontSize:'10px',color:'var(--text3)',letterSpacing:'1.5px',textTransform:'uppercase',marginTop:'4px' },
  optRow:{ display:'flex',gap:'8px' },
  fmtRow:{ display:'flex',gap:'8px' },
  fmtBtn:{ flex:1,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 6px',textAlign:'center',transition:'all 0.15s' },
  fmtActive:{ border:'1px solid var(--green)',background:'var(--green-dim)' },
  fmtName:{ fontFamily:'var(--font-mono)',fontSize:'14px',fontWeight:600,color:'var(--text)',marginBottom:3 },
  fmtSub:{ fontSize:'10px',color:'var(--text3)' },
  preview:{ width:'100%',borderRadius:12,objectFit:'contain',maxHeight:200,display:'block' },
  previewBtn:{ flex:1,padding:'13px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:12,color:'var(--text)',fontFamily:'var(--font-mono)',fontSize:'13px',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px' },
  saveBtn:{ padding:'14px',background:'var(--green)',color:'#000',fontFamily:'var(--font-display)',fontWeight:700,fontSize:'15px',border:'none',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',gap:'6px' },
  cancelBtn:{ padding:'12px',background:'transparent',color:'var(--text3)',border:'none',fontFamily:'var(--font-mono)',fontSize:'13px',textAlign:'center' },
  spinner:{ width:18,height:18,border:'2px solid rgba(0,0,0,0.3)',borderTop:'2px solid #000',borderRadius:'50%',display:'inline-block',animation:'spin 0.7s linear infinite' },
}
