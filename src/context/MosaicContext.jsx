import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { GOAL_EUROS } from '../constants.js'
import { useStageLayout } from './StageLayoutContext.jsx'
import { computeGridFillStats } from '../utils/gridFill.js'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js'

const MosaicContext = createContext(null)

function rowToContribution(row) {
  if (!row) return null
  return {
    id: row.id,
    layer: row.layer,
    cellSpan: row.cell_span ?? 1,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    rotation: row.rotation ?? 0,
    maskType: row.mask_type ?? 'rect',
    imageUrl: row.image_url,
    priceEuros: (row.price_cents ?? 0) / 100,
    status: row.status ?? 'pending',
    contributorName: row.contributor_name,
    contributorEmail: row.contributor_email,
    createdAt: row.created_at,
    isDraft: false,
  }
}

export function MosaicProvider({ children }) {
  const { cellWidth, cellHeight, stageWidth, stageHeight } = useStageLayout()
  /** Données BDD (rechargement, temps réel). */
  const [savedContributions, setSavedContributions] = useState([])
  /** Brouillons : uniquement en mémoire, perdus au refresh. */
  const [draftContributions, setDraftContributions] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingDrafts, setSavingDrafts] = useState(false)
  const [selectedPremiumId, setSelectedPremiumId] = useState(null)
  const [configWarning, setConfigWarning] = useState(null)

  const contributions = useMemo(
    () => [...savedContributions, ...draftContributions],
    [savedContributions, draftContributions],
  )

  const draftIdsRef = useRef(new Set())
  const draftContributionsRef = useRef([])
  useEffect(() => {
    draftIdsRef.current = new Set(draftContributions.map((c) => c.id))
    draftContributionsRef.current = draftContributions
  }, [draftContributions])

  const draftCount = draftContributions.length

  /** La sélection concerne uniquement les brouillons (édition canevas / panneau). */
  useEffect(() => {
    if (selectedPremiumId == null) return
    const isDraft = draftContributions.some((c) => c.id === selectedPremiumId)
    if (!isDraft) setSelectedPremiumId(null)
  }, [selectedPremiumId, draftContributions])

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setSavedContributions([])
      setLoading(false)
      setConfigWarning(null)
      return
    }

    setConfigWarning(null)
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setSavedContributions([])
      setConfigWarning(error.message)
      setLoading(false)
      return
    }

    setSavedContributions((data || []).map(rowToContribution).filter(Boolean))
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!isSupabaseConfigured()) return undefined
    const ch = supabase
      .channel('contributions_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contributions' },
        () => {
          refresh()
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [refresh])

  const validatedTotal = useMemo(
    () =>
      savedContributions
        .filter((c) => c.status === 'validated')
        .reduce((s, c) => s + c.priceEuros, 0),
    [savedContributions],
  )

  /** Avancement global : uniquement ce qui est en base (visible par tous). */
  const { gridFillPercent, gridCellsFilled, gridCellsTotal } = useMemo(() => {
    const { filled, pct, total } = computeGridFillStats(
      savedContributions,
      cellWidth,
      cellHeight,
      stageWidth,
      stageHeight,
    )
    return {
      gridFillPercent: pct,
      gridCellsFilled: filled,
      gridCellsTotal: total,
    }
  }, [savedContributions, cellWidth, cellHeight, stageWidth, stageHeight])

  /**
   * Ajoute une image en **brouillon** uniquement (pas de BDD tant qu’on n’a pas confirmé « J’ai payé ! »).
   */
  const addDraftContribution = useCallback(async (draft) => {
    const id = crypto.randomUUID()
    const priceEuros = draft.priceEuros

    const contribution = {
      id,
      layer: draft.layer,
      cellSpan: draft.cellSpan ?? 1,
      x: draft.x,
      y: draft.y,
      width: draft.width,
      height: draft.height,
      rotation: draft.rotation ?? 0,
      maskType: draft.maskType ?? 'rect',
      imageUrl: URL.createObjectURL(draft.imageBlob),
      priceEuros,
      status: 'pending',
      contributorName: draft.contributorName,
      contributorEmail: draft.contributorEmail,
      createdAt: new Date().toISOString(),
      isDraft: true,
    }

    setDraftContributions((prev) => [contribution, ...prev])
    return contribution
  }, [])

  const insertOneContributionRemote = useCallback(async (d, imageBlob) => {
    const id = d.id
    const priceEuros = d.priceEuros
    const path = `mosaic/${id}.png`
    const { error: upErr } = await supabase.storage
      .from('mosaic-images')
      .upload(path, imageBlob, {
        contentType: 'image/png',
        upsert: true,
      })
    if (upErr) throw upErr

    const { data: pub } = supabase.storage.from('mosaic-images').getPublicUrl(path)
    const imageUrl = pub.publicUrl

    const row = {
      id,
      layer: d.layer,
      cell_span: d.cellSpan ?? 1,
      x: d.x,
      y: d.y,
      width: d.width,
      height: d.height,
      rotation: d.rotation ?? 0,
      mask_type: d.maskType,
      image_url: imageUrl,
      price_cents: Math.round(priceEuros * 100),
      status: 'pending',
      contributor_name: d.contributorName ?? null,
      contributor_email: d.contributorEmail ?? null,
    }

    const { error: insErr } = await supabase.from('contributions').insert(row)
    if (insErr) throw insErr
    return { id, imageUrl }
  }, [])

  /**
   * Envoie tous les brouillons vers Storage + Postgres, puis recharge la liste serveur.
   * Appelé depuis la page récapitulatif au moment de « J’ai payé ! » (pas au clic « Sauvegarder & Participer »).
   * Sans brouillon : ne fait rien en base.
   */
  const persistDraftsToSupabase = useCallback(async () => {
    const drafts = draftContributionsRef.current.filter((c) => c.isDraft)
    if (drafts.length === 0) {
      return { primaryId: null }
    }
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase non configuré.')
    }

    setSavingDrafts(true)
    setConfigWarning(null)
    let primaryId = null
    try {
      for (const d of drafts) {
        const res = await fetch(d.imageUrl)
        const blob = await res.blob()
        await insertOneContributionRemote(d, blob)
        if (!primaryId) primaryId = d.id
        if (d.imageUrl?.startsWith('blob:')) URL.revokeObjectURL(d.imageUrl)
      }
      setDraftContributions([])
      await refresh()
      return { primaryId }
    } catch (e) {
      console.error(e)
      setConfigWarning(e?.message || 'Échec de l’enregistrement')
      throw e
    } finally {
      setSavingDrafts(false)
    }
  }, [insertOneContributionRemote, refresh])

  const updateContributionGeometry = useCallback(async (id, geom) => {
    const { x, y, width, height, rotation } = geom
    setDraftContributions((prev) => {
      if (!prev.some((c) => c.id === id)) return prev
      return prev.map((c) =>
        c.id === id ? { ...c, x, y, width, height, rotation } : c,
      )
    })
    setSavedContributions((prev) => {
      if (!prev.some((c) => c.id === id)) return prev
      const next = prev.map((c) =>
        c.id === id ? { ...c, x, y, width, height, rotation } : c,
      )
      if (isSupabaseConfigured()) {
        void supabase
          .from('contributions')
          .update({ x, y, width, height, rotation })
          .eq('id', id)
      }
      return next
    })
  }, [])

  const updateContributionMask = useCallback(async (id, maskType) => {
    setDraftContributions((prev) => {
      if (!prev.some((c) => c.id === id)) return prev
      return prev.map((c) => (c.id === id ? { ...c, maskType } : c))
    })
    setSavedContributions((prev) => {
      if (!prev.some((c) => c.id === id)) return prev
      const next = prev.map((c) => (c.id === id ? { ...c, maskType } : c))
      if (isSupabaseConfigured()) {
        void supabase.from('contributions').update({ mask_type: maskType }).eq('id', id)
      }
      return next
    })
  }, [])

  const removeContribution = useCallback(
    async (id) => {
      const target = contributions.find((c) => c.id === id)
      if (target?.isDraft) {
        if (target.imageUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(target.imageUrl)
        }
        setDraftContributions((prev) => prev.filter((c) => c.id !== id))
        return
      }

      setSavedContributions((prev) => {
        const t = prev.find((c) => c.id === id)
        if (t?.imageUrl?.startsWith('blob:')) URL.revokeObjectURL(t.imageUrl)
        return prev.filter((c) => c.id !== id)
      })

      if (isSupabaseConfigured()) {
        await supabase.from('contributions').delete().eq('id', id)
      }
    },
    [contributions],
  )

  const updateContributionImage = useCallback(async (id, imageBlob) => {
    if (!imageBlob) return

    if (draftIdsRef.current.has(id)) {
      const nextUrl = URL.createObjectURL(imageBlob)
      setDraftContributions((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c
          if (c.imageUrl?.startsWith('blob:')) URL.revokeObjectURL(c.imageUrl)
          return { ...c, imageUrl: nextUrl }
        }),
      )
      return
    }

    if (!isSupabaseConfigured()) return

    const path = `mosaic/${id}.png`
    const { error: upErr } = await supabase.storage
      .from('mosaic-images')
      .upload(path, imageBlob, {
        contentType: 'image/png',
        upsert: true,
      })
    if (upErr) throw upErr

    const { data: pub } = supabase.storage.from('mosaic-images').getPublicUrl(path)
    const imageUrl = pub.publicUrl

    setSavedContributions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, imageUrl } : c)),
    )
    await supabase.from('contributions').update({ image_url: imageUrl }).eq('id', id)
  }, [])

  const updateContributionContact = useCallback(
    async (id, { firstName, lastName, email }) => {
      const contributor_name = [firstName?.trim(), lastName?.trim()]
        .filter(Boolean)
        .join(' ')
        .trim()
      const contributor_email = email?.trim() || null
      setSavedContributions((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                contributorName: contributor_name || null,
                contributorEmail: contributor_email,
              }
            : c,
        ),
      )
      if (!isSupabaseConfigured()) return
      const { error } = await supabase
        .from('contributions')
        .update({
          contributor_name: contributor_name || null,
          contributor_email,
        })
        .eq('id', id)
      if (error) throw error
    },
    [],
  )

  const value = useMemo(
    () => ({
      contributions,
      savedContributions,
      draftContributions,
      draftCount,
      loading,
      savingDrafts,
      goalEuros: GOAL_EUROS,
      validatedTotal,
      gridFillPercent,
      gridCellsFilled,
      gridCellsTotal,
      cellWidth,
      cellHeight,
      selectedPremiumId,
      setSelectedPremiumId,
      refresh,
      addDraftContribution,
      persistDraftsToSupabase,
      updateContributionGeometry,
      updateContributionMask,
      updateContributionImage,
      updateContributionContact,
      removeContribution,
      configWarning,
      supabaseReady: isSupabaseConfigured(),
    }),
    [
      contributions,
      savedContributions,
      draftContributions,
      draftCount,
      loading,
      savingDrafts,
      validatedTotal,
      gridFillPercent,
      gridCellsFilled,
      gridCellsTotal,
      cellWidth,
      cellHeight,
      selectedPremiumId,
      refresh,
      addDraftContribution,
      persistDraftsToSupabase,
      updateContributionGeometry,
      updateContributionMask,
      updateContributionImage,
      updateContributionContact,
      removeContribution,
      configWarning,
    ],
  )

  return (
    <MosaicContext.Provider value={value}>{children}</MosaicContext.Provider>
  )
}

export function useMosaic() {
  const ctx = useContext(MosaicContext)
  if (!ctx) throw new Error('useMosaic doit être utilisé dans MosaicProvider')
  return ctx
}
