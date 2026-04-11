import {
  FALLBACK_CELL_SIZE,
  FLAP_CORNER_ROWS_EACH,
  GRID_COLS,
  GRID_FLAP_COLS,
  GRID_ROWS,
} from '../constants.js'
import { countFolioMosaicCells } from './folioCellCount.js'

/** Toutes les cases du rectangle englobant — **2610** (= `GRID_RECT_CELL_COUNT` dans constants). */
export const RECT_GRID_CELLS = GRID_COLS * GRID_ROWS

/**
 * Carreaux sur la matière folio (trous exclus). Pour l’affichage texte « 2500 », voir
 * `GRID_TEXT_CELL_COUNT` ; le % de remplissage utilise `RECT_GRID_CELLS` (2610).
 */
export const TOTAL_GRID_CELLS = countFolioMosaicCells({
  gridCols: GRID_COLS,
  gridRows: GRID_ROWS,
  flapCols: GRID_FLAP_COLS,
  flapCornerRowsEach: FLAP_CORNER_ROWS_EACH,
})

/**
 * Carreau par indices ; `cellW` / `cellH` = taille d’un carreau en px (stage = gabarit).
 */
export function getCellByIndices(col, row, cellW, cellH) {
  const cw = cellW ?? FALLBACK_CELL_SIZE
  const ch = cellH ?? FALLBACK_CELL_SIZE
  if (
    col < 0 ||
    col >= GRID_COLS ||
    row < 0 ||
    row >= GRID_ROWS
  ) {
    return null
  }
  const x = col * cw
  const y = row * ch
  return {
    col,
    row,
    x,
    y,
    width: cw,
    height: ch,
    cx: x + cw / 2,
    cy: y + ch / 2,
  }
}

export function pixelToCellIndices(x, y, cellW, cellH) {
  const cw = cellW ?? FALLBACK_CELL_SIZE
  const ch = cellH ?? FALLBACK_CELL_SIZE
  return {
    col: Math.floor(x / cw),
    row: Math.floor(y / ch),
  }
}

export function forEachCell(callback, cellW, cellH) {
  const cw = cellW ?? FALLBACK_CELL_SIZE
  const ch = cellH ?? FALLBACK_CELL_SIZE
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      callback(getCellByIndices(col, row, cw, ch), col, row)
    }
  }
}
