import { useRef } from 'react'
import { CanvasStage } from '../components/CanvasStage.jsx'
import { useStageLayout } from '../context/StageLayoutContext.jsx'
import { clampToStage, snapContributionRect } from '../utils/grid.js'
import { CountdownBanner } from '../components/CountdownBanner.jsx'
import { Header } from '../components/Header.jsx'
import { MosaicDownloadButton } from '../components/MosaicDownloadButton.jsx'
import { MosaicFillProgress } from '../components/MosaicFillProgress.jsx'
import { LayerImagePanel } from '../components/LayerImagePanel.jsx'
import { useMosaic } from '../context/MosaicContext.jsx'

export function HomePage() {
  const { addDraftContribution, setSelectedPremiumId, configWarning } = useMosaic()
  const { stageWidth, stageHeight, cellWidth, cellHeight } = useStageLayout()
  const quickInputRef = useRef(null)

  const loadImageSize = (file) =>
    new Promise((resolve, reject) => {
      const img = new window.Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
        URL.revokeObjectURL(url)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("Impossible de lire l'image"))
      }
      img.src = url
    })

  const handleQuickPick = () => {
    quickInputRef.current?.click()
  }

  const onQuickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const { width: iw, height: ih } = await loadImageSize(file)
      const ratio = iw > 0 && ih > 0 ? iw / ih : 1

      let width = Math.min(stageWidth * 0.34, cellWidth * 14)
      let height = width / Math.max(0.1, ratio)
      const maxH = stageHeight * 0.45
      if (height > maxH) {
        height = maxH
        width = height * ratio
      }

      const snapped = {
        width: Math.max(cellWidth * 4, Math.round(width / cellWidth) * cellWidth),
        height: Math.max(
          cellHeight * 4,
          Math.round(height / cellHeight) * cellHeight,
        ),
      }

      const rawX = (stageWidth - snapped.width) / 2
      const rawY = (stageHeight - snapped.height) / 2
      const aligned = snapContributionRect(
        rawX,
        rawY,
        snapped.width,
        snapped.height,
        cellWidth,
        cellHeight,
      )
      const pos = clampToStage(
        aligned.x,
        aligned.y,
        aligned.width,
        aligned.height,
        stageWidth,
        stageHeight,
      )

      const contribution = await addDraftContribution({
        imageBlob: file,
        layer: 1,
        maskType: 'rect',
        cellSpan: 1,
        priceEuros: 1,
        contributorName: null,
        contributorEmail: null,
        x: pos.x,
        y: pos.y,
        width: aligned.width,
        height: aligned.height,
        rotation: 0,
      })
      setSelectedPremiumId(contribution.id)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="home-page">
      <div className="app-shell">
        <Header />
        {configWarning && (
          <div className="banner banner-warn">{configWarning}</div>
        )}

        <main className="hero-main">
          <div className="home-editor-stack">
            <div className="cta-row cta-row--single home-cta-photo">
              <button
                type="button"
                className="btn-cta btn-cta--add-photo"
                onClick={handleQuickPick}
              >
                <span className="btn-cta__add-icon" aria-hidden="true">
                  📷
                </span>
                <span className="btn-cta__label">Ajouter une photo</span>
              </button>
            </div>
            <div className="editor-layout">
              <div className="hero-canvas-wrap">
                <CanvasStage />
              </div>
              <LayerImagePanel />
            </div>
          </div>
          <MosaicFillProgress />
          <MosaicDownloadButton />
          <input
            ref={quickInputRef}
            type="file"
            accept="image/*"
            onChange={onQuickFile}
            style={{ display: 'none' }}
          />
        </main>
      </div>

      <CountdownBanner />
    </div>
  )
}
