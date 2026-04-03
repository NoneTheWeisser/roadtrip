import { cumulativeLengthsMeters, pointAlongPolyline } from './geo.js'

/**
 * Generate sample positions along a route at fixed drive-time intervals (MVP: uniform speed along polyline).
 *
 * @param {object} opts
 * @param {number[][]} opts.coordinates [[lon,lat], ...] from ORS GeoJSON LineString
 * @param {number} opts.durationSeconds ORS route summary duration
 * @param {number} opts.intervalMinutes e.g. 45
 * @param {boolean} [opts.includeStart=true]
 * @param {boolean} [opts.includeEnd=true]
 * @returns {{ offsetSeconds: number, lon: number, lat: number, metersAlongRoute: number }[]}
 */
export function timeBasedSamplesAlongRoute({
  coordinates,
  durationSeconds,
  intervalMinutes,
  includeStart = true,
  includeEnd = true,
}) {
  if (!coordinates?.length || durationSeconds <= 0 || intervalMinutes <= 0) {
    return []
  }

  const coords = coordinates.map((c) => [c[0], c[1]])
  const cum = cumulativeLengthsMeters(coords)
  const totalLen = cum[cum.length - 1] || 0
  const intervalSec = Math.round(intervalMinutes * 60)

  const offsets = new Set()

  if (includeStart) {
    offsets.add(0)
  }

  for (let t = intervalSec; t < durationSeconds; t += intervalSec) {
    offsets.add(t)
  }

  if (includeEnd && durationSeconds > 0) {
    offsets.add(durationSeconds)
  }

  const sorted = [...offsets].sort((a, b) => a - b)

  return sorted.map((offsetSeconds) => {
    const frac = durationSeconds > 0 ? offsetSeconds / durationSeconds : 0
    const metersAlong = frac * totalLen
    const [lon, lat] = pointAlongPolyline(coords, cum, metersAlong)
    return { offsetSeconds, lon, lat, metersAlongRoute: metersAlong }
  })
}
