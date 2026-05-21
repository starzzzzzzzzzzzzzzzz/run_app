import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Execute from './pages/Execute'
import History from './pages/History'
import './index.css'

export default function App(){
 return <BrowserRouter>
 <Routes>
 <Route path='/' element={<Home/>}/>
 <Route path='/run' element={<Execute/>}/>
 <Route path='/history' element={<History/>}/>
 </Routes>
 </BrowserRouter>
}
