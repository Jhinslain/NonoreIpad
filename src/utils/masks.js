function drawHeartBezier(ctx, w, h) {
  const ox = w * 0.5
  const oy = h * 0.22
  const rx = w * 0.42
  const ry = h * 0.38
  const bottomY = h * 0.92

  ctx.moveTo(ox, bottomY)
  ctx.bezierCurveTo(ox - rx * 0.92, oy + ry * 0.65, ox - rx, oy, ox - rx * 0.5, oy)
  ctx.bezierCurveTo(ox - rx * 0.08, oy, ox, oy + ry * 0.22, ox, oy + ry * 0.46)
  ctx.bezierCurveTo(ox, oy + ry * 0.22, ox + rx * 0.08, oy, ox + rx * 0.5, oy)
  ctx.bezierCurveTo(ox + rx, oy, ox + rx * 0.92, oy + ry * 0.65, ox, bottomY)
  ctx.closePath()
}

function drawTriangleDiagonal(ctx, w, h) {
  ctx.moveTo(0, h)
  ctx.lineTo(w, h)
  ctx.lineTo(w, 0)
  ctx.closePath()
}

/**
 * Trace le masque d’une contribution (Canvas 2D ou Konva). `ctx.beginPath()` est appelé ici.
 * Coordonnées locales 0…w, 0…h. Ne pas appeler `clip()` : Konva le fait après la clipFunc.
 *
 * @param {'rect'|'square'|'circle'|'heart'|'triangle'} maskType
 */
export function traceContributionMaskPath(ctx, w, h, maskType) {
  const t = maskType || 'rect'
  ctx.beginPath()

  switch (t) {
    case 'circle': {
      const r = Math.min(w, h) / 2
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2, false)
      break
    }
    case 'heart': {
      drawHeartBezier(ctx, w, h)
      break
    }
    case 'triangle':
      drawTriangleDiagonal(ctx, w, h)
      break
    case 'square': {
      const side = Math.min(w, h)
      const ox = (w - side) / 2
      const oy = (h - side) / 2
      const bleed = 0.65
      ctx.rect(ox - bleed, oy - bleed, side + 2 * bleed, side + 2 * bleed)
      break
    }
    case 'rect':
    default: {
      const bleed = 0.65
      ctx.rect(-bleed, -bleed, w + 2 * bleed, h + 2 * bleed)
      break
    }
  }
}

/**
 * Fabrique une clipFunc Konva : `(ctx, shape) => void`.
 * Définir `width` / `height` sur le `Group` pour que `shape.width()` / `shape.height()` soient corrects.
 * Ne pas appeler `ctx.clip()` : Konva l’applique après cette fonction.
 *
 * @param {'rect'|'square'|'circle'|'heart'|'triangle'} maskType
 */
export function createKonvaClipFunc(maskType) {
  return (ctx, shape) => {
    traceContributionMaskPath(ctx, shape.width(), shape.height(), maskType)
  }
}

export function maskToCropAspect(maskType) {
  if (maskType === 'square' || maskType === 'circle' || maskType === 'heart') {
    return 1
  }
  return undefined
}

/**
 * Prédicat réutilisable : même géométrie que `createKonvaClipFunc` (clip Konva).
 * Coordonnées locales au groupe (0…w, 0…h).
 */
export function createMaskHitTester(w, h, maskType) {
  const t = maskType || 'rect'
  const ww = Math.max(0, w)
  const hh = Math.max(0, h)

  if (t === 'rect') {
    return (lx, ly) => lx >= 0 && ly >= 0 && lx <= ww && ly <= hh
  }
  if (t === 'circle') {
    const r = Math.min(ww, hh) / 2
    const cx = ww / 2
    const cy = hh / 2
    return (lx, ly) => {
      const dx = lx - cx
      const dy = ly - cy
      return dx * dx + dy * dy <= r * r + 1e-9
    }
  }
  if (t === 'square') {
    const side = Math.min(ww, hh)
    const ox = (ww - side) / 2
    const oy = (hh - side) / 2
    return (lx, ly) =>
      lx >= ox && ly >= oy && lx <= ox + side && ly <= oy + side
  }
  if (t === 'triangle') {
    return (lx, ly) => {
      if (lx < 0 || ly < 0 || lx > ww || ly > hh) return false
      if (ww < 1e-9) return false
      const lineY = hh - (hh / ww) * lx
      return ly >= lineY - 1e-9
    }
  }
  if (t === 'heart') {
    if (typeof document === 'undefined') {
      return (lx, ly) => lx >= 0 && ly >= 0 && lx <= ww && ly <= hh
    }
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    drawHeartBezier(ctx, ww, hh)
    return (lx, ly) => ctx.isPointInPath(lx, ly)
  }
  return (lx, ly) => lx >= 0 && ly >= 0 && lx <= ww && ly <= hh
}
