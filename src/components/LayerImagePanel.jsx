import { useLayoutEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMosaic } from '../context/MosaicContext.jsx'
import { useStageLayout } from '../context/StageLayoutContext.jsx'
import { PARTICIPATION_PRICE_PER_CELL_EUR } from '../constants.js'
import { cellsFromGeometryClipped } from '../utils/grid.js'
const MIN_PARTICIPATION_EUR = 0.01

function formatEur(n) {
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function LayerImagePanel() {
  const navigate = useNavigate()
  const [amountInput, setAmountInput] = useState('')
  const {
    contributions,
    savedContributions,
    cellWidth,
    cellHeight,
    loading,
    selectedPremiumId,
    setSelectedPremiumId,
    bringDraftToFront,
  } = useMosaic()
  const { stageWidth, stageHeight } = useStageLayout()

  /** Panneau latéral : uniquement les brouillons ; le canevas affiche aussi les contributions en base. */
  const draftsOnly = useMemo(
    () => contributions.filter((c) => c.isDraft === true),
    [contributions],
  )

  const sorted = useMemo(() => {
    return [...draftsOnly].sort((a, b) => {
      if (a.layer !== b.layer) return a.layer - b.layer
      return (a.createdAt || '').localeCompare(b.createdAt || '')
    })
  }, [draftsOnly])

  const totalCells = useMemo(() => {
    return sorted.reduce((sum, c) => {
      const { cells } = cellsFromGeometryClipped(
        c,
        cellWidth,
        cellHeight,
        stageWidth,
        stageHeight,
      )
      return sum + cells
    }, 0)
  }, [sorted, cellWidth, cellHeight, stageWidth, stageHeight])

  const selectedContribution = useMemo(() => {
    if (sorted.length === 0) return null
    const match = sorted.find((c) => c.id === selectedPremiumId)
    return match ?? sorted[0]
  }, [sorted, selectedPremiumId])

  const suggestedAmountEur = totalCells * PARTICIPATION_PRICE_PER_CELL_EUR

  useLayoutEffect(() => {
    if (totalCells > 0) {
      setAmountInput(suggestedAmountEur.toFixed(2))
    }
  }, [totalCells, suggestedAmountEur])

  const parsedAmount = parseFloat(
    String(amountInput).trim().replace(',', '.'),
  )
  const amountValid =
    Number.isFinite(parsedAmount) && parsedAmount >= MIN_PARTICIPATION_EUR

  const handleSaveAndParticipate = () => {
    if (!selectedContribution || totalCells <= 0 || !amountValid) return
    const rounded = Math.round(parsedAmount * 100) / 100
    navigate(`/summary/${selectedContribution.id}`, {
      state: { displayAmountEuros: rounded },
    })
  }

  const saveDisabled = !selectedContribution || !amountValid

  return (
    <aside className="layer-panel" aria-label="Brouillons à enregistrer">
      <div className="layer-panel__head">
        <h3 className="layer-panel__title">Brouillons</h3>
      </div>
      {loading && sorted.length === 0 ? (
        <p className="layer-panel__empty muted">Chargement…</p>
      ) : sorted.length === 0 ? (
        <p className="layer-panel__empty muted">
          {savedContributions.length > 0
            ? 'Aucun brouillon. Les contributions déjà enregistrées sont visibles sur la mosaïque uniquement.'
            : 'Aucune image pour l’instant.'}
        </p>
      ) : (
        <ul className="layer-panel__list">
          {sorted.map((c) => {
            const { cols, rows, cells } = cellsFromGeometryClipped(
              c,
              cellWidth,
              cellHeight,
              stageWidth,
              stageHeight,
            )
            const isSelected = c.id === selectedPremiumId
            return (
              <li
                key={c.id}
                className={
                  isSelected
                    ? 'layer-panel__item layer-panel__item--selected'
                    : 'layer-panel__item'
                }
                role="button"
                tabIndex={0}
                onClick={() => {
                  bringDraftToFront(c.id)
                  setSelectedPremiumId(c.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    bringDraftToFront(c.id)
                    setSelectedPremiumId(c.id)
                  }
                }}
              >
                <div className="layer-panel__thumb">
                  <img src={c.imageUrl} alt="" />
                </div>
                <div className="layer-panel__meta">
                  <span className="layer-panel__layer">Layer {c.layer}</span>
                  <span className="layer-panel__cells">
                    <strong>{cells}</strong> cellule{cells === 1 ? '' : 's'}
                    {cols > 0 && rows > 0 && cols * rows !== cells && (
                      <span className="muted"> · boîte {cols}×{rows}</span>
                    )}
                    {cols > 0 && rows > 0 && cols * rows === cells && (
                      <span className="muted"> ({cols}×{rows})</span>
                    )}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <div
        className={
          totalCells > 0
            ? 'layer-panel__total-pill layer-panel__total-pill--active'
            : 'layer-panel__total-pill'
        }
      >
        <span className="layer-panel__total-label">Total cellules</span>
        <span className="layer-panel__total-value">{totalCells}</span>
      </div>
      {totalCells > 0 && (
        <div className="layer-panel__payment layer-panel__payment--ready">
          <p className="layer-panel__amount-intro">
            Montant conseillé selon le nombre de cellules prises :{' '}
            <strong>{formatEur(suggestedAmountEur)}</strong>
          </p>
          <label className="layer-panel__amount-field">
            <span className="layer-panel__amount-field-label">
              Tu peux modifier le montant avant de continuer
            </span>
            <div className="layer-panel__amount-input-row">
              <input
                id="layer-panel-participation-amount"
                className="layer-panel__amount-input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                aria-invalid={!amountValid}
                aria-label="Montant de participation en euros"
              />
              <span className="layer-panel__amount-unit">EUR</span>
            </div>
          </label>
          {!amountValid && (
            <p className="layer-panel__amount-error" role="alert">
              Indique un montant d’au moins {formatEur(MIN_PARTICIPATION_EUR)}.
            </p>
          )}
          <button
            type="button"
            className="layer-panel__cta"
            disabled={saveDisabled}
            onClick={handleSaveAndParticipate}
          >
            <span className="layer-panel__cta-label">Sauvegarder & Participer</span>
            <span className="layer-panel__cta-icon" aria-hidden="true">
              →
            </span>
          </button>
        </div>
      )}
    </aside>
  )
}
