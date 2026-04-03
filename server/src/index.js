import path from 'node:path'
import { fileURLToPath } from 'node:url'

import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'

import { buildTrip } from './buildTrip.js'
import { createTtlCache } from './cache.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootEnv = path.join(__dirname, '../../.env')
const serverEnv = path.join(__dirname, '../.env')
dotenv.config({ path: rootEnv })
if (!(process.env.ORS_API_KEY || '').trim()) {
  dotenv.config({ path: serverEnv, override: true })
}

const app = express()
const PORT = Number(process.env.PORT) || 3001
const ORS_API_KEY = (process.env.ORS_API_KEY || '').trim()

const geocodeCache = createTtlCache()
const directionsCache = createTtlCache()

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || corsOrigins.length === 0) {
        return cb(null, true)
      }
      if (corsOrigins.includes(origin)) {
        return cb(null, true)
      }
      return cb(null, false)
    },
  })
)
app.use(express.json({ limit: '32kb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true, hasOrsKey: Boolean(ORS_API_KEY) })
})

app.post('/trip', async (req, res) => {
  if (!ORS_API_KEY) {
    return res.status(503).json({
      error:
        'Server missing ORS_API_KEY. Add roadtrip/.env (repo root, next to root package.json) or server/.env with ORS_API_KEY=… — see .env.example',
    })
  }

  const { origin, destination, departureTime, sampleIntervalMinutes } =
    req.body || {}

  if (typeof origin !== 'string' || !origin.trim()) {
    return res.status(400).json({ error: 'body.origin (string) is required' })
  }
  if (typeof destination !== 'string' || !destination.trim()) {
    return res
      .status(400)
      .json({ error: 'body.destination (string) is required' })
  }

  let depart = departureTime ? new Date(departureTime) : new Date()
  if (Number.isNaN(depart.getTime())) {
    return res.status(400).json({ error: 'departureTime must be a valid ISO date' })
  }

  const interval =
    typeof sampleIntervalMinutes === 'number' && sampleIntervalMinutes > 0
      ? sampleIntervalMinutes
      : 45

  try {
    const trip = await buildTrip(
      {
        apiKey: ORS_API_KEY,
        originText: origin.trim(),
        destinationText: destination.trim(),
        departureTime: depart,
        sampleIntervalMinutes: interval,
      },
      geocodeCache,
      directionsCache
    )
    return res.json({ trip })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(err)
    return res.status(502).json({ error: message })
  }
})

app.listen(PORT, () => {
  console.log(`roadtrip server http://localhost:${PORT}`)
})
