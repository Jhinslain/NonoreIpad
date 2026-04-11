/**
 * Fond décoratif (confettis, emojis, halos) — purement visuel, sans interaction.
 */
const CONFETTI_COUNT = 28

const FLOAT_EMOJIS = ['🎉', '🎈', '✨', '🎂', '🎁', '🥳', '💜', '🎊', '🌟', '💖']

export function FestiveBackground() {
  return (
    <div className="festive-bg" aria-hidden="true">
      <div className="festive-bg__blobs" />
      <div className="festive-bg__confetti">
        {Array.from({ length: CONFETTI_COUNT }, (_, i) => (
          <span
            key={i}
            className={`festive-bg__confetti-piece festive-bg__confetti-piece--${i % 5}`}
            style={{
              left: `${(i * 37 + (i % 7) * 11) % 96}%`,
              animationDelay: `${(i * 0.22).toFixed(2)}s`,
              animationDuration: `${9 + (i % 5)}s`,
            }}
          />
        ))}
      </div>
      <div className="festive-bg__floats">
        {FLOAT_EMOJIS.map((emoji, i) => (
          <span
            key={`${emoji}-${i}`}
            className="festive-bg__emoji"
            style={{
              left: `${8 + (i * 9.2) % 84}%`,
              animationDelay: `${(i * 0.55).toFixed(2)}s`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>
    </div>
  )
}
