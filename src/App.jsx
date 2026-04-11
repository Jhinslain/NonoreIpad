import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { FestiveBackground } from './components/FestiveBackground.jsx'
import { MosaicProvider } from './context/MosaicContext.jsx'
import { StageLayoutProvider } from './context/StageLayoutContext.jsx'
import { HomePage } from './pages/HomePage.jsx'
import { SummaryPage } from './pages/SummaryPage.jsx'

export default function App() {
  return (
    <>
      <FestiveBackground />
      <StageLayoutProvider>
        <MosaicProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/summary/:id" element={<SummaryPage />} />
            </Routes>
          </BrowserRouter>
        </MosaicProvider>
      </StageLayoutProvider>
    </>
  )
}
