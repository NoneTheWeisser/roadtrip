# Development log (prompts → work)

Entries are chronological. Newest at the bottom.

---

**Usage guide (Documentation)**

> "please create a md file that goes over how to use this app both as a user and a dev"

Added [docs/USAGE.md](./USAGE.md) with end-user flow (form, checkpoints, attribution, free-tier notes), developer setup (`npm install`, `.env`, `npm run dev`, tests, build), `POST /trip` contract, repo layout, and troubleshooting.

---

**Planned departure (UI)**

> "I would like to be able to select the time/date I am planning on taking off on my trip."

Added `datetime-local` **Planned departure** to [`client/src/App.tsx`](../client/src/App.tsx) (default: current local time), converting to ISO for `POST /trip`. Route summary shows `trip.meta.departureTime`. Updated [docs/USAGE.md](./USAGE.md) flow and behaviour notes.

---

**Location context at samples (Routing / Geocoding)**

> "I'm wondering if we need to add a part where it says the closest major city … OR what are my other options"

Implemented two complementary signals: **nearRoad** from ORS route step timelines ([`server/src/routeLabels.js`](../server/src/routeLabels.js), no extra calls) and **nearPlace** via ORS **reverse geocode** with TTL cache ([`server/src/openRouteService.js`](../server/src/openRouteService.js), [`server/src/buildTrip.js`](../server/src/buildTrip.js)). Samples now include **metersAlongRoute** for “mi from start.” UI shows place, road, distance, then coordinates ([`client/src/App.tsx`](../client/src/App.tsx)). Added tests in `routeLabels.test.js`. Documented tradeoffs (no “~5 mi to city boundary”) in [docs/USAGE.md](./USAGE.md).

---

**GitHub publish (Repository)**

> "I'd like to get this up on github... I created a repo here https://github.com/NoneTheWeisser/roadtrip"

Initialized git on `main`, added `origin` for [NoneTheWeisser/roadtrip](https://github.com/NoneTheWeisser/roadtrip), pushed initial commit. Tweaked [.gitignore](../.gitignore): stop ignoring `docs/` so USAGE/PROMPTS ship with the repo; ignore `.cursor/` locally.
