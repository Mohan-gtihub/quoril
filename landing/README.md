# Quoril — Landing Site & Waitlist

Marketing site for [Quoril](../README.md), built with **Next.js 14 (App Router)** so
it can grow into a full account / dashboard panel later. Right now the only live
feature is the **waitlist**.

Design language mirrors the desktop app's *Onyx* theme: lime (`#c4f82a`) accent on
near-black, violet secondary, big-rounded "bento" tiles — tokens live in
[`tailwind.config.ts`](./tailwind.config.ts).

## Run

```bash
cd landing
npm install
npm run dev        # http://localhost:3000
```

## Waitlist

- Form: [`components/Waitlist.tsx`](./components/Waitlist.tsx) — email + optional
  role/platform, live signup count, validation & success states.
- API: [`app/api/waitlist/route.ts`](./app/api/waitlist/route.ts) — `GET` returns the
  count, `POST` validates and stores a signup.
- Storage: [`lib/waitlist.ts`](./lib/waitlist.ts) writes to `data/waitlist.json`
  (zero external setup).

### Wiring into the app later

`lib/waitlist.ts` is the single integration point. Swap the bodies of `addSignup`
and `countSignups` for a Supabase insert/select (the desktop app already depends on
`@supabase/supabase-js`). The route handler and the client form never change.

## Structure

```
app/
  layout.tsx          root layout + fonts + metadata
  page.tsx            full landing page composition
  globals.css         tokens, grain, scrollbar, shimmer
  api/waitlist/       waitlist endpoint
components/           Nav, Waitlist, AppMockup, FocusPill (draggable),
                      Charts, ThemeSwitcher, Reveal, ui, icons
lib/waitlist.ts       persistence (file now → Supabase later)
```

Interactive mockups: live kanban with satisfying checkboxes, a draggable
always-on-top focus pill, animated heatmap/rings/donut, and a theme switcher that
recolors the whole page on hover.
