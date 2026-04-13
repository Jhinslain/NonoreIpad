import { useEffect, useMemo, useState } from 'react'
import {
  CAMPAIGN_DEADLINE_ISO,
  CAMPAIGN_DEADLINE_NOTE,
} from '../constants.js'

function getRemaining(deadline) {
  const end = new Date(deadline).getTime()
  const diff = end - Date.now()
  if (diff <= 0) return { expired: true, days: 0, hours: 0 }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  return { expired: false, days, hours }
}

export function CountdownBanner() {
  const [, setTick] = useState(0)
  const deadline = useMemo(
    () => CAMPAIGN_DEADLINE_ISO,
    [],
  )

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60000)
    return () => clearInterval(t)
  }, [])

  const { expired, days, hours } = getRemaining(deadline)

  return (
    <aside className="countdown-banner" aria-live="polite">
      <div className="countdown-banner__inner">
        {expired ? (
          <p className="countdown-banner__main">
            <span className="countdown-banner__emoji" aria-hidden="true">
              🎈
            </span>{' '}
            La date limite de participation est passée.
          </p>
        ) : (
          <p className="countdown-banner__main">
            <span className="countdown-banner__emoji" aria-hidden="true">
              🎊
            </span>{' '}
            Plus que <strong>{days}</strong> jour{days !== 1 ? 's' : ''} pour participer
            !
            <span className="countdown-banner__sparkles" aria-hidden="true">
              {' '}
              ⏳✨
            </span>
          </p>
        )}
        <p className="countdown-banner__note">{CAMPAIGN_DEADLINE_NOTE}</p>
      </div>
    </aside>
  )
}
