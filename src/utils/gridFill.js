import { GRID_RECT_CELL_COUNT, GRID_TEXT_CELL_COUNT } from '../constants.js'
import { cellsFromGeometryClipped } from './grid.js'

export function estimateContributionCells(c, cellW, cellH, stageW, stageH) {
  return cellsFromGeometryClipped(c, cellW, cellH, stageW, stageH).cells
}

/**
 * % de remplissage : `filled / GRID_RECT_CELL_COUNT` (2610 cases rectangle).
 * `total` renvoyé pour l’UI : `GRID_TEXT_CELL_COUNT` (2500), chiffre affiché dans les textes.
 */
export function computeGridFillStats(contributions, cellW, cellH, stageW, stageH) {
  const filled = contributions.reduce(
    (s, c) => s + estimateContributionCells(c, cellW, cellH, stageW, stageH),
    0,
  )
  const pct = Math.min(
    100,
    Math.round((filled / GRID_RECT_CELL_COUNT) * 100),
  )
  return { filled, pct, total: GRID_TEXT_CELL_COUNT }
}
