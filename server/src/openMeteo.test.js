import { describe, expect, it } from 'vitest'

import { mapOpenMeteoToHourlySlice } from './openMeteo.js'

describe('mapOpenMeteoToHourlySlice', () => {
  it('picks the nearest hourly slot to the target instant', () => {
    const data = {
      hourly: {
        time: [
          '2026-04-03T10:00:00Z',
          '2026-04-03T11:00:00Z',
          '2026-04-03T12:00:00Z',
        ],
        precipitation_probability: [10, 80, 20],
        precipitation: [0, 1, 0],
        rain: [0, 1, 0],
        snowfall: [0, 0, 0],
        weathercode: [0, 61, 0],
        windspeed_10m: [2, 4, 3],
        windgusts_10m: [5, 12, 6],
      },
    }

    const slice = mapOpenMeteoToHourlySlice(
      data,
      new Date('2026-04-03T10:55:00Z')
    )
    expect(slice.time).toBe('2026-04-03T11:00:00Z')
    expect(slice.precipitationProbability).toBe(80)
    expect(slice.weatherCode).toBe(61)
  })
})
