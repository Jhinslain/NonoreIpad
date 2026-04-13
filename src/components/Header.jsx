import {
  HERO_H1_LINE1,
  HERO_H1_LINE2_PREFIX,
  HERO_H2,
  RECIPIENT_NAME,
} from '../constants.js'
import { HeroHelp } from './HeroHelp.jsx'

export function Header() {
  return (
    <header className="app-header">
      <p className="hero-party-badge">
        <span className="hero-party-badge__icon" aria-hidden="true">
          🎂
        </span>
        Cagnotte anniversaire
        <span aria-hidden="true"> 🎈</span>
      </p>
      <h1 className="hero-title">
        <span className="hero-title__line hero-title__line--first">
          {HERO_H1_LINE1}
        </span>
        <span className="hero-title__line hero-title__line--second">
          {HERO_H1_LINE2_PREFIX}
          <span className="hero-name">{RECIPIENT_NAME}</span>
          <span aria-hidden="true"> ✨</span>
        </span>
      </h1>
      <h2 className="hero-subtitle">
        <span className="hero-subtitle__lead" aria-hidden="true">
          🎁
        </span>
        {HERO_H2}
      </h2>
      <HeroHelp />
    </header>
  )
}
