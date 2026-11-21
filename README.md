# Zenerlink Vends console

The web console for Zenerlink Vends: operator staff (for example PCE) manage mini-grids, customers, meters, tariffs and remote control; Zenerlink administrators onboard operators, verify permits and meter operating rights, and connect manufacturer integrations.

Vue 3, TypeScript, Vite, Tailwind CSS 4, Pinia, Vue Router. It talks only to the Zenerlink API (`zieonenergies`, branch `feat/vends`); every permission is enforced by the API, and the menu only hides what a role cannot use.

## Run locally

```sh
npm install
VITE_API_PROXY=http://localhost:8080 npm run dev   # http://localhost:5188, proxies /v1 to the API
```

Sign in with the operator's organisation ID (for example `pce-energy`) or `zenerlink` for platform administrators.

## Build

```sh
VITE_API_URL=https://api.example.com npm run build   # static files in dist/
```

The console's origin must be added to the API's `ALLOWED_ORIGINS`.

## What is real and what is not yet

Every number and list comes from the API. Sections whose backend is not built yet (payments, financial operations, reports, support, white-label settings, subscriptions, platform revenue, transactions, monitoring, settings) show what they will hold and what they are waiting for; nothing is simulated.
