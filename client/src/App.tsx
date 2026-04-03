import { FormEvent, useState } from 'react'

import { useTripStore } from './tripStore'

/** Value for `<input type="datetime-local" />` in the user's local timezone. */
function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function milesAlong(meters: number) {
  const mi = meters / 1609.344
  if (mi >= 100) {
    return `${Math.round(mi)} mi`
  }
  if (mi >= 10) {
    return `${mi.toFixed(0)} mi`
  }
  return `${mi.toFixed(1)} mi`
}

function formatEta(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function App() {
  const { trip, loading, error, fetchTrip } = useTripStore()
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [departureLocal, setDepartureLocal] = useState(() =>
    toDatetimeLocalValue(new Date())
  )
  const [interval, setInterval] = useState(45)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const departure = new Date(departureLocal)
    if (Number.isNaN(departure.getTime())) {
      return
    }
    const departureTime = departure.toISOString()
    await fetchTrip({
      origin,
      destination,
      departureTime,
      sampleIntervalMinutes: interval,
    })
  }

  const hours = trip ? Math.round(trip.route.durationSeconds / 360) / 10 : null

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-8 p-6">
      <header className="text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Road trip weather
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          Route via OpenRouteService, forecasts via Open-Meteo (non-commercial
          use). MapLibre UI next.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60"
      >
        <label className="flex flex-col gap-1 text-left text-sm font-medium text-slate-800 dark:text-slate-200">
          Start
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-normal text-slate-900 shadow-inner dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="City or address"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-left text-sm font-medium text-slate-800 dark:text-slate-200">
          Destination
          <input
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-normal text-slate-900 shadow-inner dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="City or address"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-left text-sm font-medium text-slate-800 dark:text-slate-200">
          Planned departure
          <input
            type="datetime-local"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-normal text-slate-900 shadow-inner dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            value={departureLocal}
            onChange={(e) => setDepartureLocal(e.target.value)}
            required
          />
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            Uses your device timezone. Forecasts align to each checkpoint along
            the route.
          </span>
        </label>
        <label className="flex flex-col gap-1 text-left text-sm font-medium text-slate-800 dark:text-slate-200">
          Sample every (minutes)
          <input
            type="number"
            min={15}
            max={120}
            step={15}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-normal text-slate-900 shadow-inner dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Planning route…' : 'Plan trip & weather'}
        </button>
        {error ? (
          <p className="text-left text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </form>

      {trip ? (
        <section className="space-y-4 text-left">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Route
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {trip.route.origin.label}
              </span>{' '}
              →{' '}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {trip.route.destination.label}
              </span>
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Departing{' '}
              <strong>{formatEta(trip.meta.departureTime)}</strong> · about{' '}
              <strong>{hours}</strong> hours driving · interval{' '}
              {trip.meta.sampleIntervalMinutes} min
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Along the way
            </h2>
            <ul className="mt-3 space-y-3">
              {trip.samples.map((s) => (
                <li
                  key={s.etaISO + s.offsetSeconds}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {formatEta(s.etaISO)}
                    </span>
                    <span className="text-xs text-slate-500">
                      +{Math.round(s.offsetSeconds / 60)} min
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                    {s.nearPlace ? (
                      <span className="font-medium">{s.nearPlace}</span>
                    ) : (
                      <span className="text-slate-500">Unknown place</span>
                    )}
                    {s.nearRoad ? (
                      <span className="text-slate-600 dark:text-slate-400">
                        {' '}
                        · near {s.nearRoad}
                      </span>
                    ) : null}
                    <span className="text-slate-500">
                      {' '}
                      · {milesAlong(s.metersAlongRoute)} from start
                    </span>
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {s.position.lat.toFixed(4)}, {s.position.lon.toFixed(4)}
                  </p>
                  {s.alerts.length ? (
                    <ul className="mt-2 space-y-1">
                      {s.alerts.map((a) => (
                        <li
                          key={a.code + a.message}
                          className="text-sm text-amber-700 dark:text-amber-300"
                        >
                          {a.message}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      No threshold alerts at this checkpoint.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <footer className="text-xs text-slate-500 dark:text-slate-500">
            {trip.meta.attribution.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </footer>
        </section>
      ) : null}
    </div>
  )
}

export default App
