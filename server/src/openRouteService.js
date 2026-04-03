const ORS_BASE = 'https://api.openrouteservice.org'

/**
 * @param {string} apiKey
 * @param {string} text
 * @param {typeof fetch} [fetchImpl]
 */
export async function geocodeSearch(apiKey, text, fetchImpl = globalThis.fetch) {
  const q = new URLSearchParams({ text, size: '1' })
  const res = await fetchImpl(`${ORS_BASE}/geocode/search?${q}`, {
    headers: { Authorization: apiKey },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`ORS geocode ${res.status}: ${body.slice(0, 200)}`)
  }
  /** @type {any} */
  const data = await res.json()
  const feat = data?.features?.[0]
  if (!feat?.geometry?.coordinates) {
    throw new Error(`No geocode result for "${text}"`)
  }
  const [lon, lat] = feat.geometry.coordinates
  const label =
    feat.properties?.label || feat.properties?.name || text
  return { lon, lat, label }
}

/**
 * Reverse geocode a point (ORS quota: counts against your geocode allowance).
 * @param {string} apiKey
 * @param {number} lon
 * @param {number} lat
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ label: string }>}
 */
export async function reverseGeocode(apiKey, lon, lat, fetchImpl = globalThis.fetch) {
  const q = new URLSearchParams({
    'point.lon': String(lon),
    'point.lat': String(lat),
    size: '1',
  })
  const res = await fetchImpl(`${ORS_BASE}/geocode/reverse?${q}`, {
    headers: { Authorization: apiKey },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`ORS reverse ${res.status}: ${body.slice(0, 200)}`)
  }
  /** @type {any} */
  const data = await res.json()
  const feat = data?.features?.[0]
  const label =
    feat?.properties?.label ||
    feat?.properties?.name ||
    ''
  if (!label) {
    throw new Error('ORS reverse: no label')
  }
  return { label }
}

/**
 * @param {string} apiKey
 * @param {[number, number]} origin [lon, lat]
 * @param {[number, number]} dest [lon, lat]
 * @param {typeof fetch} [fetchImpl]
 */
export async function directionsDrivingGeoJson(
  apiKey,
  origin,
  dest,
  fetchImpl = globalThis.fetch
) {
  const res = await fetchImpl(
    `${ORS_BASE}/v2/directions/driving-car/geojson`,
    {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [origin, dest],
        units: 'm',
      }),
    }
  )
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`ORS directions ${res.status}: ${body.slice(0, 300)}`)
  }
  /** @type {any} */
  const data = await res.json()
  const feat = data?.features?.[0]
  if (!feat?.geometry?.coordinates?.length) {
    throw new Error('ORS returned no route geometry')
  }

  const coords = feat.geometry.coordinates
  const summary = feat.properties?.summary
  const durationSeconds = Math.round(summary?.duration ?? 0)
  const distanceMeters = summary?.distance

  return {
    coordinates: coords,
    durationSeconds,
    distanceMeters,
    rawFeature: feat,
  }
}
