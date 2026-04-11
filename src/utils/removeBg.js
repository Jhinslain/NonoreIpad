/**
 * Envoie une image à remove.bg et renvoie un Blob PNG avec transparence.
 * @param {Blob} imageBlob
 * @param {string} apiKey
 */
export async function removeBackground(imageBlob, apiKey) {
  if (!apiKey) {
    throw new Error('Clé API remove.bg manquante (VITE_REMOVE_BG_API_KEY)')
  }

  const formData = new FormData()
  formData.append('image_file', imageBlob, 'upload.png')
  formData.append('size', 'auto')

  const res = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
    },
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`remove.bg: ${res.status} — ${text}`)
  }

  return res.blob()
}
