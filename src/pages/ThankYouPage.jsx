import { Link, useLocation } from 'react-router-dom'
import { Header } from '../components/Header.jsx'

export function ThankYouPage() {
  const location = useLocation()
  const firstName = location.state?.firstName?.trim()

  return (
    <div className="home-page">
      <div className="app-shell">
        <Header />
        <main className="hero-main">
          <div className="thank-you-page">
            <div className="thank-you-card">
              <p className="thank-you-emoji" aria-hidden="true">
                💛
              </p>
              <h1 className="thank-you-title">Merci infiniment !</h1>
              <p className="thank-you-text">
                {firstName ? (
                  <>
                    <strong>{firstName}</strong>, merci d’avoir participé à la
                    cagnotte pour l'anniversaire de Nonore.
                  </>
                ) : (
                  <>
                    Merci d’avoir participé à la cagnotte, c’est super sympa de
                    ta part pour l'anniversaire de Nonore.
                  </>
                )}
              </p>
              <p className="thank-you-sub muted">
                Ta contribution à été ajoutée à la mosaïque et pour le cadeau
                collectif. Encore merci !
              </p>
              <Link to="/" className="btn btn-primary thank-you-back">
                Retour à la mosaïque
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
