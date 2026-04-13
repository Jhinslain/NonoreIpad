/**
 * Portrait Smart Case 13″ : **45 × 58** carreaux sur le rectangle (**2610** cases),
 * dont **2500** sur la matière utile (trous languette exclus) — chiffre porté dans les textes.
 * Ratio proche 45∶58 (~23,1∶28,6). Rabat 11 col. + corps 11 + 11 + 12.
 */
export const GRID_COLS = 45
export const GRID_ROWS = 58

/** 45×58 — base du calcul du % de remplissage (rectangle quadrillage complet, 2610 cases). */
export const GRID_RECT_CELL_COUNT = GRID_COLS * GRID_ROWS

/**
 * Chiffre affiché dans les textes (objectif mosaïque « coque »), distinct du calcul % (2610).
 */
export const GRID_TEXT_CELL_COUNT = 2500

/** Rabat magnétique : colonnes 0–10 (pliure à droite de la colonne 10). */
export const GRID_FLAP_COLS = 7

/** Colonnes par volet du corps (3 segments), somme = GRID_COLS - GRID_FLAP_COLS. */
export const GRID_VOLET_COLS = [11, 11, 12]

/**
 * Lignes de grille « coupées » en haut et en bas sur les colonnes rabat
 * (les deux rectangles vides au-dessus / en dessous de la languette).
 * À régler pour caler le quadrillage sur le PNG ; avec 45×58 et rabat 11 → 5 donne 2500 cases utiles.
 */
export const FLAP_CORNER_ROWS_EACH = 7

/** Objectif de collecte (1000 €). */
export const GOAL_EUROS = 1000

/** Tarif par cellule occupée (€) — même base que le panneau de participation. */
export const PARTICIPATION_PRICE_PER_CELL_EUR = 0.4

/** Prénom à mettre en avant (couleur). */
export const RECIPIENT_NAME =
  import.meta.env.VITE_RECIPIENT_NAME || 'Nonore'

/** Titre H1 — première ligne. */
export const HERO_H1_LINE1 =
  import.meta.env.VITE_HERO_H1_LINE1 || '25 ANS : 2.5k reaux'

/** Titre H1 — avant le prénom (ex. Pour l’iPad Pro 13" de ). */
export const HERO_H1_LINE2_PREFIX =
  import.meta.env.VITE_HERO_H1_LINE2_PREFIX ||
  "Pour l'iPad Pro 13\" de "

/** Sous-titre H2. */
export const HERO_H2 =
  import.meta.env.VITE_HERO_H2 ||
  `Remplissons cette mosaïque : ${GRID_TEXT_CELL_COUNT} cases à personnaliser. Une fois complétée, elle sera imprimée sur la coque de protection de son futur iPad.`

/**
 * Fin de campagne (participation) : 28 avril, fin de journée Europe/Paris.
 * ISO avec décalage pour éviter les bugs selon le navigateur.
 */
export const CAMPAIGN_DEADLINE_ISO = '2026-04-28T23:59:59+02:00'

/** Texte complémentaire sous le compte à rebours. */
export const CAMPAIGN_DEADLINE_NOTE =
  'Date limite : 28 avril (pour une livraison le 09 mai)'

/**
 * Échelle de secours avant chargement du gabarit (`image_0.png`) ; le vrai stage = dimensions naturelles du PNG.
 */
export const FALLBACK_CELL_SIZE = 10

/** Référence écran iPad (doc uniquement). */
export const IPAD_LOGIC_SHORT = 2064
export const IPAD_LOGIC_LONG = 2752

/** Gabarit officiel rogné (PNG) : `public/image_0.png` ou `VITE_CASE_TEMPLATE_URL`. */
export const CASE_TEMPLATE_URL =
  import.meta.env.VITE_CASE_TEMPLATE_URL || '/image_0.png'

/** E-mail affiché dans l’aide (participation simplifiée). */
export const HELP_CONTACT_EMAIL =
  import.meta.env.VITE_HELP_CONTACT_EMAIL || 'levreaughislain@gmail.com'

export const MASK_TYPES = {
  rect: 'Rectangle',
  square: 'Carré (1:1)',
  circle: 'Cercle',
  heart: 'Cœur',
  triangle: 'Coupe diagonale',
}

export const LAYER1_CELL_OPTIONS = [
  { value: 1, label: '1 cellule (1 €)', cells: 1 },
  { value: 4, label: '4 cellules (2×2 — 4 €)', cells: 4 },
  { value: 9, label: '9 cellules (3×3 — 9 €)', cells: 9 },
]
