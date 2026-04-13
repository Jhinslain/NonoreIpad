/**
 * Smart Case 13″ dépliée en portrait : **45 × 58** (rabat à gauche).
 * Plis : après col. rabat, puis entre les trois volets.
 * Quadrillage : rectangle complet, non clippé (pas de traits de pli entre volets).
 */

import {
  FLAP_CORNER_ROWS_EACH,
  GRID_COLS,
  GRID_FLAP_COLS,
  GRID_ROWS,
  GRID_VOLET_COLS,
} from '../constants.js'

function computeLayout(W, H) {
  const cellW = W / GRID_COLS
  const cellH = H / GRID_ROWS
  const flapW = GRID_FLAP_COLS * cellW
  const bodyLeft = flapW
  const bodyW = W - bodyLeft

  const [v1, v2] = GRID_VOLET_COLS
  const foldXs = [
    bodyLeft,
    bodyLeft + v1 * cellW,
    bodyLeft + (v1 + v2) * cellW,
  ]

  const y0 = FLAP_CORNER_ROWS_EACH * cellH
  const flapH = H - 2 * FLAP_CORNER_ROWS_EACH * cellH
  const R = Math.min(W, H) * 0.048
  const rf = Math.min(flapW * 0.42, flapH * 0.11, 16)
  const rFlapRight = Math.min(3.5, flapW * 0.09)
  return {
    flapW,
    bodyLeft,
    bodyW,
    colW: cellW,
    foldXs,
    flapH,
    y0,
    R,
    rf,
    rFlapRight,
  }
}

export function getFolioLayout(stageW, stageH) {
  const L = computeLayout(stageW, stageH)
  const { flapH, y0 } = L
  return {
    ...L,
    foldXs: L.foldXs,
    flapTop: y0,
    flapBottom: y0 + flapH,
  }
}

/** Ajoute un rectangle arrondi (coins identiques), sous-chemin fermé. */
function appendRoundRect(ctx, ox, oy, w, h, r) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.moveTo(ox + rad, oy)
  ctx.lineTo(ox + w - rad, oy)
  ctx.arcTo(ox + w, oy, ox + w, oy + rad, rad)
  ctx.lineTo(ox + w, oy + h - rad)
  ctx.arcTo(ox + w, oy + h, ox + w - rad, oy + h, rad)
  ctx.lineTo(ox + rad, oy + h)
  ctx.arcTo(ox, oy + h, ox, oy + h - rad, rad)
  ctx.lineTo(ox, oy + rad)
  ctx.arcTo(ox, oy, ox + rad, oy, rad)
  ctx.closePath()
}

/** Rabat : coins arrondis surtout à gauche ; côté droit presque droit contre le corps. */
function appendFlapPath(ctx, y0, flapW, flapH, rf, rRight) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(0, y0, flapW, flapH, [rf, rRight, rRight, rf])
    return
  }
  const ox = 0
  const oy = y0
  const w = flapW
  const h = flapH
  const rtl = rf
  const rtr = rRight
  const rbr = rRight
  const rbl = rf
  ctx.moveTo(ox + rtl, oy)
  ctx.lineTo(ox + w - rtr, oy)
  ctx.arcTo(ox + w, oy, ox + w, oy + rtr, rtr)
  ctx.lineTo(ox + w, oy + h - rbr)
  ctx.arcTo(ox + w, oy + h, ox + w - rbr, oy + h, rbr)
  ctx.lineTo(ox + rbl, oy + h)
  ctx.arcTo(ox, oy + h, ox, oy + h - rbl, rbl)
  ctx.lineTo(ox, oy + rtl)
  ctx.arcTo(ox, oy, ox + rtl, oy, rtl)
  ctx.closePath()
}

/**
 * clipFunc Konva : union du corps (3 colonnes) et du rabat.
 */
export function createSmartFolioClipFunc() {
  return (ctx, shape) => {
    const W = shape.width()
    const H = shape.height()
    const { bodyLeft, bodyW, y0, flapW, flapH, R, rf, rFlapRight } =
      computeLayout(W, H)

    ctx.beginPath()
    appendRoundRect(ctx, bodyLeft, 0, bodyW, H, R)
    appendFlapPath(ctx, y0, flapW, flapH, rf, rFlapRight)
  }
}

/** Alias historique : même silhouette Smart Folio + rabat. */
export const createFolioClipFunc = createSmartFolioClipFunc

/**
 * Applique le clip silhouette folio sur un contexte Canvas 2D (export image).
 */
export function applyFolioClip(ctx, W, H) {
  const { bodyLeft, bodyW, y0, flapW, flapH, R, rf, rFlapRight } =
    computeLayout(W, H)
  ctx.beginPath()
  appendRoundRect(ctx, bodyLeft, 0, bodyW, H, R)
  appendFlapPath(ctx, y0, flapW, flapH, rf, rFlapRight)
  ctx.clip()
}

/** Fraction de la largeur totale occupée par le rabat (11/45). */
export const FLAP_WIDTH_RATIO = GRID_FLAP_COLS / GRID_COLS
