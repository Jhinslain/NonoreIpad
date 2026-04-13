import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Image as KonvaImage,
  Layer,
  Line,
  Group,
  Rect,
  Stage,
  Transformer,
} from 'react-konva'
import {
  CASE_TEMPLATE_URL,
  GRID_COLS,
  GRID_ROWS,
  MASK_TYPES,
} from '../constants.js'
import { useMosaic } from '../context/MosaicContext.jsx'
import { useStageLayout } from '../context/StageLayoutContext.jsx'
import { getCroppedImg } from '../utils/cropImage.js'
import {
  clampToStage,
  snapContributionRect,
  snapPosition,
} from '../utils/grid.js'
import { createKonvaClipFunc } from '../utils/masks.js'
import { createSmartFolioClipFunc } from '../utils/folioShape.js'
import { useCanvasAssetsPending } from '../hooks/useCanvasAssetsPending.js'

const GRID_STROKE = 'rgba(32, 28, 48, 0.14)'
const GRID_STROKE_MAJOR = 'rgba(32, 28, 48, 0.2)'
const VIEW_PAD = 20
const MIN_CROP_SIZE = 40

function getPanBounds(vw, vh, contentW, contentH) {
  const minX = contentW > vw ? vw - contentW : (vw - contentW) / 2
  const maxX = contentW > vw ? 0 : (vw - contentW) / 2
  const minY = contentH > vh ? vh - contentH : (vh - contentH) / 2
  const maxY = contentH > vh ? 0 : (vh - contentH) / 2
  return { minX, maxX, minY, maxY }
}

function clampPan(pan, bounds) {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, pan.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, pan.y)),
  }
}

function useHtmlImage(url) {
  const [img, setImg] = useState(null)
  useEffect(() => {
    if (!url) return undefined
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => setImg(image)
    image.onerror = () => setImg(null)
    image.src = url
    return () => {
      image.onload = null
      image.onerror = null
    }
  }, [url])
  return img
}

function BackgroundTemplate({ image, stageW, stageH, onImageNaturalSize }) {
  useEffect(() => {
    if (!image?.naturalWidth || !onImageNaturalSize) return
    onImageNaturalSize(image.naturalWidth, image.naturalHeight)
  }, [image, onImageNaturalSize])

  if (image) {
    return (
      <>
        <Rect
          width={stageW}
          height={stageH}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: stageW, y: stageH }}
          fillLinearGradientColorStops={[
            0,
            '#fdfcfa',
            0.45,
            '#f6f4f0',
            1,
            '#ebe7e1',
          ]}
          listening={false}
        />
        <KonvaImage
          image={image}
          width={stageW}
          height={stageH}
          opacity={1}
          listening={false}
          imageSmoothingEnabled
        />
      </>
    )
  }
  return (
    <Rect
      width={stageW}
      height={stageH}
      fillLinearGradientStartPoint={{ x: 0, y: 0 }}
      fillLinearGradientEndPoint={{ x: stageW, y: stageH }}
      fillLinearGradientColorStops={[0, '#fdfcfa', 1, '#ebe7e1']}
      listening={false}
    />
  )
}

/**
 * Quadrillage sur tout le rectangle du gabarit (pas de clip) : colonnes visibles
 * aussi dans les « trous » haut/bas à gauche. L’image reste clippée sur la silhouette.
 */
function MosaicGrid({ cellW, cellH, stageW, stageH }) {
  const lines = useMemo(() => {
    const ls = []
    const W = stageW
    const H = stageH

    for (let c = 0; c <= GRID_COLS; c++) {
      const x = c * cellW
      const major = c % 5 === 0
      ls.push({
        key: `v-${c}`,
        points: [x, 0, x, H],
        stroke: major ? GRID_STROKE_MAJOR : GRID_STROKE,
        strokeWidth: major ? 1.15 : 0.9,
      })
    }

    for (let r = 0; r <= GRID_ROWS; r++) {
      const y = r * cellH
      const major = r % 5 === 0
      ls.push({
        key: `h-${r}`,
        points: [0, y, W, y],
        stroke: major ? GRID_STROKE_MAJOR : GRID_STROKE,
        strokeWidth: major ? 1.15 : 0.9,
      })
    }
    return ls
  }, [cellW, cellH, stageW, stageH])

  return (
    <>
      {lines.map(({ key, points, stroke, strokeWidth }) => (
        <Line
          key={key}
          points={points}
          stroke={stroke}
          strokeWidth={strokeWidth}
          listening={false}
          lineCap="round"
        />
      ))}
    </>
  )
}

