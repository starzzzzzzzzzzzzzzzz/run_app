import { useEffect, useState } from 'react'
import BottomNav from '../components/BottomNav'

export default function Execute(){
 const [coords,setCoords]=useState([])
 const [location,setLocation]=useState('Obtendo localização...')
 const [finished,setFinished]=useState(false)

 useEffect(()=>{
  navigator.geolocation?.watchPosition((pos)=>{
   setLocation(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`)
   setCoords(prev=>[...prev,{x:Math.random()*90,y:Math.random()*120}])
  },()=>setLocation('Permita o acesso ao GPS'),{enableHighAccuracy:true})
 },[])

 return <div className='screen'>
  <div className='map-card'>
   <div className='map-toolbar'>
    <button>+</button>
    <button>-</button>
    <button>◎</button>
   </div>

   <svg viewBox='0 0 100 140' className='fake-map'>
    <path d={coords.map((p,i)=>`${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ')} />
   </svg>
  </div>

  <div className='run-stats'>
   <div className='card'><span>Tempo</span><h2>00:24:11</h2></div>
   <div className='card'><span>Distância</span><h2>4.9 km</h2></div>
   <div className='card'><span>Pace</span><h2>4'58</h2></div>
  </div>

  <div className='big-card'>
   <p className='muted'>{location}</p>
   <button className='primary-btn' onClick={()=>setFinished(true)}>Finalizar corrida</button>
  </div>

  {finished && <div className='share-modal'>
   <div className='share-card'>
    <h2>Foto pronta</h2>
    <div className='share-preview'></div>
    <div className='share-actions'>
      <button className='primary-btn'>Salvar PNG</button>
      <button className='secondary-btn'>Compartilhar</button>
    </div>
   </div>
  </div>}

  <BottomNav/>
 </div>
}
