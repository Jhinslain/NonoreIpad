/**
 * Heure civile Europe/Paris pour une colonne PostgreSQL `timestamp without time zone`
 * (lisible tel quel dans le tableau Supabase).
 */
export function formatParisLocalTimestampForDb(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const g = (t) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}:${g('second')}`
}
