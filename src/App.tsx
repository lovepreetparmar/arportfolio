import { useCallback, useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { CursorProvider } from './context/CursorContext'
import { CustomCursor } from './components/ui/CustomCursor'
import { Preloader } from './components/layout/Preloader'
import { HomePage } from './pages/HomePage'
import { ProjectPage } from './pages/ProjectPage'

function AppRoutes() {
  const location = useLocation()
  const isMap = location.pathname === '/'

  return (
    <>
      {!isMap && null}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomePage />} />
          <Route path="/work/:slug" element={<ProjectPage />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const onPreloaderComplete = useCallback(() => setReady(true), [])

  return (
    <BrowserRouter>
      <CursorProvider>
        {!ready && <Preloader onComplete={onPreloaderComplete} />}
        <CustomCursor />
        <div className={ready ? 'opacity-100' : 'opacity-0'}>
          <AppRoutes />
        </div>
      </CursorProvider>
    </BrowserRouter>
  )
}
