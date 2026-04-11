export function snapToGrid(value, cellSize) {
  return Math.round(value / cellSize) * cellSize
}

export function snapPosition(x, y, cellW, cellH) {
  return {
    x: snapToGrid(x, cellW),
    y: snapToGrid(y, cellH),
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
