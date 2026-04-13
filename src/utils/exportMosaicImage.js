import { applyFolioClip } from './folioShape.js'
import { traceContributionMaskPath } from './masks.js'

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (typeof url === 'string' && !url.startsWith('blob:')) {
      img.crossOrigin = 'anonymous'
    }
    img.onload = () => resolve(img)
    img.onerror = () =>
      reject(new Error(`Impossible de charger l’image : ${String(url).slice(0, 80)}…`))
    img.src = url
  })
}

async function drawContribution(ctx, c) {
  let img
  try {
    img = await loadImage(c.imageUrl)
  } catch {
    return
  }
  ctx.save()
  ctx.translate(c.x, c.y)
  ctx.rotate((c.rotation * Math.PI) / 180)
  traceContributionMaskPath(ctx, c.width, c.height, c.maskType)
  ctx.clip()
  ctx.drawImage(img, 0, 0, c.width, c.height)
  ctx.restore()
}

/**
 * PNG des seules photos, dans la silhouette folio (fond transparent ailleurs).
 * Pas de gabarit, pas de quadrillage.
 *
 * @returns {Promise<Blob>}
 */
export async function renderMosaicToPngBlob({
  stageWidth,
  stageHeight,
  contributions,
}) {
  const W = Math.max(1, Math.round(stageWidth))
  const H = Math.max(1, Math.round(stageHeight))
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, W, H)

  const layer1 = contributions.filter((c) => c.layer === 1)
  const layer2 = contributions.filter((c) => c.layer === 2)
  const ordered = [...layer1, ...layer2]

  ctx.save()
  applyFolioClip(ctx, W, H)
  for (const c of ordered) {
    await drawContribution(ctx, c)
  }
  ctx.restore()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Export PNG impossible (canvas trop grand ou navigateur).'))
      },
      'image/png',
      1,
    )
  })
}

export function suggestMosaicFilename() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `mosaique-photos-${y}${m}${day}.png`
}
