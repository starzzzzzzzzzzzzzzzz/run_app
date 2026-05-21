import { Link, useLocation } from 'react-router-dom'

export default function BottomNav(){
 const loc=useLocation()
 return <div className='bottom-nav'>
  <Link className={loc.pathname==='/'?'active':''} to='/'>Home</Link>
  <Link className={loc.pathname==='/run'?'active':''} to='/run'>Run</Link>
  <Link className={loc.pathname==='/history'?'active':''} to='/history'>Histórico</Link>
 </div>
}
