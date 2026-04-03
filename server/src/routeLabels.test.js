import { describe, expect, it } from 'vitest'

import {
  buildStepTimeline,
  roadLabelAtOffset,
  simplifyPlaceLabel,
} from './routeLabels.js'

describe('buildStepTimeline / roadLabelAtOffset', () => {
  it('maps offset to current step road name', () => {
    const rawFeature = {
      properties: {
        summary: { duration: 1200 },
        segments: [
          {
            steps: [
              { duration: 400, name: 'MN-100', instruction: 'Head north' },
              { duration: 800, name: 'I-94', instruction: 'Merge' },
            ],
          },
        ],
      },
    }
    const steps = buildStepTimeline(rawFeature)
    expect(roadLabelAtOffset(steps, 0, 1200)).toBe('MN-100')
    expect(roadLabelAtOffset(steps, 500, 1200)).toBe('I-94')
    expect(roadLabelAtOffset(steps, 1199, 1200)).toBe('I-94')
  })

  it('falls back to instruction when name empty', () => {
    const rawFeature = {
      properties: {
        segments: [
          {
            steps: [{ duration: 100, name: '', instruction: 'Continue straight' }],
          },
        ],
      },
    }
    const steps = buildStepTimeline(rawFeature)
    expect(roadLabelAtOffset(steps, 50, 100)).toBe('Continue straight')
  })
})

describe('simplifyPlaceLabel', () => {
  it('uses city and state for typical US ORS label', () => {
    expect(
      simplifyPlaceLabel(
        'Fergus Falls, Otter Tail County, Minnesota, United States'
      )
    ).toBe('Fergus Falls, Minnesota')
  })
})