function ContributionGroup({
  contribution,
  interactive,
  idAttr,
  isStageListening,
  onDragEnd,
  onSelectDraft,
  onTransformEnd,
  /** Sur l’éditeur : assombrir les contributions déjà enregistrées. Sur l’aperçu récap : pleine luminosité. */
  dimSavedContributions = true,
}) {
  const image = useHtmlImage(contribution.imageUrl)
  const clipFunc = useMemo(
    () => createKonvaClipFunc(contribution.maskType),
    [contribution.maskType],
  )
  const listen = interactive && isStageListening
  const savedDim =
    !dimSavedContributions || interactive ? 1 : 0.78

  const handleSelect = interactive
    ? (e) => {
        e.cancelBubble = true
        onSelectDraft?.()
      }
    : undefined

  return (
    <Group
      id={idAttr}
      opacity={savedDim}
      x={contribution.x}
      y={contribution.y}
      width={contribution.width}
      height={contribution.height}
      rotation={contribution.rotation}
      draggable={interactive}
      onClick={handleSelect}
      onTap={handleSelect}
      clipFunc={clipFunc}
      onDragEnd={interactive ? onDragEnd : undefined}
      onTransformEnd={interactive ? onTransformEnd : undefined}
      listening={listen}
    >
      {image ? (
        <KonvaImage
          image={image}
          width={contribution.width}
          height={contribution.height}
          listening={listen}
          perfectDrawEnabled={false}
        />
      ) : (
        <Rect
          width={contribution.width}
          height={contribution.height}
          fill="rgba(80,80,100,0.6)"
          listening={listen}
        />
      )}
    </Group>
  )
}

