import { GRID_COLS, GRID_ROWS } from '../constants.js'
import { createMaskHitTester } from './masks.js'

/**
 * Boîte englobante axe-alignée du rectangle local (0,w)×(0,h) après rotation
 * (même convention que Konva : rotation en °, origine coin haut-gauche du groupe).
 */
function stageBoundsForRotatedRect(x, y, w, h, rotDeg) {
  const rad = (rotDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const corners = [
    { lx: 0, ly: 0 },
    { lx: w, ly: 0 },
    { lx: w, ly: h },
    { lx: 0, ly: h },
  ]
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const { lx, ly } of corners) {
    const wx = x + lx * cos - ly * sin
    const wy = y + lx * sin + ly * cos
    minX = Math.min(minX, wx)
    maxX = Math.max(maxX, wx)
    minY = Math.min(minY, wy)
    maxY = Math.max(maxY, wy)
  }
  return { minX, minY, maxX, maxY }
}

/** Stage → repère local du groupe (inverse de la rotation Konva). */
function stageToLocal(sx, sy, x, y, rotDeg) {
  const rad = (rotDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = sx - x
  const dy = sy - y
  const lx = dx * cos + dy * sin
  const ly = -dx * sin + dy * cos
  return { lx, ly }
}

/**
 * Carreaux dont le centre tombe dans la forme (masque) et sur le gabarit.
 * Aligné sur le rendu Konva (clip + bord du stage).
 */
export function cellsFromGeometryClipped(c, cellW, cellH, stageW, stageH) {
  const x = c.x ?? 0
  const y = c.y ?? 0
  const w = c.width ?? 0
  const h = c.height ?? 0
  const rot = c.rotation ?? 0
  const maskType = c.maskType || 'rect'

  const cw = Math.max(1e-9, cellW)
  const ch = Math.max(1e-9, cellH)

  if (w <= 0 || h <= 0) {
    return { cols: 0, rows: 0, cells: 0 }
  }

  const hit = createMaskHitTester(w, h, maskType)

  const { minX, minY, maxX, maxY } = stageBoundsForRotatedRect(x, y, w, h, rot)
  const bx0 = Math.max(0, minX)
  const by0 = Math.max(0, minY)
  const bx1 = Math.min(stageW, maxX)
  const by1 = Math.min(stageH, maxY)

  if (bx1 <= bx0 || by1 <= by0) {
    return { cols: 0, rows: 0, cells: 0 }
  }

  let colMin = Math.max(0, Math.floor(bx0 / cw))
  let colMax = Math.min(GRID_COLS - 1, Math.ceil(bx1 / cw) - 1)
  let rowMin = Math.max(0, Math.floor(by0 / ch))
  let rowMax = Math.min(GRID_ROWS - 1, Math.ceil(by1 / ch) - 1)

  if (colMin > colMax || rowMin > rowMax) {
    return { cols: 0, rows: 0, cells: 0 }
  }

  let minCol = Infinity
  let maxCol = -Infinity
  let minRow = Infinity
  let maxRow = -Infinity
  let count = 0

  for (let col = colMin; col <= colMax; col++) {
    for (let row = rowMin; row <= rowMax; row++) {
      const sx = (col + 0.5) * cw
      const sy = (row + 0.5) * ch
      if (sx < 0 || sy < 0 || sx > stageW || sy > stageH) continue
      const { lx, ly } = stageToLocal(sx, sy, x, y, rot)
      if (hit(lx, ly)) {
        count++
        minCol = Math.min(minCol, col)
        maxCol = Math.max(maxCol, col)
        minRow = Math.min(minRow, row)
        maxRow = Math.max(maxRow, row)
      }
    }
  }

  if (count === 0) {
    return { cols: 0, rows: 0, cells: 0 }
  }

  return {
    cols: maxCol - minCol + 1,
    rows: maxRow - minRow + 1,
    cells: count,
  }
}
