import { Link } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

export default function Home(){
 return <div className='screen'>
  <div className='hero'>
   <div>
    <p className='muted'>RUN TRACKER</p>
    <h1>Treine como um atleta.</h1>
    <p className='subtitle'>Mapa em tempo real, trilha dinâmica e compartilhamento automático.</p>
   </div>
   <Link to='/run' className='primary-btn'>Iniciar corrida</Link>
  </div>

  <div className='stats-grid'>
   <div className='card'><span>Distância</span><h2>42.7 km</h2></div>
   <div className='card'><span>Pace médio</span><h2>5'11</h2></div>
   <div className='card'><span>Corridas</span><h2>18</h2></div>
   <div className='card'><span>Tempo</span><h2>12h</h2></div>
  </div>

  <div className='big-card'>
   <div className='route-preview'></div>
   <div className='route-content'>
    <h3>Última corrida</h3>
    <p>5.2 km • pace 5'01 • ontem</p>
   </div>
  </div>

  <BottomNav/>
 </div>
}
