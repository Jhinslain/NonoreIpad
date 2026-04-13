import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import emailjs from '@emailjs/browser'
import { CanvasStage } from '../components/CanvasStage.jsx'
import { Header } from '../components/Header.jsx'
import { useMosaic } from '../context/MosaicContext.jsx'
import qrCodeImg from '../assets/qrcode.png'

const PAYPAL_USER =
  import.meta.env.VITE_PAYPAL_ME_USERNAME || 'yourusername'

/** Base paypal.me sans montant final (ex. https://paypal.me/monpseudo). Sinon dérivé du nom d’utilisateur. */
const PAYPAL_ME_BASE = (
  import.meta.env.VITE_PAYPAL_ME_URL || `https://paypal.me/${PAYPAL_USER}`
).replace(/\/$/, '')

const EMAILJS_SERVICE = import.meta.env.VITE_EMAILJS_SERVICE_ID || ''
const EMAILJS_TEMPLATE = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || ''
const EMAILJS_PUBLIC = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || ''
const NOTIFY_EMAIL =
  import.meta.env.VITE_NOTIFY_EMAIL || 'vous@exemple.com'

function buildPayPalUrl(amountEuros) {
  return `${PAYPAL_ME_BASE}/${amountEuros.toFixed(2)}`
}

function parseContributorName(raw) {
  const t = raw?.trim()
  if (!t) return { firstName: '', lastName: '' }
  const parts = t.split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

export function SummaryPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { contributions, updateContributionContact, persistDraftsToSupabase } =
    useMosaic()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  /** null | 'upload' | 'contact' | 'email' — pour le libellé du chargement « J’ai payé ! » */
  const [payPhase, setPayPhase] = useState(null)
  const [checkoutStep, setCheckoutStep] = useState(1)
  const [isMobileCheckoutWizard, setIsMobileCheckoutWizard] = useState(false)

  useLayoutEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const apply = () => setIsMobileCheckoutWizard(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const contribution = useMemo(() => {
    if (location.state?.contribution?.id === id) {
      return location.state.contribution
    }
    return contributions.find((c) => c.id === id) || null
  }, [location.state, contributions, id])

  useEffect(() => {
    if (!contribution) return
    const { firstName: fn, lastName: ln } = parseContributorName(
      contribution.contributorName,
    )
    setFirstName(fn)
    setLastName(ln)
    setEmail(contribution.contributorEmail?.trim() || '')
  }, [contribution?.id])

  const amount =
    typeof location.state?.displayAmountEuros === 'number'
      ? location.state.displayAmountEuros
      : (contribution?.priceEuros ?? 0)

  const paypalUrl = buildPayPalUrl(amount)

  const stepTitles = useMemo(
    () => ({
      1: 'Aperçu actuel de la mosaïque',
      2: 'Vos coordonnées',
      3: `Je participe à ${amount.toFixed(2)} €`,
    }),
    [amount],
  )

  const stepVisibleClass = (step) =>
    !isMobileCheckoutWizard || checkoutStep === step
      ? 'summary-step summary-step--shown'
      : 'summary-step summary-step--hidden'

  const sendPaidEmail = async () => {
    if (!contribution) return
    if (!email.trim()) {
      setStatus('Indiquez une adresse e-mail.')
      return
    }
    setBusy(true)
    setStatus(null)
    setPayPhase(contribution.isDraft ? 'upload' : 'contact')
    try {
      if (contribution.isDraft) {
        await persistDraftsToSupabase()
      }
      setPayPhase('contact')
      await updateContributionContact(contribution.id, {
        firstName,
        lastName,
        email,
      })
    } catch (e) {
      setPayPhase(null)
      setStatus(
        e?.message ||
          'Impossible d’enregistrer la participation ou vos coordonnées.',
      )
      setBusy(false)
      return
    }

    const goMerci = () => {
      setPayPhase(null)
      navigate('/merci', {
        replace: true,
        state: { firstName: firstName.trim() || undefined },
      })
    }

    if (!EMAILJS_SERVICE || !EMAILJS_TEMPLATE || !EMAILJS_PUBLIC) {
      setPayPhase(null)
      setBusy(false)
      goMerci()
      return
    }
    try {
      setPayPhase('email')
      const contributor_name = [firstName.trim(), lastName.trim()]
        .filter(Boolean)
        .join(' ')
      await emailjs.send(
        EMAILJS_SERVICE,
        EMAILJS_TEMPLATE,
        {
          contribution_id: contribution.id,
          amount_euros: amount.toFixed(2),
          layer: String(contribution.layer),
          contributor_first_name: firstName.trim(),
          contributor_last_name: lastName.trim(),
          contributor_name,
          contributor_email: email.trim(),
          notify_to: NOTIFY_EMAIL,
        },
        { publicKey: EMAILJS_PUBLIC },
      )
      goMerci()
    } catch (e) {
      setStatus(
        e?.text || e?.message || (typeof e === 'string' ? e : 'Erreur EmailJS'),
      )
    } finally {
      setPayPhase(null)
      setBusy(false)
    }
  }

  if (!contribution) {
    return (
      <div className="home-page">
        <div className="app-shell">
          <Header />
          <main className="hero-main">
            <div className="summary-page summary-page--checkout">
              <p>Contribution introuvable.</p>
              <Link to="/">Retour à l’éditeur</Link>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="home-page">
      <div className="app-shell">
        <Header />
        <main className="hero-main">
          <div className="summary-page summary-page--checkout">
            <h1 className="summary-page__title">Paiement & participation</h1>
            <p
              className="summary-page__intro muted summary-page__intro--desktop"
              aria-hidden={isMobileCheckoutWizard}
            >
              Étape 1 : Aperçu actuel de la mosaïque {'>'} Étape 2 : Vos
              coordonnées {'>'} Étape 3 : Je participe à {amount.toFixed(2)} €
            </p>
            {isMobileCheckoutWizard && (
              <p className="summary-page__intro muted summary-page__intro--mobile" aria-live="polite">
                <span className="summary-page__step-badge">
                  Étape {checkoutStep} sur 3
                </span>
                <span className="summary-page__step-label">
                  {stepTitles[checkoutStep]}
                </span>
              </p>
            )}

            <div className="summary-layout summary-layout--stacked">
              <section
                className={`summary-result ${stepVisibleClass(1)}`}
                aria-label="Aperçu de la mosaïque"
                aria-hidden={isMobileCheckoutWizard && checkoutStep !== 1}
              >
                <h2 className="summary-result__title">
                  Étape 1 · Aperçu actuel de la mosaïque
                </h2>
                <div className="summary-canvas-wrap">
                  <CanvasStage variant="summary" />
                </div>
              </section>

              <div
                className={`summary-card summary-card--form ${stepVisibleClass(2)}`}
                aria-hidden={isMobileCheckoutWizard && checkoutStep !== 2}
              >
                <h2 className="summary-card__h">Étape 2 · Vos coordonnées</h2>
                <div className="summary-form">
                  <label className="summary-field">
                    <span>Prénom</span>
                    <input
                      type="text"
                      name="firstName"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </label>
                  <label className="summary-field">
                    <span>Nom</span>
                    <input
                      type="text"
                      name="lastName"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </label>
                  <label className="summary-field">
                    <span>E-mail</span>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div
                className={`summary-card summary-card--pay ${stepVisibleClass(3)}`}
                aria-hidden={isMobileCheckoutWizard && checkoutStep !== 3}
              >
                <p className="summary-amount-line">
                  <strong>Étape 3 · Je participe à :</strong>{' '}
                  <span className="summary-amount-value">
                    {amount.toFixed(2)} €
                  </span>
                </p>
                <p className="muted small summary-pay-hint">
                  Scannez le QR code ou ouvrez le lien PayPal.me sur votre
                  téléphone.
                </p>
                <a
                  className="summary-paypal-link"
                  href={paypalUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ouvrir PayPal.me ({amount.toFixed(2)} €)
                </a>
                <div className="summary-qr-wrap">
                  <img
                    src={qrCodeImg}
                    alt="QR code vers le paiement PayPal"
                    className="summary-qr"
                    width={200}
                    height={200}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary summary-paid-btn"
                  disabled={busy}
                  onClick={sendPaidEmail}
                >
                  {busy ? 'Patienter…' : 'J’ai payé !'}
                </button>
                {status && <p className="summary-status">{status}</p>}
              </div>

              {isMobileCheckoutWizard && (
                <div
                  className="summary-wizard-nav"
                  role="group"
                  aria-label="Navigation entre les étapes"
                >
                  <button
                    type="button"
                    className="btn btn-ghost summary-wizard-nav__prev"
                    disabled={checkoutStep <= 1 || busy}
                    onClick={() => setCheckoutStep((s) => Math.max(1, s - 1))}
                  >
                    Précédent
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary summary-wizard-nav__next"
                    disabled={checkoutStep >= 3 || busy}
                    onClick={() => setCheckoutStep((s) => Math.min(3, s + 1))}
                  >
                    Suivant
                  </button>
                </div>
              )}

              <Link
                to="/"
                className={`back-link summary-back${busy ? ' summary-back--disabled' : ''}`}
                aria-disabled={busy}
                onClick={(e) => busy && e.preventDefault()}
              >
                ← Retour à l’éditeur
              </Link>
            </div>

            {busy && payPhase && (
              <div
                className="summary-pay-overlay"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                <div className="summary-pay-overlay__box">
                  <span className="summary-pay-spinner" aria-hidden="true" />
                  <p className="summary-pay-overlay__text">
                    {payPhase === 'upload' &&
                      'Enregistrement des photos sur le serveur… Avec plusieurs images, ça peut prendre un peu de temps.'}
                    {payPhase === 'contact' &&
                      'Enregistrement de tes coordonnées…'}
                    {payPhase === 'email' &&
                      'Envoi de la confirmation par e-mail…'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
