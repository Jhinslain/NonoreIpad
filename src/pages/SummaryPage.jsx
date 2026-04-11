import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
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
  const { contributions, updateContributionContact } = useMosaic()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)

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

  const sendPaidEmail = async () => {
    if (!contribution) return
    if (!email.trim()) {
      setStatus('Indiquez une adresse e-mail.')
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      await updateContributionContact(contribution.id, {
        firstName,
        lastName,
        email,
      })
    } catch (e) {
      setStatus(e?.message || 'Impossible d’enregistrer vos coordonnées.')
      setBusy(false)
      return
    }

    if (!EMAILJS_SERVICE || !EMAILJS_TEMPLATE || !EMAILJS_PUBLIC) {
      setStatus(
        'Coordonnées enregistrées. Configurez EmailJS (VITE_EMAILJS_*) pour l’envoi automatique.',
      )
      setBusy(false)
      return
    }
    try {
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
      setStatus('Merci ! Votre paiement a été signalé.')
    } catch (e) {
      setStatus(
        e?.text || e?.message || (typeof e === 'string' ? e : 'Erreur EmailJS'),
      )
    } finally {
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
            <p className="summary-page__intro muted">
              Vérifiez l’aperçu sur la mosaïque, renseignez vos coordonnées,
              puis réglez le montant et confirmez votre paiement.
            </p>

            <div className="summary-layout summary-layout--stacked">
              <section
                className="summary-result"
                aria-label="Aperçu de la mosaïque"
              >
                <h2 className="summary-result__title">Aperçu actuel de la mosaïque</h2>
                <div className="summary-canvas-wrap">
                  <CanvasStage variant="summary" />
                </div>
              </section>

              <div className="summary-card summary-card--form">
                <h2 className="summary-card__h">Vos coordonnées</h2>
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

              <div className="summary-card summary-card--pay">
                <p className="summary-amount-line">
                  <strong>Montant à régler :</strong>{' '}
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
                  {busy ? 'Envoi…' : 'J’ai payé !'}
                </button>
                {status && <p className="summary-status">{status}</p>}
              </div>

              <Link to="/" className="back-link summary-back">
                ← Retour à l’éditeur
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
