import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMosaic } from '../context/MosaicContext.jsx'
import { useStageLayout } from '../context/StageLayoutContext.jsx'
import { cellsFromGeometryClipped } from '../utils/grid.js'

const PRICE_PER_CELL_EUR = 0.4

function formatEur(n) {
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function LayerImagePanel() {
  const navigate = useNavigate()
  const {
    contributions,
    savedContributions,
    cellWidth,
    cellHeight,
    loading,
    selectedPremiumId,
    persistDraftsToSupabase,
    savingDrafts,
    draftCount,
    supabaseReady,
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

  const totalAmountEur = totalCells * PRICE_PER_CELL_EUR

  const handleSaveAndParticipate = async () => {
    if (!selectedContribution || totalCells <= 0) return
    try {
      if (supabaseReady && draftCount > 0) {
        await persistDraftsToSupabase()
      }
      navigate(`/summary/${selectedContribution.id}`, {
        state: { displayAmountEuros: totalAmountEur },
      })
    } catch {
      /* configWarning géré par le contexte */
    }
  }

  const saveDisabled =
    !selectedContribution ||
    savingDrafts ||
    (draftCount > 0 && !supabaseReady)

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
            Vous voudrez participer d'un montant de
          </p>
          <div className="layer-panel__amount-display">
            <span className="layer-panel__amount-number layer-panel__amount-number--live">
              {formatEur(totalAmountEur)}
            </span>
            <span className="layer-panel__amount-unit">EUR</span>
          </div>
          <button
            type="button"
            className="layer-panel__cta"
            disabled={saveDisabled}
            onClick={handleSaveAndParticipate}
          >
            <span className="layer-panel__cta-label">
              {savingDrafts ? 'Enregistrement…' : 'Sauvegarder & Participer'}
            </span>
            {!savingDrafts && (
              <span className="layer-panel__cta-icon" aria-hidden="true">
                →
              </span>
            )}
          </button>
        </div>
      )}
    </aside>
  )
}
