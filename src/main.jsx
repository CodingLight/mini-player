import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 应用入口：把 <App /> 挂载到 #root 节点
// StrictMode 会触发额外的副作用检查，仅在开发模式生效
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)