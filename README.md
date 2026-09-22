# Sahiti

Business advisory prototype for rural micro-entrepreneurs. Built for Smart India Hackathon 2026 (MoSJE problem statement 26091).

Plan a loan, prepare documents, read local market risk, track ROI, and ask questions in plain language.

## Stack

- TanStack Start + React + TypeScript
- Tailwind CSS
- Supabase

## Local setup

```sh
npm install
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

Copy `.env` from `.env.example` before first run. Do not commit secrets.

- `GEMINI_API_KEY` — Google AI Studio key for Sahiti AI (server only). Optional `GEMINI_MODEL` defaults to `gemini-3.6-flash` (Gemini 2.5 is blocked for new keys).
- `GOOGLE_MAPS_API_KEY` — optional. The shop map uses OpenStreetMap without it. Set this only if you want the extra Google Places panel (Places API New + billing).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Team

Team Sahiti.
