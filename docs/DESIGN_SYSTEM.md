# DEMO Design System

Built **before** features (per the mandate). Tokens live in `app/globals.css` and are mapped into
Tailwind via `@theme inline`, so every utility resolves to a live CSS variable and themes switch at
runtime. Mobile-first; all breakpoints designed from the start.

## Design principles

- **Dark-first.** The product is a full-bleed video feed; the canvas is near-black so content leads.
- **Green primary + orange accent.** DEMO's brand is a refined, professional **green** (`brand`,
  primary actions/identity) paired with an energetic **orange** (`live` — battles, likes, "hot").
  `gold` (warm amber) marks earnings/verification and complements the pair. Restraint reads premium.
- **Motion communicates, never decorates.** Short durations, purposeful easing, and a hard
  `prefers-reduced-motion` override. Every transition reinforces orientation.
- **Touch-first ergonomics.** ≥44px targets (Fitts's Law), thumb-reachable nav, safe-area aware.

## Tokens

| Group     | Tokens                                     | Notes                                        |
| --------- | ------------------------------------------ | -------------------------------------------- |
| Surface   | `canvas` `surface` `elevated` `overlay`    | Elevation by lightness, not heavy shadows    |
| Text      | `fg` `muted` `subtle`                      | 3-step hierarchy; all meet WCAG AA on canvas |
| Line      | `line` `line-strong`                       | Hairline borders via alpha                   |
| Brand     | `brand` `brand-hover` `brand-fg`           | Primary actions                              |
| Semantic  | `live` `gold` `success` `warning` `danger` | Meaning-bound, never decorative              |
| Radius    | `xs sm md lg xl pill`                      | `pill` for buttons/chips                     |
| Elevation | `shadow-1/2/3`                             | Sparing; dark UI leans on lightness          |
| Motion    | `ease-out/in-out/spring`, `dur-1/2/3`      | 120/200/320ms                                |
| Type      | `2xs … display`                            | Fluid `clamp()` from `text-2xl` up           |

Colors are authored in **OKLCH** for perceptually-even steps and reliable contrast across themes.

## Type scale

`2xs` 11 · `xs` 12 · `sm` 13 · `base` 15 · `lg` 17 · `xl` 20 · `2xl`–`display` fluid. 15px base keeps
dense mobile UI legible without horizontal overflow. Respects user text-zoom (`text-size-adjust`).

## Components (this slice)

- **Button** (`components/ui/button.tsx`) — CVA variants (`primary/secondary/ghost/live/danger`),
  sizes incl. 44px `icon`, busy state, visible focus, reduced-motion-safe press.
- **EngagementBar** — accessible like/comment/share rail; `aria-pressed`, labeled counts.
- **FeedItem / HlsPlayer / FeedScroller** — the feed slice (see ARCHITECTURE §3–5).

## Accessibility standards (WCAG 2.2 AA)

- Visible `:focus-visible` rings everywhere; skip link in the root layout.
- Contrast: text tokens meet ≥4.5:1 on `canvas`; the feed adds a legibility scrim over video.
- Keyboard: all interactions are real buttons/links; feed exposes `role="feed"` + `aria-label`.
- Reduced motion honored globally. Captions and scalable text are first-class (no max-scale lock-out
  below 5×).

## Responsive rules

Phone is the default breakpoint. Content columns cap at `max-w-md` on larger screens so the mobile
composition holds; admin/enterprise dashboards opt into the light theme and wider layouts.
