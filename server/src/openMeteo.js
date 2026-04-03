/**
 * Open-Meteo public API — non-commercial free tier; attribute in product (CC-BY 4.0).
 * https://open-meteo.com/en/terms
 */

const BASE = 'https://api.open-meteo.com/v1/forecast'

/**
 * @typedef {object} HourlyForecastSlice
 * @property {string} time ISO time from API (local to forecast location per timezone param)
 * @property {number|null} precipitationProbability
 * @property {number|null} precipitationMm
 * @property {number|null} rainMm
 * @property {number|null} snowfallCm
 * @property {number|null} weatherCode WMO
 * @property {number|null} windSpeedMs
 * @property {number|null} windGustsMs
 */

/**
 * Fetch hourly series and pick the hour closest to `instant`.
 * @param {number} latitude
 * @param {number} longitude
 * @param {Date} instant
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<HourlyForecastSlice>}
 */
export async function fetchHourlyForInstant(
  latitude,
  longitude,
  instant,
  fetchImpl = globalThis.fetch
) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: [
      'precipitation_probability',
      'precipitation',
      'rain',
      'snowfall',
      'weathercode',
      'windspeed_10m',
      'windgusts_10m',
    ].join(','),
    forecast_days: '3',
    timezone: 'auto',
  })

  const res = await fetchImpl(`${BASE}?${params}`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Open-Meteo ${res.status}: ${text.slice(0, 200)}`)
  }

  /** @type {any} */
  const data = await res.json()
  return mapOpenMeteoToHourlySlice(data, instant)
}

/**
 * Map raw Open-Meteo JSON + target instant to a single hourly slice (test hook).
 * @param {any} data
 * @param {Date} instant
 * @returns {HourlyForecastSlice}
 */
export function mapOpenMeteoToHourlySlice(data, instant) {
  const hourly = data?.hourly
  if (!hourly?.time?.length) {
    throw new Error('Open-Meteo: missing hourly.time')
  }

  const targetMs = instant.getTime()
  let bestIdx = 0
  let bestDiff = Infinity

  for (let i = 0; i < hourly.time.length; i += 1) {
    const t = new Date(hourly.time[i]).getTime()
    const diff = Math.abs(t - targetMs)
    if (diff < bestDiff) {
      bestDiff = diff
      bestIdx = i
    }
  }

  const idx = bestIdx

  return {
    time: hourly.time[idx],
    precipitationProbability: hourly.precipitation_probability?.[idx] ?? null,
    precipitationMm: hourly.precipitation?.[idx] ?? null,
    rainMm: hourly.rain?.[idx] ?? null,
    snowfallCm: hourly.snowfall?.[idx] ?? null,
    weatherCode: hourly.weathercode?.[idx] ?? null,
    windSpeedMs: hourly.windspeed_10m?.[idx] ?? null,
    windGustsMs: hourly.windgusts_10m?.[idx] ?? null,
  }
}
