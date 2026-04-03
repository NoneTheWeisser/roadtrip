# Road trip weather — user and developer guide

This document explains how to run and use the app in the browser, and how to work on the codebase.

---

## Using the app (end user)

### What you need

- The app running locally (see [Development setup](#development-setup) below) or deployed somewhere you control.
- An **OpenRouteService** API key configured on the server (routing and geocoding). Weather uses **Open-Meteo’s public API** (no key).

### Free tier and use

- **OpenRouteService** has daily and per-minute limits on free plans; repeated trips and autocomplete-style searches can add up—this project uses short in-memory caching to reduce repeat calls.
- **Open-Meteo’s** free API is intended for **non‑commercial** use. Follow their [terms](https://open-meteo.com/en/terms) and keep **[attribution](https://open-meteo.com/en/license)** visible where you show forecasts (the UI lists attribution on the results page).

### Typical flow

1. Start the development servers (`npm run dev` from the repository root) so the **API** is on port **3001** and the **web UI** is on **5173** (Vite default).
2. Open the URL Vite prints (usually `http://localhost:5173`).
3. Enter a **start** and **destination** as plain text (city, address, or place name—same ideas as other map apps).
4. Choose **planned departure** with the date and time picker (your **device’s local timezone**). The client sends that instant to the server as ISO 8601 so each route checkpoint gets the right forecast hour.
5. Set **sample every (minutes)** to control how often checkpoints are placed along the drive (for example 45 minutes). The server uses **drive time**, not distance, between checkpoints (see [`server/src/sampler.js`](../server/src/sampler.js)).
6. Click **Plan trip & weather**. Wait for the route and forecast checkpoints to load.
7. Read the **Route** summary (including the departure time you chose), then **Along the way**: each row is a checkpoint time, **human location context** (see below), and any **alerts** when simple thresholds are exceeded (precipitation probability, wind gusts, snow/ice–style weather codes).

### Behaviour details

- **Checkpoint location text:** Each sample includes **miles from the start** of the route, a **road or instruction line** from OpenRouteService turn-by-turn data (no extra API call), and a **short place label** (city/state-style) from ORS **reverse geocoding** at the sample point (counts toward your ORS quota; results are cached by rounded coordinates). Raw latitude/longitude stay in small monospace type for debugging or maps. Distances like “~5 mi to Fergus Falls” are **not** computed—you get the name of the area ORS associates with that point, not distance to a city boundary.
- **Departure time:** The UI sets a default of “now” and lets you change it. The API still accepts optional `departureTime` (ISO 8601); if omitted (e.g. direct API calls), the server uses **now**.
- **Errors:** If the server returns an error (missing API key, bad address, upstream failure), the message appears under the form.
- **Maps:** Interactive map rendering (MapLibre) may be added in a later iteration; routing and weather still work without a map.

---

## Development setup

### Prerequisites

- **Node.js** 18+ recommended (uses global `fetch` on the server).
- **npm** (workspaces are used at the repo root).

### First-time install

From the repository root (`roadtrip/`, one level above this `docs/` folder):

```bash
npm install
```

Copy environment template and add your ORS key:

```bash
cp .env.example .env
```

Edit `.env` and set `ORS_API_KEY`. Optional: `PORT` (default `3001`), `CORS_ORIGINS` (comma-separated allowlist; leave empty in local dev to allow all origins).

### Run everything (API + UI)

```bash
npm run dev
```

- **Server:** `http://localhost:3001` — `GET /health`, `POST /trip`
- **Client:** Vite dev server (typically `http://localhost:5173`) proxies `/trip` and `/health` to the API (see [`client/vite.config.ts`](../client/vite.config.ts)).

### Run API or UI alone

```bash
npm run dev -w server
npm run dev -w client
```

If you run the client alone, ensure the server is already running so proxied requests succeed.

### Tests

```bash
npm test
```

Runs **Vitest** in `server` (sampler, Open-Meteo mapping, alert thresholds). External APIs are not called in these tests.

### Production build (client only)

The root `build` script currently builds the **client** static assets:

```bash
npm run build
```

Serving the Express app in production (static `client/dist`, HTTPS, env on the host) is left to your hosting choice.

---

## API reference (developers)

### `GET /health`

Returns JSON such as `{ "ok": true, "hasOrsKey": true }` so you can verify the process and configuration.

### `POST /trip`

**Headers:** `Content-Type: application/json`

**Body:**

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| `origin` | string | yes | Start label for geocoding |
| `destination` | string | yes | End label for geocoding |
| `departureTime` | string (ISO 8601) | no | Defaults to current time on the server |
| `sampleIntervalMinutes` | number | no | Default **45**; valid values depend on client validation (UI uses 15–120 step 15) |

**Success (200):** `{ "trip": { ... } }` — shape includes `meta`, `route` (duration, distance, coordinates, resolved labels), and `samples[]` with `etaISO`, `position`, `weather`, and `alerts`.

**Errors:** `400` validation, `503` missing `ORS_API_KEY`, `502` upstream or internal failure with `{ "error": "message" }`.

---

## Project layout (developers)

| Path | Role |
|------|------|
| [`client/`](../client/) | Vite + React + TypeScript + Tailwind + Zustand UI |
| [`server/src/index.js`](../server/src/index.js) | Express app, routes, CORS, env |
| [`server/src/buildTrip.js`](../server/src/buildTrip.js) | Orchestrates geocode → directions → sampling → Open-Meteo |
| [`server/src/openRouteService.js`](../server/src/openRouteService.js) | ORS geocode + driving GeoJSON |
| [`server/src/openMeteo.js`](../server/src/openMeteo.js) | Open-Meteo hourly fetch + mapping |
| [`server/src/sampler.js`](../server/src/sampler.js) | Time-based samples along polyline |
| [`server/src/alerts.js`](../server/src/alerts.js) | Threshold rules for UI alerts |
| [`server/src/cache.js`](../server/src/cache.js) | In-memory TTL cache for ORS calls |
| [`.cursor/rules/road-trip-weather-mvp.mdc`](../.cursor/rules/road-trip-weather-mvp.mdc) | Project conventions for incremental work, tests, and `docs/PROMPTS.md` checkpoints |

---

## Troubleshooting

- **`503` missing ORS_API_KEY:** Create `.env` at the **repo root** (same level as `package.json`). The server loads `../../.env` relative to `server/src`, which resolves to that root file.
- **CORS errors in the browser:** If you deploy with a strict `CORS_ORIGINS`, include the exact origin of your frontend (scheme + host + port).
- **Geocode or directions failures:** Check the error message body; verify the ORS key quota and that place names are specific enough.

When you change behaviour that affects routing, sampling, or forecasts, append a chronological entry to `docs/PROMPTS.md` per the project rule (Title, Quote, Summary).
