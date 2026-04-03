import { create } from 'zustand'

export type TripResponse = {
  meta: {
    generatedAt: string
    departureTime: string
    sampleIntervalMinutes: number
    attribution: string[]
  }
  route: {
    durationSeconds: number
    distanceMeters: number | null
    coordinates: number[][]
    origin: { label: string; lat: number; lon: number }
    destination: { label: string; lat: number; lon: number }
  }
  samples: Array<{
    offsetSeconds: number
    etaISO: string
    position: { lon: number; lat: number }
    metersAlongRoute: number
    nearRoad: string | null
    nearPlace: string | null
    weather: Record<string, unknown>
    alerts: Array<{ level: string; code: string; message: string }>
  }>
}

type State = {
  loading: boolean
  error: string | null
  trip: TripResponse | null
  fetchTrip: (body: {
    origin: string
    destination: string
    departureTime?: string
    sampleIntervalMinutes?: number
  }) => Promise<void>
}

export const useTripStore = create<State>((set) => ({
  loading: false,
  error: null,
  trip: null,

  async fetchTrip(body) {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: body.origin,
          destination: body.destination,
          departureTime: body.departureTime,
          sampleIntervalMinutes: body.sampleIntervalMinutes,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message =
          typeof data?.error === 'string' ? data.error : `HTTP ${res.status}`
        throw new Error(message)
      }
      set({ trip: data.trip as TripResponse, loading: false })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      set({ error: message, loading: false, trip: null })
    }
  },
}))
