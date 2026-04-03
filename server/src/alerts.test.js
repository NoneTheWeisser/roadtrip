import { describe, expect, it } from 'vitest'

import { alertsForSample } from './alerts.js'

describe('alertsForSample', () => {
  it('warns on high precip probability', () => {
    const alerts = alertsForSample({
      time: 'x',
      precipitationProbability: 50,
      precipitationMm: 0,
      rainMm: 0,
      snowfallCm: 0,
      weatherCode: 1,
      windSpeedMs: 2,
      windGustsMs: 4,
    })
    expect(alerts.some((a) => a.code === 'precip')).toBe(true)
  })

  it('warns on strong gusts', () => {
    const alerts = alertsForSample({
      time: 'x',
      precipitationProbability: 0,
      precipitationMm: 0,
      rainMm: 0,
      snowfallCm: 0,
      weatherCode: 2,
      windSpeedMs: 5,
      windGustsMs: 20,
    })
    expect(alerts.some((a) => a.code === 'wind')).toBe(true)
  })

  it('respects custom thresholds', () => {
    const alerts = alertsForSample(
      {
        time: 'x',
        precipitationProbability: 30,
        precipitationMm: 0,
        rainMm: 0,
        snowfallCm: 0,
        weatherCode: 2,
        windSpeedMs: 2,
        windGustsMs: 3,
      },
      { precipProbability: 25 }
    )
    expect(alerts.some((a) => a.code === 'precip')).toBe(true)
  })
})
