/** @param {number} deg */
function toRad(deg) {
  return (deg * Math.PI) / 180
}

/**
 * Great-circle distance between two WGS84 points (meters).
 */
export function haversineMeters(lon1, lat1, lon2, lat2) {
  const R = 6_371_000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Cumulative lengths along a LineString [[lon,lat], ...] in meters.
 * @param {number[][]} coords
 * @returns {number[]} cumulative[i] = distance from coord[0] to coord[i] along the polyline
 */
export function cumulativeLengthsMeters(coords) {
  const cum = [0]
  for (let i = 1; i < coords.length; i += 1) {
    const [lonA, latA] = coords[i - 1]
    const [lonB, latB] = coords[i]
    cum.push(cum[i - 1] + haversineMeters(lonA, latA, lonB, latB))
  }
  return cum
}

/**
 * Point on polyline at distance `metersAlong` from the start (clamped).
 * @param {number[][]} coords
 * @param {number[]} cumLengths from `cumulativeLengthsMeters`
 * @param {number} metersAlong
 * @returns {[number, number]} [lon, lat]
 */
export function pointAlongPolyline(coords, cumLengths, metersAlong) {
  if (coords.length === 0) {
    throw new Error('empty coordinates')
  }
  if (coords.length === 1) {
    return /** @type {[number, number]} */ (coords[0].slice(0, 2))
  }

  const total = cumLengths[cumLengths.length - 1]
  const target = Math.min(Math.max(metersAlong, 0), total)

  let seg = 0
  while (seg < cumLengths.length - 1 && cumLengths[seg + 1] < target) {
    seg += 1
  }

  const startLen = cumLengths[seg]
  const endLen = cumLengths[seg + 1]
  const segLen = endLen - startLen || 1
  const t = (target - startLen) / segLen
  const [lonA, latA] = coords[seg]
  const [lonB, latB] = coords[seg + 1]
  return [lonA + t * (lonB - lonA), latA + t * (latB - latA)]
}
