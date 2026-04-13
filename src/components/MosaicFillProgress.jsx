import { useId } from 'react'
import { useMosaic } from '../context/MosaicContext.jsx'

function FillRing({ percent }) {
  const gid = useId().replace(/:/g, '')
  const gradId = `ringGrad-${gid}`
  const r = 36
  const stroke = 5
  const norm = 2 * Math.PI * r
  const dash = (percent / 100) * norm

  return (
    <div className="fill-ring" aria-label={`Mosaïque remplie à ${percent} pour cent`}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={stroke}
        />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${norm}`}
          transform="rotate(-90 44 44)"
          className="fill-ring__arc"
        />
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="45%" stopColor="#c026d3" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
        </defs>
      </svg>
      <span className="fill-ring__value">{percent}%</span>
    </div>
  )
}

export function MosaicFillProgress() {
  const { gridFillPercent } = useMosaic()

  return (
    <div className="mosaic-fill-progress" aria-live="polite">
      <FillRing percent={gridFillPercent} />
      <div className="fill-progress-copy">
        <p className="fill-progress-copy__label">Progression</p>
        <p className="fill-caption">
          Part de la grille déjà couverte par tout le monde. Merci !
        </p>
      </div>
    </div>
  )
}
