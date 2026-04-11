import {
  FLAP_CORNER_ROWS_EACH,
  GRID_COLS,
  GRID_FLAP_COLS,
  GRID_ROWS,
} from '../constants.js'

/**
 * Carreaux sur la matière : corps plein hauteur + bande rabat sans les
 * `flapCornerRowsEach` lignes en haut et en bas (trous d’angle).
 */
export function countFolioMosaicCells({
  gridCols,
  gridRows,
  flapCols,
  flapCornerRowsEach,
}) {
  const r0 = flapCornerRowsEach
  const r1 = gridRows - flapCornerRowsEach
  let n = 0
  for (let c = 0; c < gridCols; c++) {
    for (let r = 0; r < gridRows; r++) {
      if (c >= flapCols) {
        n++
        continue
      }
      if (r >= r0 && r < r1) n++
    }
  }
  return n
}

/** Comptages dériv.des constantes (objectif mosaïque, pas des px). */
export function getFolioMosaicStats() {
  const rectCells = GRID_COLS * GRID_ROWS
  const onCaseCells = countFolioMosaicCells({
    gridCols: GRID_COLS,
    gridRows: GRID_ROWS,
    flapCols: GRID_FLAP_COLS,
    flapCornerRowsEach: FLAP_CORNER_ROWS_EACH,
  })
  return {
    gridCols: GRID_COLS,
    gridRows: GRID_ROWS,
    flapCols: GRID_FLAP_COLS,
    cornerRowsEach: FLAP_CORNER_ROWS_EACH,
    rectCells,
    onCaseCells,
    holeCells: rectCells - onCaseCells,
  }
}

/**
 * Recherche grossière (cols, rows, rabat proportionnel) pour viser un nombre de cases utiles.
 */
export function findGridForFolioCellTarget(
  targetCount,
  {
    aspectWidth = 45,
    aspectHeight = 58,
    flapWidthFraction = 11 / 45,
    flapCornerRowsEach = 5,
    colsMin = 25,
    colsMax = 120,
    rowSlack = 25,
  } = {},
) {
  let best = null
  for (let cols = colsMin; cols <= colsMax; cols++) {
    const flapCols = Math.max(1, Math.round(cols * flapWidthFraction))
    const midRows = Math.round((cols * aspectHeight) / aspectWidth)
    for (let d = -rowSlack; d <= rowSlack; d++) {
      const rows = midRows + d
      if (rows < 8 || flapCornerRowsEach * 2 >= rows) continue
      const n = countFolioMosaicCells({
        gridCols: cols,
        gridRows: rows,
        flapCols,
        flapCornerRowsEach,
      })
      const err = Math.abs(n - targetCount)
      if (
        !best ||
        err < best.err ||
        (err === best.err && cols * rows < best.cols * best.rows)
      ) {
        best = { cols, rows, flapCols, count: n, err }
      }
    }
  }
  return best
}
