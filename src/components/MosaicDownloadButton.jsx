import { useState } from 'react'
import { useMosaic } from '../context/MosaicContext.jsx'
import { useStageLayout } from '../context/StageLayoutContext.jsx'
import {
  renderMosaicToPngBlob,
  suggestMosaicFilename,
} from '../utils/exportMosaicImage.js'

export function MosaicDownloadButton() {
  const { contributions, loading } = useMosaic()
  const { stageWidth, stageHeight, hasTemplateMetrics } = useStageLayout()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const disabled =
    loading ||
    !hasTemplateMetrics ||
    busy ||
    stageWidth < 16 ||
    contributions.length === 0

  const handleDownload = async () => {
    if (disabled) return
    setBusy(true)
    setError(null)
    try {
      const blob = await renderMosaicToPngBlob({
        stageWidth,
        stageHeight,
        contributions,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = suggestMosaicFilename()
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(
        e?.message ||
          'Impossible de générer l’image. Vérifiez la connexion ou les photos hébergées (CORS).',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mosaic-download">
      <button
        type="button"
        className="btn btn-ghost mosaic-download__btn"
        disabled={disabled}
        title="PNG : uniquement les photos, fond transparent (silhouette coque)"
        onClick={handleDownload}
      >
        {busy ? 'Génération…' : 'Télécharger les photos'}
      </button>
      {error && <p className="mosaic-download__err">{error}</p>}
    </div>
  )
}
