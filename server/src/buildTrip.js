import { alertsForSample } from './alerts.js'
import {
  directionsDrivingGeoJson,
  geocodeSearch,
  reverseGeocode,
} from './openRouteService.js'
import { fetchHourlyForInstant } from './openMeteo.js'
import {
  buildStepTimeline,
  roadLabelAtOffset,
  simplifyPlaceLabel,
} from './routeLabels.js'
import { timeBasedSamplesAlongRoute } from './sampler.js'

/**
 * @typedef {object} TripMeta
 * @property {string} generatedAt ISO
 * @property {string} departureTime ISO
 * @property {number} sampleIntervalMinutes
 * @property {string[]} attribution
 */

/**
 * @typedef {object} TripSample
 * @property {number} offsetSeconds
 * @property {string} etaISO
 * @property {{ lon: number, lat: number }} position
 * @property {number} metersAlongRoute
 * @property {string | null} nearRoad from ORS step / road name
 * @property {string | null} nearPlace simplified reverse-geocode (city, state–style)
 * @property {import('./openMeteo.js').HourlyForecastSlice} weather
 * @property {ReturnType<typeof alertsForSample>} alerts
 */

/**
 * @param {object} input
 * @param {string} input.apiKey ORS
 * @param {string} input.originText
 * @param {string} input.destinationText
 * @param {Date} input.departureTime
 * @param {number} input.sampleIntervalMinutes
 * @param {{ get: (k: string) => any, set: (k: string, v: unknown, ttlMs: number) => void }} geocodeCache
 * @param {{ get: (k: string) => any, set: (k: string, v: unknown, ttlMs: number) => void }} directionsCache
 * @param {typeof fetch} [fetchImpl]
 */
export async function buildTrip(
  {
    apiKey,
    originText,
    destinationText,
    departureTime,
    sampleIntervalMinutes,
  },
  geocodeCache,
  directionsCache,
  fetchImpl = globalThis.fetch
) {
  const norm = (s) => s.trim().toLowerCase()

  const ogKey = `g:${norm(originText)}`
  let origin = geocodeCache.get(ogKey)
  if (!origin) {
    origin = await geocodeSearch(apiKey, originText, fetchImpl)
    geocodeCache.set(ogKey, origin, 10 * 60 * 1000)
  }

  const dtKey = `g:${norm(destinationText)}`
  let destination = geocodeCache.get(dtKey)
  if (!destination) {
    destination = await geocodeSearch(apiKey, destinationText, fetchImpl)
    geocodeCache.set(dtKey, destination, 10 * 60 * 1000)
  }

  const o = /** @type {[number, number]} */ ([origin.lon, origin.lat])
  const d = /** @type {[number, number]} */ ([destination.lon, destination.lat])

  const dirKey = `d:${o[0].toFixed(4)},${o[1].toFixed(4)}|${d[0].toFixed(4)},${d[1].toFixed(4)}`
  let route = directionsCache.get(dirKey)
  if (!route) {
    route = await directionsDrivingGeoJson(apiKey, o, d, fetchImpl)
    directionsCache.set(dirKey, route, 5 * 60 * 1000)
  }

  const samples = timeBasedSamplesAlongRoute({
    coordinates: route.coordinates,
    durationSeconds: route.durationSeconds,
    intervalMinutes: sampleIntervalMinutes,
    includeStart: true,
    includeEnd: true,
  })

  const stepTimeline = buildStepTimeline(route.rawFeature)

  /** @type {TripSample[]} */
  const enriched = []
  for (const s of samples) {
    const eta = new Date(departureTime.getTime() + s.offsetSeconds * 1000)
    const weather = await fetchHourlyForInstant(
      s.lat,
      s.lon,
      eta,
      fetchImpl
    )

    const nearRoad = roadLabelAtOffset(
      stepTimeline,
      s.offsetSeconds,
      route.durationSeconds
    )

    const revKey = `r:${s.lat.toFixed(3)},${s.lon.toFixed(3)}`
    let nearPlace = geocodeCache.get(revKey)
    if (nearPlace === undefined) {
      try {
        const rev = await reverseGeocode(apiKey, s.lon, s.lat, fetchImpl)
        nearPlace = simplifyPlaceLabel(rev.label)
        geocodeCache.set(revKey, nearPlace, 24 * 60 * 60 * 1000)
      } catch {
        geocodeCache.set(revKey, null, 5 * 60 * 1000)
        nearPlace = null
      }
    }

    enriched.push({
      offsetSeconds: s.offsetSeconds,
      etaISO: eta.toISOString(),
      position: { lon: s.lon, lat: s.lat },
      metersAlongRoute: s.metersAlongRoute,
      nearRoad,
      nearPlace,
      weather,
      alerts: alertsForSample(weather),
    })
  }

  /** @type {TripMeta} */
  const meta = {
    generatedAt: new Date().toISOString(),
    departureTime: departureTime.toISOString(),
    sampleIntervalMinutes,
    attribution: [
      'Route © OpenRouteService contributors',
      'Place labels near checkpoints © OpenRouteService (reverse geocode)',
      'Weather data © Open-Meteo (CC BY 4.0)',
      'Maps: configure attribution for your tile provider when MapLibre is added',
    ],
  }

  return {
    meta,
    route: {
      durationSeconds: route.durationSeconds,
      distanceMeters: route.distanceMeters ?? null,
      coordinates: route.coordinates,
      origin: { label: origin.label, lat: origin.lat, lon: origin.lon },
      destination: {
        label: destination.label,
        lat: destination.lat,
        lon: destination.lon,
      },
    },
    samples: enriched,
  }
}
