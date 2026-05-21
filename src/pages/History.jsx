import BottomNav from '../components/BottomNav'

const runs=[1,2,3,4]

export default function History(){
 return <div className='screen'>
 <div className='history-header'>
  <h1>Histórico</h1>
  <input placeholder='Buscar corrida'/>
 </div>

 {runs.map((r)=><div key={r} className='history-card'>
  <div className='history-map'></div>
  <div>
   <h3>5.{r} km</h3>
   <p>pace 5'0{r} • 28 min</p>
   <span className='muted'>18 Maio • 18:3{r}</span>
  </div>
 </div>)}

 <BottomNav/>
 </div>
}
