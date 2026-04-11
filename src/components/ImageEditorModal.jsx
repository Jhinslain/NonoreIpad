import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'
import { LAYER1_CELL_OPTIONS, MASK_TYPES } from '../constants.js'
import { getCroppedImg } from '../utils/cropImage.js'
import { maskToCropAspect } from '../utils/masks.js'
import { removeBackground } from '../utils/removeBg.js'

const REMOVE_BG_KEY = import.meta.env.VITE_REMOVE_BG_API_KEY || ''

export function ImageEditorModal({
  open,
  onClose,
  layer,
  onSaveDraft,
}) {
  const [imageSrc, setImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [maskType, setMaskType] = useState('rect')
  const [cellSpan, setCellSpan] = useState(1)
  const [premiumEuros, setPremiumEuros] = useState(5)
  const [contributorName, setContributorName] = useState('')
  const [contributorEmail, setContributorEmail] = useState('')
  const [removeLoading, setRemoveLoading] = useState(false)
  const [removeError, setRemoveError] = useState(null)
  const [busy, setBusy] = useState(false)

  const aspect = maskToCropAspect(maskType)

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const resetModal = () => {
    if (imageSrc) URL.revokeObjectURL(imageSrc)
    setImageSrc(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCroppedAreaPixels(null)
    setMaskType('rect')
    setCellSpan(1)
    setPremiumEuros(5)
    setRemoveError(null)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (imageSrc) URL.revokeObjectURL(imageSrc)
    setImageSrc(URL.createObjectURL(file))
    setCroppedAreaPixels(null)
  }

  const handleRemoveBg = async () => {
    if (layer !== 2) return
    if (!imageSrc || !croppedAreaPixels) {
      setRemoveError('Choisissez une image et ajustez le cadrage.')
      return
    }
    setRemoveError(null)
    setRemoveLoading(true)
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
      const out = await removeBackground(blob, REMOVE_BG_KEY)
      if (imageSrc) URL.revokeObjectURL(imageSrc)
      setImageSrc(URL.createObjectURL(out))
      setRotation(0)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
    } catch (err) {
      setRemoveError(err.message || 'Échec remove.bg')
    } finally {
      setRemoveLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    if (layer === 2 && premiumEuros < 5) {
      setRemoveError('Le montant premium minimum est 5 €.')
      return
    }
    setBusy(true)
    setRemoveError(null)
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation)
      const cells = LAYER1_CELL_OPTIONS.find((o) => o.value === cellSpan)?.cells ?? 1
      const priceEuros = layer === 1 ? cells : premiumEuros

      await onSaveDraft({
        imageBlob: blob,
        layer,
        maskType,
        cellSpan: layer === 1 ? cellSpan : 1,
        priceEuros,
        contributorName: contributorName.trim() || null,
        contributorEmail: contributorEmail.trim() || null,
      })
      handleClose()
    } catch (err) {
      setRemoveError(err.message || 'Erreur à l’enregistrement')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  const showPremiumControls = layer === 2

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h2>
            {layer === 1
              ? 'Pièce 1 € — éditeur'
              : 'Pièce premium — éditeur'}
          </h2>
          <button type="button" className="btn-icon" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="editor-upload">
            <label className="file-label">
              Choisir une image
              <input type="file" accept="image/*" onChange={onFile} />
            </label>
          </div>

          {imageSrc && (
            <div className="crop-wrap">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
              />
            </div>
          )}

          <div className="editor-controls">
            <label className="field">
              Zoom (×0,5 — 3)
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>
            <label className="field">
              Rotation (0° — 360°)
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
              />
            </label>

            <label className="field">
              Forme du masque
              <select
                value={maskType}
                onChange={(e) => setMaskType(e.target.value)}
              >
                {Object.entries(MASK_TYPES).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            {layer === 1 && (
              <label className="field">
                Taille sur la grille
                <select
                  value={cellSpan}
                  onChange={(e) => setCellSpan(Number(e.target.value))}
                >
                  {LAYER1_CELL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {showPremiumControls && (
              <>
                <label className="field">
                  Montant (€), minimum 5
                  <input
                    type="number"
                    min={5}
                    step={1}
                    value={premiumEuros}
                    onChange={(e) =>
                      setPremiumEuros(Number(e.target.value) || 5)
                    }
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={removeLoading || !REMOVE_BG_KEY}
                  onClick={handleRemoveBg}
                >
                  {removeLoading
                    ? 'Suppression du fond…'
                    : 'Supprimer le fond (1 crédit remove.bg)'}
                </button>
                {!REMOVE_BG_KEY && (
                  <p className="muted small">
                    Définissez VITE_REMOVE_BG_API_KEY pour activer remove.bg.
                  </p>
                )}
              </>
            )}

            <label className="field">
              Votre prénom ou pseudo
              <input
                value={contributorName}
                onChange={(e) => setContributorName(e.target.value)}
                placeholder="Optionnel"
              />
            </label>
            <label className="field">
              E-mail (pour le suivi)
              <input
                type="email"
                value={contributorEmail}
                onChange={(e) => setContributorEmail(e.target.value)}
                placeholder="Optionnel"
              />
            </label>
          </div>

          {removeError && <p className="error-text">{removeError}</p>}

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={handleClose}>
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!imageSrc || !croppedAreaPixels || busy}
              onClick={handleSubmit}
            >
              {busy ? 'Préparation…' : 'Enregistrer le brouillon'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
