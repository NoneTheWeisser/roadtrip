import { describe, expect, it } from 'vitest'

import { timeBasedSamplesAlongRoute } from './sampler.js'

describe('timeBasedSamplesAlongRoute', () => {
  it('places samples at time-fractions along a simple two-point line', () => {
    const coordinates = [
      [0, 0],
      [0.1, 0],
    ]
    const durationSeconds = 3600
    const samples = timeBasedSamplesAlongRoute({
      coordinates,
      durationSeconds,
      intervalMinutes: 15,
      includeStart: true,
      includeEnd: true,
    })

    expect(samples.length).toBeGreaterThan(0)
    expect(samples[0].offsetSeconds).toBe(0)
    expect(typeof samples[0].metersAlongRoute).toBe('number')

    for (const s of samples) {
      expect(s.lon).toBeGreaterThanOrEqual(0)
      expect(s.lon).toBeLessThanOrEqual(0.1)
      expect(s.lat).toBeCloseTo(0, 6)
      expect(s.metersAlongRoute).toBeGreaterThanOrEqual(0)
    }
  })

  it('returns empty for invalid duration', () => {
    expect(
      timeBasedSamplesAlongRoute({
        coordinates: [[0, 0], [1, 1]],
        durationSeconds: 0,
        intervalMinutes: 30,
      })
    ).toEqual([])
  })
})
