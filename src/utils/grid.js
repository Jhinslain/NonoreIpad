export function snapToGrid(value, cellSize) {
  return Math.round(value / cellSize) * cellSize
}

export function snapPosition(x, y, cellW, cellH) {
  return {
    x: snapToGrid(x, cellW),
    y: snapToGrid(y, cellH),
  }
}

/**
 * Aligne le rectangle d’une contribution sur la grille (indices de cellules entiers)
 * et stabilise les flottants pour limiter les écarts visibles entre images adjacentes.
 */
export function snapContributionRect(x, y, width, height, cellW, cellH) {
  const cw = Math.max(cellW, 1e-9)
  const ch = Math.max(cellH, 1e-9)
  const col = Math.round(x / cw)
  const row = Math.round(y / ch)
  const cols = Math.max(2, Math.round(width / cw))
  const rows = Math.max(2, Math.round(height / ch))
  const round6 = (n) => Math.round(n * 1e6) / 1e6
  return {
    x: round6(col * cw),
    y: round6(row * ch),
    width: round6(cols * cw),
    height: round6(rows * ch),
  }
}

/** Taille du bloc Layer 1 en pixels (1, 4 ou 9 cellules). */
export function layer1Dimensions(cellSpanKey, cellW, cellH) {
  const n = cellSpanKey === 9 ? 3 : cellSpanKey === 4 ? 2 : 1
  return {
    width: n * cellW,
    height: n * cellH,
  }
}

export function clampToStage(x, y, width, height, stageW, stageH) {
  const maxX = Math.max(0, stageW - width)
  const maxY = Math.max(0, stageH - height)
  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(0, y), maxY),
  }
}

/** Cellules selon la forme (masque), le gabarit et la rotation — voir `maskCellCount.js`. */
export { cellsFromGeometryClipped } from './maskCellCount.js'

export function centeredLayer1Position(
  width,
  height,
  stageW,
  stageH,
  cellW,
  cellH,
) {
  const rawX = (stageW - width) / 2
  const rawY = (stageH - height) / 2
  const snapped = snapPosition(rawX, rawY, cellW, cellH)
  return clampToStage(snapped.x, snapped.y, width, height, stageW, stageH)
}
