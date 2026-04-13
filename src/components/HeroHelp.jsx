import { useEffect, useId, useState } from 'react'
import { HELP_CONTACT_EMAIL } from '../constants.js'

export function HeroHelp() {
  const [open, setOpen] = useState(false)
  const titleId = useId().replace(/:/g, '')

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <div className="hero-help">
        <button
          type="button"
          className="hero-help__btn"
          aria-expanded={open}
          aria-controls={`hero-help-dialog-${titleId}`}
          onClick={() => setOpen(true)}
        >
          <span className="hero-help__btn-glow" aria-hidden="true" />
          <span className="hero-help__btn-inner">
            <span className="hero-help__btn-icon" aria-hidden="true">
              <svg
                className="hero-help__btn-icon-svg"
                viewBox="0 0 24 24"
                width="22"
                height="22"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill="rgba(255, 255, 255, 0.14)"
                  stroke="currentColor"
                  strokeWidth="1.65"
                />
                <text
                  x="12"
                  y="12"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="currentColor"
                  fontSize="13"
                  fontWeight="800"
                  fontFamily="system-ui, -apple-system, Segoe UI, sans-serif"
                >
                  ?
                </text>
              </svg>
            </span>
            <span className="hero-help__btn-label">Aide</span>
          </span>
        </button>
      </div>

      {open && (
        <div
          className="modal-backdrop modal-backdrop--help"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            id={`hero-help-dialog-${titleId}`}
            className="modal modal--help"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`hero-help-title-${titleId}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id={`hero-help-title-${titleId}`} className="modal--help__title">
                Comment ça marche ?
              </h2>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setOpen(false)}
                aria-label="Fermer l’aide"
              >
                ×
              </button>
            </div>
            <div className="modal-body modal-body--help">
              <ul className="hero-help__list">
                <li>
                  Cliquez sur <strong>Ajouter une photo</strong> pour en choisir une
                  dans votre galerie. Vous pouvez la <strong>déplacer</strong> sur la
                  grille, l’<strong>agrandir</strong> ou la <strong>rétrécir</strong>,{' '}
                  <strong>changer la forme</strong> (rectangle, carré, cœur, cercle,
                  coupe diagonale), <strong>rogner</strong> ou <strong>supprimer</strong>{' '}
                  l’image pour la retirer et en mettre une autre.
                </li>
                <li>
                  Vous pouvez ajouter <strong>autant de photos que vous voulez</strong>.
                </li>
                <li>
                  Un <strong>montant arbitraire</strong> est calculé selon l’espace pris
                  par vos photos sur la mosaïque, mais vous pouvez{' '}
                  <strong>modifier librement le montant</strong> avant de continuer.
                </li>
                <li>
                  Les boutons <strong>+</strong> et <strong>−</strong> permettent de{' '}
                  <strong>zoomer</strong> sur la mosaïque pour mieux ajuster vos images.
                </li>
                <li>
                  Quand tout vous convient, utilisez{' '}
                  <strong>Sauvegarder &amp; participer</strong> pour passer au
                  récapitulatif et à la suite.
                </li>
                <li>
                  Pour <strong>participer</strong>, un lien <strong>PayPal</strong> est
                  proposé, mais vous pouvez faire comme vous le souhaitez ou{' '}
                  <strong>me contacter</strong> directement.
                </li>
                <li className="hero-help__list-item--mail">
                  Si tout cela vous semble trop compliqué, vous pouvez simplement {' '}
                  <strong>m'envoyer votre image par e-mail</strong> :{' '}
                  <a href={`mailto:${HELP_CONTACT_EMAIL}`}>{HELP_CONTACT_EMAIL}</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
