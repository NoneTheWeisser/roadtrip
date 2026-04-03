/**
 * Threshold-based alerts for trip samples (tune for your tolerance).
 */

/** @typedef {import('./openMeteo.js').HourlyForecastSlice} HourlyForecastSlice */

export const defaultAlertThresholds = {
  /** 0–100; alert if probability >= this */
  precipProbability: 45,
  /** m/s; alert if gusts >= this */
  windGustsMs: 14,
  /** WMO codes: snow / ice rough band (conservative MVP) */
  snowWeatherCodeMin: 71,
}

/**
 * @param {HourlyForecastSlice} weather
 * @param {Partial<typeof defaultAlertThresholds>} [thresholds]
 * @returns {{ level: 'warning' | 'watch'; code: string; message: string }[]}
 */
export function alertsForSample(weather, thresholds = {}) {
  const t = { ...defaultAlertThresholds, ...thresholds }
  const out = []

  const p = weather.precipitationProbability
  if (p != null && p >= t.precipProbability) {
    out.push({
      level: 'warning',
      code: 'precip',
      message: `Precipitation probability ${Math.round(p)}% at this point.`,
    })
  }

  const gust = weather.windGustsMs
  if (gust != null && gust >= t.windGustsMs) {
    out.push({
      level: 'warning',
      code: 'wind',
      message: `Wind gusts around ${gust.toFixed(0)} m/s.`,
    })
  }

  const wc = weather.weatherCode
  if (wc != null && wc >= t.snowWeatherCodeMin) {
    out.push({
      level: 'warning',
      code: 'snow_ice',
      message: 'Snow or ice in hourly code — verify local conditions.',
    })
  }

  return out
}