export function CanvasStage({ variant = 'editor' }) {
  const isPreview = variant === 'summary'
  const {
    contributions,
    loading: mosaicListLoading,
    selectedPremiumId,
    setSelectedPremiumId,
    bringDraftToFront,
    updateContributionGeometry,
    updateContributionMask,
    updateContributionImage,
    removeContribution,
  } = useMosaic()

  const canvasAssetsPending = useCanvasAssetsPending(
    mosaicListLoading,
    CASE_TEMPLATE_URL,
    contributions,
  )

  const {
    stageWidth,
    stageHeight,
    cellWidth,
    cellHeight,
    registerTemplateImageSize,
  } = useStageLayout()

  const templateImg = useHtmlImage(CASE_TEMPLATE_URL)

  const stageRef = useRef(null)
  const trRef = useRef(null)
  const containerRef = useRef(null)
  const [viewport, setViewport] = useState({ w: 400, h: 560 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const viewRef = useRef({ zoom: 1, pan: { x: 0, y: 0 } })
  viewRef.current = { zoom, pan }

  const folioClip = useMemo(() => createSmartFolioClipFunc(), [])

  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      setViewport({ w: cr.width, h: cr.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /** Départ légèrement dézoomé (tout le gabarit visible + marge) + centrage. */
  const lastLayoutKey = useRef(0)
  useEffect(() => {
    const vw = viewport.w
    const vh = viewport.h
    if (vw < 80 || vh < 80) return
    const key =
      Math.round(vw / 32) * 1e7 +
      Math.round(vh / 32) * 1e4 +
      Math.round(stageWidth) +
      Math.round(stageHeight) * 1e3
    if (key === lastLayoutKey.current) return
    lastLayoutKey.current = key
    const fit = Math.min(
      (vw - VIEW_PAD * 2) / stageWidth,
      (vh - VIEW_PAD * 2) / stageHeight,
    )
    const z = Math.max(0.12, fit * 0.9)
    setZoom(z)
      setPan({
      x: (vw - stageWidth * z) / 2,
      y: (vh - stageHeight * z) / 2,
    })
  }, [viewport.w, viewport.h, stageWidth, stageHeight])

  const layer1 = contributions.filter((c) => c.layer === 1)
  const layer2 = contributions.filter((c) => c.layer === 2)
  const selectedContribution = useMemo(
    () => contributions.find((c) => c.id === selectedPremiumId) ?? null,
    [contributions, selectedPremiumId],
  )
  /** Brouillon uniquement : déplacement, transformation, rognage. Enregistrées = affichage seul. */
  const selectedIsEditable = selectedContribution?.isDraft === true
  const selectedImage = useHtmlImage(selectedContribution?.imageUrl ?? null)
  const [shapePopupOpen, setShapePopupOpen] = useState(false)
  const [cropPopupOpen, setCropPopupOpen] = useState(false)
  const [cropRect, setCropRect] = useState(null)
  const [dragCrop, setDragCrop] = useState(null)
  const [cropBusy, setCropBusy] = useState(false)
  const [cropModalViewport, setCropModalViewport] = useState(() =>
    typeof window !== 'undefined'
      ? { w: window.innerWidth, h: window.innerHeight }
      : { w: 400, h: 700 },
  )

  useEffect(() => {
    const tr = trRef.current
    if (!tr) return
    const stage = stageRef.current
    if (!selectedPremiumId || !stage || !selectedIsEditable) {
      tr.nodes([])
      return
    }
    const node = stage.findOne(`#contrib-${selectedPremiumId}`)
    if (node) {
      tr.nodes([node])
      tr.getLayer()?.batchDraw()
    } else {
      tr.nodes([])
    }
  }, [selectedPremiumId, contributions, selectedIsEditable])

  useEffect(() => {
    if (!selectedContribution || !selectedIsEditable) {
      setShapePopupOpen(false)
      setCropPopupOpen(false)
      setCropRect(null)
      setDragCrop(null)
      return
    }
  }, [selectedContribution?.id, selectedIsEditable])

  useEffect(() => {
    if (!cropPopupOpen || !selectedImage) return
    setCropRect({
      x: 0,
      y: 0,
      width: selectedImage.naturalWidth,
      height: selectedImage.naturalHeight,
    })
  }, [cropPopupOpen, selectedImage])

  const vw = Math.max(100, viewport.w)
  const vh = Math.max(100, viewport.h)

  const zoomLimits = useMemo(() => {
    const w = Math.max(80, viewport.w - VIEW_PAD * 2)
    const h = Math.max(80, viewport.h - VIEW_PAD * 2)
    const fit = Math.min(w / stageWidth, h / stageHeight)
    return {
      minZ: Math.max(0.12, fit * 0.35),
      maxZ: fit * 10,
    }
  }, [viewport.w, viewport.h, stageWidth, stageHeight])

  /** delta : +1 = zoom avant, −1 = zoom arrière (ancrage au centre de la vue) */
  const applyZoomStep = useCallback(
    (delta) => {
      const { zoom: oldScale, pan: oldPan } = viewRef.current
      const { minZ, maxZ } = zoomLimits
      const scaleBy = delta > 0 ? 1.12 : 1 / 1.12
      let newScale = oldScale * scaleBy
      newScale = Math.max(minZ, Math.min(maxZ, newScale))
      const pointer = { x: vw / 2, y: vh / 2 }
      const anchor = {
        x: (pointer.x - oldPan.x) / oldScale,
        y: (pointer.y - oldPan.y) / oldScale,
      }
      const rawPan = {
        x: pointer.x - anchor.x * newScale,
        y: pointer.y - anchor.y * newScale,
      }
      const nextBounds = getPanBounds(
        vw,
        vh,
        stageWidth * newScale,
        stageHeight * newScale,
      )
      setPan(clampPan(rawPan, nextBounds))
      setZoom(newScale)
    },
    [zoomLimits, vw, vh, stageWidth, stageHeight],
  )

  const zoomOutDisabled = zoom <= zoomLimits.minZ + 0.002
  const zoomInDisabled = zoom >= zoomLimits.maxZ - 0.002

  const bounds = useMemo(
    () => getPanBounds(vw, vh, stageWidth * zoom, stageHeight * zoom),
    [vw, vh, stageWidth, stageHeight, zoom],
  )

  useEffect(() => {
    setPan((prev) => clampPan(prev, bounds))
  }, [bounds])

  const xScrollable = bounds.maxX > bounds.minX
  const yScrollable = bounds.maxY > bounds.minY
  const xSlider = xScrollable
    ? ((pan.x - bounds.minX) / (bounds.maxX - bounds.minX)) * 100
    : 0
  const ySlider = yScrollable
    ? ((pan.y - bounds.minY) / (bounds.maxY - bounds.minY)) * 100
    : 0
  const selectedScreen = selectedContribution
    ? {
        x: pan.x + (selectedContribution.x + selectedContribution.width) * zoom,
        y: pan.y + selectedContribution.y * zoom,
      }
    : null

  const toolbarStyle =
    selectedScreen && selectedIsEditable
      ? {
          left: Math.min(vw - 84, Math.max(8, selectedScreen.x + 8)),
          top: Math.min(vh - 154, Math.max(8, selectedScreen.y)),
        }
      : null

  const handleDragEndCommon = useCallback(
    (c, node) => {
      const lw = c.width
      const lh = c.height
      const { x: nx, y: ny } = snapPosition(
        node.x(),
        node.y(),
        cellWidth,
        cellHeight,
      )
      const clamped = clampToStage(
        nx,
        ny,
        lw,
        lh,
        stageWidth,
        stageHeight,
      )
      const geom = snapContributionRect(
        clamped.x,
        clamped.y,
        lw,
        lh,
        cellWidth,
        cellHeight,
      )
      node.position({ x: geom.x, y: geom.y })
      updateContributionGeometry(c.id, {
        x: geom.x,
        y: geom.y,
        width: geom.width,
        height: geom.height,
        rotation: node.rotation(),
      })
    },
    [cellWidth, cellHeight, stageWidth, stageHeight, updateContributionGeometry],
  )

  const selectDraftOnCanvas = useCallback(
    (id) => {
      bringDraftToFront(id)
      setSelectedPremiumId(id)
    },
    [bringDraftToFront, setSelectedPremiumId],
  )

  const handleTransformEndCommon = useCallback(
    (c, node) => {
      const sx = node.scaleX()
      const sy = node.scaleY()
      const rawW = Math.max(cellWidth * 2, node.width() * sx)
      const rawH = Math.max(cellHeight * 2, node.height() * sy)
      const newW = Math.max(
        cellWidth * 2,
        Math.round(rawW / cellWidth) * cellWidth,
      )
      const newH = Math.max(
        cellHeight * 2,
        Math.round(rawH / cellHeight) * cellHeight,
      )
      node.scaleX(1)
      node.scaleY(1)
      node.width(newW)
      node.height(newH)
      const { x: nx, y: ny } = snapPosition(
        node.x(),
        node.y(),
        cellWidth,
        cellHeight,
      )
      const clamped = clampToStage(
        nx,
        ny,
        newW,
        newH,
        stageWidth,
        stageHeight,
      )
      const geom = snapContributionRect(
        clamped.x,
        clamped.y,
        newW,
        newH,
        cellWidth,
        cellHeight,
      )
      node.position({ x: geom.x, y: geom.y })
      node.width(geom.width)
      node.height(geom.height)
      updateContributionGeometry(c.id, {
        x: geom.x,
        y: geom.y,
        width: geom.width,
        height: geom.height,
        rotation: node.rotation(),
      })
    },
    [cellWidth, cellHeight, stageWidth, stageHeight, updateContributionGeometry],
  )

  const applyCrop = useCallback(async () => {
    if (!selectedContribution || !cropRect || cropBusy) return
    setCropBusy(true)
    try {
      const blob = await getCroppedImg(
        selectedContribution.imageUrl,
        {
          x: Math.round(cropRect.x),
          y: Math.round(cropRect.y),
          width: Math.round(cropRect.width),
          height: Math.round(cropRect.height),
        },
        0,
      )
      await updateContributionImage(selectedContribution.id, blob)
      setCropPopupOpen(false)
    } finally {
      setCropBusy(false)
    }
  }, [
    selectedContribution,
    cropRect,
    cropBusy,
    updateContributionImage,
  ])

  useLayoutEffect(() => {
    if (!cropPopupOpen) return
    setCropModalViewport({
      w: window.innerWidth,
      h: window.innerHeight,
    })
  }, [cropPopupOpen])

  useEffect(() => {
    if (!cropPopupOpen) return undefined
    const sync = () =>
      setCropModalViewport({
        w: window.innerWidth,
        h: window.innerHeight,
      })
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [cropPopupOpen])

  const cropPreview = useMemo(() => {
    if (!selectedImage) return null
    const padX = 56
    const chromeY = 200
    const maxW = Math.min(
      560,
      Math.max(200, cropModalViewport.w - padX),
    )
    const maxH = Math.min(
      380,
      Math.max(160, cropModalViewport.h - chromeY),
    )
    const scale = Math.min(
      maxW / selectedImage.naturalWidth,
      maxH / selectedImage.naturalHeight,
      1,
    )
    const width = Math.round(selectedImage.naturalWidth * scale)
    const height = Math.round(selectedImage.naturalHeight * scale)
    return { scale, width, height }
  }, [selectedImage, cropModalViewport])

  useEffect(() => {
    if (!dragCrop || !cropPreview || !selectedImage) return undefined
    const { pointerId } = dragCrop
    const onMove = (e) => {
      if (pointerId != null && e.pointerId !== pointerId) return
      e.preventDefault()
      const dx = (e.clientX - dragCrop.startX) / cropPreview.scale
      const dy = (e.clientY - dragCrop.startY) / cropPreview.scale
      const src = dragCrop.rect
      let next = { ...src }
      if (dragCrop.mode === 'move') {
        const nx = Math.max(
          0,
          Math.min(
            src.x + dx,
            selectedImage.naturalWidth - src.width,
          ),
        )
        const ny = Math.max(
          0,
          Math.min(
            src.y + dy,
            selectedImage.naturalHeight - src.height,
          ),
        )
        next.x = nx
        next.y = ny
      } else if (dragCrop.edge === 'left') {
        const x = Math.max(
          0,
          Math.min(src.x + dx, src.x + src.width - MIN_CROP_SIZE),
        )
        next.x = x
        next.width = src.width - (x - src.x)
      } else if (dragCrop.edge === 'right') {
        const w = Math.max(
          MIN_CROP_SIZE,
          Math.min(
            src.width + dx,
            selectedImage.naturalWidth - src.x,
          ),
        )
        next.width = w
      } else if (dragCrop.edge === 'top') {
        const y = Math.max(
          0,
          Math.min(src.y + dy, src.y + src.height - MIN_CROP_SIZE),
        )
        next.y = y
        next.height = src.height - (y - src.y)
      } else if (dragCrop.edge === 'bottom') {
        const h = Math.max(
          MIN_CROP_SIZE,
          Math.min(
            src.height + dy,
            selectedImage.naturalHeight - src.y,
          ),
        )
        next.height = h
      }
      setCropRect(next)
    }
    const onUp = (e) => {
      if (pointerId != null && e.pointerId !== pointerId) return
      setDragCrop(null)
    }
    document.addEventListener('pointermove', onMove, { passive: false, capture: true })
    document.addEventListener('pointerup', onUp, { capture: true })
    document.addEventListener('pointercancel', onUp, { capture: true })
    return () => {
      document.removeEventListener('pointermove', onMove, { capture: true })
      document.removeEventListener('pointerup', onUp, { capture: true })
      document.removeEventListener('pointercancel', onUp, { capture: true })
    }
  }, [dragCrop, cropPreview, selectedImage])

  return (
    <div
      className={
        isPreview ? 'canvas-stage canvas-stage--summary' : 'canvas-stage'
      }
    >
      {/** ref uniquement sur la zone du canevas (sans le texte d’aide) pour éviter la boucle ResizeObserver + flex. */}
      <div className="canvas-stage-viewport" ref={containerRef}>
        <div
          className="canvas-zoom-controls"
          role="group"
          aria-label="Zoom du canevas"
        >
          <button
            type="button"
            className="canvas-zoom-btn"
            onClick={() => applyZoomStep(1)}
            disabled={zoomInDisabled}
            title="Zoom avant"
            aria-label="Zoom avant"
          >
            +
          </button>
          <button
            type="button"
            className="canvas-zoom-btn"
            onClick={() => applyZoomStep(-1)}
            disabled={zoomOutDisabled}
            title="Zoom arrière"
            aria-label="Zoom arrière"
          >
            −
          </button>
        </div>
        <Stage
          ref={stageRef}
          width={vw}
          height={vh}
          className="konva-stage-el"
        >
        <Layer>
          <Group x={pan.x} y={pan.y} scaleX={zoom} scaleY={zoom}>
            <Group
              x={0}
              y={0}
              width={stageWidth}
              height={stageHeight}
              clipFunc={folioClip}
            >
              <BackgroundTemplate
                image={templateImg}
                stageW={stageWidth}
                stageH={stageHeight}
                onImageNaturalSize={registerTemplateImageSize}
              />
            </Group>
            <MosaicGrid
              cellW={cellWidth}
              cellH={cellHeight}
              stageW={stageWidth}
              stageH={stageHeight}
            />
            <Group
              x={0}
              y={0}
              width={stageWidth}
              height={stageHeight}
              clipFunc={folioClip}
            >
              {layer1.map((c) => (
                <ContributionGroup
                  key={c.id}
                  idAttr={`contrib-${c.id}`}
                  contribution={c}
                  interactive={!isPreview && c.isDraft === true}
                  dimSavedContributions={!isPreview}
                  onSelectDraft={
                    isPreview ? undefined : () => selectDraftOnCanvas(c.id)
                  }
                  onDragEnd={(e) => handleDragEndCommon(c, e.target)}
                  onTransformEnd={(e) => handleTransformEndCommon(c, e.target)}
                  isStageListening={!isPreview}
                />
              ))}
              {layer2.map((c) => (
                <ContributionGroup
                  key={c.id}
                  idAttr={`contrib-${c.id}`}
                  contribution={c}
                  interactive={!isPreview && c.isDraft === true}
                  dimSavedContributions={!isPreview}
                  onSelectDraft={
                    isPreview ? undefined : () => selectDraftOnCanvas(c.id)
                  }
                  onDragEnd={(e) => handleDragEndCommon(c, e.target)}
                  onTransformEnd={(e) => handleTransformEndCommon(c, e.target)}
                  isStageListening={!isPreview}
                />
              ))}
            </Group>
            {!isPreview && (
              <Transformer
                ref={trRef}
                rotateEnabled
                resizeEnabled
                borderStroke="#D9534F"
                anchorFill="#fff"
                anchorStroke="#D9534F"
                boundBoxFunc={(oldBox, newBox) =>
                  newBox.width < 24 || newBox.height < 24 ? oldBox : newBox
                }
              />
            )}
          </Group>
        </Layer>
        </Stage>
        <input
          className="canvas-scrollbar canvas-scrollbar--y-overlay"
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={ySlider}
          disabled={!yScrollable}
          onChange={(e) => {
            const t = Number(e.target.value) / 100
            const y = bounds.minY + t * (bounds.maxY - bounds.minY)
            setPan((prev) => ({ ...prev, y }))
          }}
          aria-label="Défilement vertical"
        />
        <input
          className="canvas-scrollbar canvas-scrollbar--x-overlay"
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={xSlider}
          disabled={!xScrollable}
          onChange={(e) => {
            const t = Number(e.target.value) / 100
            const x = bounds.minX + t * (bounds.maxX - bounds.minX)
            setPan((prev) => ({ ...prev, x }))
          }}
          aria-label="Défilement horizontal"
        />
        {canvasAssetsPending && (
          <div
            className="canvas-assets-overlay"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="canvas-assets-overlay__box">
              <span className="summary-pay-spinner" aria-hidden="true" />
              <p className="canvas-assets-overlay__text">
                Chargement du gabarit et des photos…
              </p>
            </div>
          </div>
        )}
      </div>
      {!isPreview && selectedContribution && toolbarStyle && (
        <div className="canvas-image-toolbar" style={toolbarStyle}>
          <button
            type="button"
            className="canvas-tool-btn canvas-tool-btn--delete"
            title="Supprimer l'image"
            aria-label="Supprimer l'image"
            onClick={() => removeContribution(selectedContribution.id)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M6 7l1 12h10l1-12" />
              <path d="M9 7V5h6v2" />
            </svg>
          </button>
          <button
            type="button"
            className="canvas-tool-btn canvas-tool-btn--shape"
            title="Changer la forme"
            aria-label="Changer la forme"
            onClick={() => {
              setCropPopupOpen(false)
              setShapePopupOpen(true)
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
            </svg>
          </button>
          <button
            type="button"
            className="canvas-tool-btn canvas-tool-btn--crop"
            title="Rogner l'image"
            aria-label="Rogner l'image"
            onClick={() => {
              setShapePopupOpen(false)
              setCropPopupOpen(true)
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="7.5" cy="17.5" r="2.5" />
              <circle cx="16.5" cy="17.5" r="2.5" />
              <path d="M8 15.5L12 8.5" />
              <path d="M16 15.5L12 8.5" />
              <path d="M12 8.5L7 4" />
              <path d="M12 8.5L17 4" />
            </svg>
          </button>
        </div>
      )}
      {shapePopupOpen && selectedContribution && selectedIsEditable && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal modal--compact">
            <div className="modal-header">
              <h2>Forme</h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShapePopupOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="shape-picker">
                {Object.entries(MASK_TYPES).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    className={`shape-chip ${selectedContribution.maskType === k ? 'shape-chip--active' : ''}`}
                    onClick={() => {
                      updateContributionMask(selectedContribution.id, k)
                      setShapePopupOpen(false)
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {cropPopupOpen && selectedContribution && selectedIsEditable && (
        <div className="modal-backdrop modal-backdrop--crop" role="dialog" aria-modal="true">
          <div className="modal modal--crop">
            <div className="modal-header">
              <h2>Rogner l'image</h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setCropPopupOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="crop-modal-hint muted">
                Tirez les bords colorés pour ajuster, ou glissez au centre pour déplacer la zone.
              </p>
              {cropPreview && cropRect && (
                <div
                  className="crop-edges-wrap"
                  style={{
                    width: cropPreview.width,
                    height: cropPreview.height,
                  }}
                >
                  <img
                    src={selectedContribution.imageUrl}
                    alt=""
                    draggable={false}
                    className="crop-edges-image"
                  />
                  <div
                    className="crop-edges-rect"
                    style={{
                      left: cropRect.x * cropPreview.scale,
                      top: cropRect.y * cropPreview.scale,
                      width: cropRect.width * cropPreview.scale,
                      height: cropRect.height * cropPreview.scale,
                    }}
                  >
                    <button
                      type="button"
                      className="crop-move-pad"
                      title="Déplacer la zone"
                      aria-label="Déplacer la zone de rognage"
                      onPointerDown={(e) => {
                        e.preventDefault()
                        setDragCrop({
                          mode: 'move',
                          startX: e.clientX,
                          startY: e.clientY,
                          rect: cropRect,
                          pointerId: e.pointerId,
                        })
                      }}
                    />
                    <button
                      type="button"
                      className="crop-edge crop-edge--left"
                      aria-label="Ajuster le bord gauche"
                      onPointerDown={(e) => {
                        e.preventDefault()
                        setDragCrop({
                          mode: 'edge',
                          edge: 'left',
                          startX: e.clientX,
                          startY: e.clientY,
                          rect: cropRect,
                          pointerId: e.pointerId,
                        })
                      }}
                    />
                    <button
                      type="button"
                      className="crop-edge crop-edge--right"
                      aria-label="Ajuster le bord droit"
                      onPointerDown={(e) => {
                        e.preventDefault()
                        setDragCrop({
                          mode: 'edge',
                          edge: 'right',
                          startX: e.clientX,
                          startY: e.clientY,
                          rect: cropRect,
                          pointerId: e.pointerId,
                        })
                      }}
                    />
                    <button
                      type="button"
                      className="crop-edge crop-edge--top"
                      aria-label="Ajuster le bord haut"
                      onPointerDown={(e) => {
                        e.preventDefault()
                        setDragCrop({
                          mode: 'edge',
                          edge: 'top',
                          startX: e.clientX,
                          startY: e.clientY,
                          rect: cropRect,
                          pointerId: e.pointerId,
                        })
                      }}
                    />
                    <button
                      type="button"
                      className="crop-edge crop-edge--bottom"
                      aria-label="Ajuster le bord bas"
                      onPointerDown={(e) => {
                        e.preventDefault()
                        setDragCrop({
                          mode: 'edge',
                          edge: 'bottom',
                          startX: e.clientX,
                          startY: e.clientY,
                          rect: cropRect,
                          pointerId: e.pointerId,
                        })
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setCropPopupOpen(false)}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={applyCrop}
                  disabled={!cropRect || cropBusy}
                >
                  {cropBusy ? 'Rognage…' : 'Appliquer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {!isPreview && (
        <p className="canvas-hint sr-only">
          Mosaïque folio : les images déjà enregistrées sont en lecture seule. Les
          brouillons peuvent être déplacés et transformés.
        </p>
      )}
      {isPreview && (
        <p className="canvas-hint sr-only">
          Aperçu de la mosaïque : consultation seule.
        </p>
      )}
    </div>
  )
}
