# AGENTS.md

## Project

Social/management platform for running clubs ("RunApp"). React 19 + Vite 7 SPA with Supabase (auth, DB, storage) and a separate C# .NET backend API on Render.

## Commands

- `npm run dev` – start Vite dev server
- `npm run build` – production build
- `npm run lint` – ESLint (no typecheck or test commands exist)
- `npm run preview` – preview production build

No test framework is configured.

## Dual Backend

Two separate backends, easy to miss:

1. **Supabase** – auth, profiles, clubs, posts, likes, comments, storage buckets (`avatars`, `club_logos`, `post_images`). Accessed via `@supabase/supabase-js` client in `src/lib/supabase.js`.
2. **C# API** (`https://api-projetointegrador-kmmg.onrender.com`) – Strava OAuth, challenges, rewards, some post/comment endpoints. Accessed via axios in `src/lib/api.js`.

Some features query Supabase directly (feed, likes, user posts) while others call the C# API. Auth patterns differ: the axios instance auto-injects JWT via interceptor, but `src/lib/postApi.js` also makes unauthenticated `fetch` calls to the C# API for posts/comments.

When adding API calls, check which backend owns the resource and whether the endpoint requires JWT.

## Architecture

- Entry: `src/main.jsx` → `App.jsx` with `BrowserRouter` > `ThemeProvider` > `ToastProvider` > `App`
- Routes defined in `src/App.jsx`; all routes except `/auth` are guarded by `AuthGuard`
- Layout shell: `src/components/layout/AppLayout.jsx` + `BottomNav.jsx`
- shadcn/ui components in `src/components/ui/` (JSX, not TSX – configured in `components.json`)
- API utilities in `src/lib/api.js` (axios + `fetchWithAuth` compat wrapper) and `src/lib/postApi.js` (posts, comments, feed, sharing)
- Supabase client in `src/lib/supabase.js`

## Path Alias

`@/` maps to `./src/` – configured in both `vite.config.js` and `jsconfig.json`. Use `@/` imports, not relative paths with `../../`.

## UI Conventions

- Tailwind CSS with CSS variables (light + dark theme via `.dark` class toggle)
- Claymorphism aesthetic: custom shadows (`clay`, `clay-sm`, `clay-inset`, `clay-dark`), pastel color tokens (`pastel-lavender`, `pastel-peach`, etc.), heavy border radius
- Fonts: Outfit (primary), Inter
- Animations: GSAP, Motion (framer-motion successor), and CSS keyframes in `src/index.css`
- 3D elements via `@react-three/fiber` + `@react-three/drei`
- Icons: Lucide React

## ESLint

Unused variables starting with uppercase or underscore are allowed: `^[A-Z_]`. React hooks and refresh lint rules are enforced for `.jsx` files.

## Environment

`.env` is gitignored. Copy `.env.example` and fill in:

```
VITE_SUPABASE_URL=<project_url>
VITE_SUPABASE_ANON_KEY=<anon_key>
```

## Deployment

Vercel with SPA rewrite (all routes → `index.html`). Config in `vercel.json`.

## Gotchas

- Both `package-lock.json` and `pnpm-lock.yaml` exist; `npm run dev` is the script defined in `package.json`.
- `vite.config.js` defines a proxy for `/api` → C# backend, but `src/lib/api.js` hardcodes the production URL directly, so the proxy is unused in practice.
- The `fetchWithAuth` function in `src/lib/api.js` wraps axios to mimic native `fetch` Response shape for backward compatibility with older view code.