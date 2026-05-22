# Amex Platinum Benefits Coach

## Project overview

Two independently deployable pieces:

| Part | Path | What it is |
|---|---|---|
| Landing page | `index.html` | Static single-file HTML/CSS/JS, no build step |
| Tracker app | `tracker/` | React 19 + Vite SPA |

Both are deployed on Render via `render.yaml`.

## Tech stack

- **Landing page:** Vanilla HTML/CSS/JS (no framework, no bundler)
- **Tracker:** React 19, Vite 8, plain JSX (no TypeScript)
- **Linting:** ESLint (tracker only)
- **No test suite** currently

## Development

### Landing page
Open `index.html` directly in a browser — no server needed. Or serve with any static file server:
```bash
npx serve .
```

### Tracker app
```bash
cd tracker
npm install
npm run dev       # local dev server (Vite)
npm run build     # production build → tracker/dist/
npm run lint      # ESLint
npm run preview   # preview production build locally
```

## Deployment

Render handles deployment automatically on push to the main branch via `render.yaml`.

- Landing page → served from repo root (no build)
- Tracker app → built with `cd tracker && npm install && npm run build`, served from `tracker/dist`

Live URLs:
- Landing page: deployed as `amex-landing-page` on Render
- Tracker app: `https://amex-platinum-tracker.onrender.com`
- Backend API: `https://amex-benefits-backend.onrender.com`

## Key files

- `index.html` — entire landing page (styles, markup, and JS in one file)
- `tracker/src/AmexCoach.jsx` — main tracker component; contains `AMEX_BENEFITS` data array with all 20+ benefit definitions
- `tracker/src/App.jsx` — thin wrapper that renders `<AmexCoach />`
- `tracker/src/App.css` / `tracker/src/index.css` — styles for tracker app

## State / storage

The tracker stores everything in `localStorage`:
- `multi-card-tracker-v1` — primary multi-card state
- `amex-coach-v5` — legacy single-card state
- `amex-coach-email-v5` — saved email

## Conventions

- Landing page uses a dark gold-on-dark theme: primary gold `#c9a96e`, background `#09090c`
- Fonts: Outfit (body), Playfair Display (headings/serif), JetBrains Mono (numbers/mono)
- Tracker app is plain JSX — no TypeScript, keep it that way unless explicitly migrating
- Benefit data lives in the `AMEX_BENEFITS` array in `AmexCoach.jsx` — each entry has `id`, `name`, `value`, `period`, `howTo[]`, `pitfalls[]`, `tips[]`
- Period values: `"Monthly"`, `"Quarterly"`, `"Semi-annually"`, `"Annually"`, `"Every 4 Years"`

## Branch

Active development branch: `claude/insights-feature-eu41p`
