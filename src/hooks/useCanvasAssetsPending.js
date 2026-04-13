import { useEffect, useMemo, useState } from 'react'

/**
 * Tant que la liste Supabase charge ou que le gabarit / les photos ne sont pas préchargés,
 * retourne `true` (afficher un état de chargement sur le canevas).
 */
export function useCanvasAssetsPending(loadingContributions, templateUrl, contributions) {
  const imageUrls = useMemo(
    () => contributions.map((c) => c.imageUrl).filter(Boolean),
    [contributions],
  )

  const urlsKey = useMemo(
    () => `${templateUrl || ''}\0${imageUrls.join('\0')}`,
    [templateUrl, imageUrls],
  )

  const [preloaded, setPreloaded] = useState(false)

  useEffect(() => {
    if (loadingContributions) {
      setPreloaded(false)
      return undefined
    }

    const urls = [templateUrl, ...imageUrls].filter(Boolean)
    if (urls.length === 0) {
      setPreloaded(true)
      return undefined
    }

    let cancelled = false
    let remaining = urls.length

    const bump = () => {
      remaining -= 1
      if (!cancelled && remaining <= 0) {
        setPreloaded(true)
      }
    }

    setPreloaded(false)

    for (const url of urls) {
      const img = new Image()
      if (typeof url === 'string' && !url.startsWith('blob:')) {
        img.crossOrigin = 'anonymous'
      }
      img.onload = bump
      img.onerror = bump
      img.src = url
    }

    return () => {
      cancelled = true
    }
  }, [loadingContributions, urlsKey, templateUrl, imageUrls])

  return loadingContributions || !preloaded
}
