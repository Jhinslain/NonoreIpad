import { useMosaic } from '../context/MosaicContext.jsx'

const statusLabel = {
  pending: 'En attente',
  paid_reported: 'Paiement signalé',
  validated: 'Validé',
}

export function ContributionList() {
  const { contributions, loading } = useMosaic()
  const recent = contributions.slice(0, 12)

  if (loading && recent.length === 0) {
    return (
      <div className="contribution-list">
        <p className="muted">Chargement…</p>
      </div>
    )
  }

  return (
    <div className="contribution-list">
      {recent.length === 0 ? (
        <p className="muted">Aucune contribution pour le moment.</p>
      ) : (
        <ul>
          {recent.map((c) => (
            <li key={c.id}>
              <div className="contrib-row">
                <span className="contrib-name">
                  {c.contributorName || 'Anonyme'}
                </span>
                <span className="contrib-meta">
                  pièce {c.layer === 2 ? 'magie' : 'grille'}
                </span>
              </div>
              <span className={`badge badge-${c.status}`}>
                {statusLabel[c.status] || c.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
