# Handoff: Juguemos 0.1 — “Plaza” brand direction

## Overview

Juguemos is a play coach for families in Buenos Aires with children aged 1–5. It answers one question — *“¿Qué hacemos ahora?”* — with a single activity idea, and writes short stories starring the family for a parent to read aloud. The phone is held by a parent, never a child.

This bundle documents the **chosen brand direction, “Plaza”** (jacarandá purple, grass green, sand; rounded friendly type), applied to three of the 0.1 screens. Plaza was chosen over two rejected alternatives; the guardrails section below carries the research constraints that must hold while it is built:

1. **Home** — the big “¿Qué hacemos ahora?” button plus “Hora del cuento”
2. **Activity** — one idea: *La búsqueda del dinosaurio chiquito*
3. **Reading screen** — large calm story text, no illustrations

Each exists in **light and dark**. All interface copy is **Rioplatense Spanish with *vos***; copy in this document is final and should be used verbatim.

## About the design files

`Juguemos - Brand Directions.dc.html` is a **design reference created in HTML** — a prototype showing intended look and layout, not production code to copy. It is a design canvas holding several explorations side by side, not an app shell.

The task is to **recreate these screens in the target codebase's environment** using its established patterns. The brief specifies **React, built by hand, no component library**. If no app exists yet, scaffold one (Vite + React is sufficient) and build a small set of reusable primitives — `Screen`, `PrimaryButton`, `SecondaryButton`, `MetaLabel`, `StepList`, `NoteCard` — rather than one-off layouts per screen.

Ignore, in the reference file: the phone bezel wrappers (`width: 390px; height: 780px; border-radius: 34px; overflow: hidden`), the fake status bars (`18:05 ●●●`), the caption text under each phone, the swatch/type-specimen panels, and the resolved option explorations (`#2a`, `#2b`). Those are presentation scaffolding for the design review.

## Fidelity

**High-fidelity.** Colors, type sizes, weights, radii, and copy are final for 0.1 and should be reproduced exactly. Two things are deliberately unresolved and are *not* specified here: iconography and the app icon (both arrive in 0.2), and any illustration style (out of scope). Where the mock uses `●●●` or a bare `←`, substitute the platform's own affordance.

## Guardrails from the competitive research

`similar-apps.md` in this folder is the research behind these rules. They are **build-time constraints, not suggestions** — every one of them is a way this design can be accidentally undone in implementation. The design itself does not change.

**The finding that governs everything:** every parent-facing play app styles itself for adults, and childlike touches stay small accents. Kid styling tells a child the phone is for *them*, which works directly against the product's core commitment (*screens off, play on*). Juguemos is a tool for grown-ups, about play.

1. **Plaza's rounded display type is the known risk — do not amplify it.** Fredoka at 600 is the one childish-reading lever in this direction, and it is already at its limit. Do not add a heavier weight, do not add a rounded *body* font, do not increase the letter-spacing wobble, and do not scale the wordmark's three dots up. Chubby rounded type plus saturated color plus glossy buttons is the Duolingo register — the exact thing to avoid for a calm tool.
2. **No mascot, no character, no cartoon.** Not in empty states, not in loading states, not in errors. The wordmark's three dots are a *ronda*, not a face — never give them eyes.
3. **No sound, ever.** Pok Pok's rule: a parent should never need to mute this app in a restaurant. No jingles, no click sounds, no success chime. This also keeps the toddler from being pulled toward the phone.
4. **Motion guides, never demands.** Slow and subtle only (~120–200ms, ease-out) — the Tiimo register. No bounce, no spring, no confetti, no celebration animation, and nothing unskippable. BabySparks is reviewed badly precisely for celebration animations that can't be skipped.
5. **No glossy 3D, no gradients, no drop-shadow "toy" buttons.** The primary button is flat purple. Keep it flat.
6. **Keep the palette short.** Pok Pok ships 11 colors plus white for a whole app. The tokens below are the whole palette; adding a fifth or sixth accent is how this drifts to rainbow.
7. **Never clinical.** No progress rings, no milestone language, no percentages, no development-area color coding, no "on track" framing. That is the Kinedu/BabySparks register the brief explicitly rejects. The one progress bar in this design marks position in a story and nothing else.
8. **Never sell certainty or fear.** No "the best start", no "don't fall behind", no days-since-last-played. Follow Vroom's rules: never correct the parent, never mention bad outcomes, never imply a deficit.
9. **Keep art off the reading screen.** Readmio removes illustration from the reading view on purpose, and Moshi hides graphics once audio starts — because the child should watch the parent, not the phone. The reading screen stays text-only even after illustration arrives in 0.2.
10. **Avoid "sad beige".** The all-neutral baby aesthetic is now widely mocked. The sand-and-jacarandá palette below is deliberately warm *with* real color — don't desaturate it toward neutral.
11. **Any "handmade" texture must be real, not faked.** If grain or a hand-drawn mark is ever added (0.2 territory), it comes from an actual named illustrator. Imitation wobble reads as cheap.
12. **Local, not postcard.** Plaza, jacarandá, *rayuela*, *la ronda*, cardboard. Never tango, mate, the Obelisco, or the flag. The reference set is Isol, Limonero, Pakapaka, Canticuénticos — crafted work that adults enjoy too.

## Design tokens

### Colors — light

| Token | Hex | Use |
|---|---|---|
| `bg` | `#FFF9F0` | Screen background (sand) |
| `surface` | `#FFFFFF` | Cards, secondary button fill |
| `surfaceAccent` | `#F4EFFA` | “Por qué ahora” card |
| `readingBg` | `#FFFDF8` | Reading screen background only |
| `primary` | `#6B4EA8` | Jacarandá — primary button, wordmark, accents |
| `primaryInk` | `#4A3480` | Purple text on tinted surfaces |
| `grass` | `#3F7D4F` | Secondary button border, meta labels |
| `grassInk` | `#2F6340` | Green text on light (AA at 17px) |
| `sun` | `#E8C98A` | Wordmark dot, sparingly |
| `ink` | `#2A2140` | Body and heading text |
| `inkMuted` | `#6E6480` | Secondary text, status |
| `inkFaint` | `#8A7FA3` | Reading-screen meta, labels |
| `hairline` | `#EADFF3` | Card borders, progress track |
| `hairlineStrong` | `#D9CFE8` | Easier/harder card borders |

### Colors — dark

| Token | Hex | Use |
|---|---|---|
| `bg` | `#171228` | Screen background (night) |
| `surface` | `#241D3F` | “Por qué ahora” card |
| `surfaceRaised` | `#2A2140` | Secondary button fill |
| `primary` | `#B79BF0` | Primary button fill, accents |
| `onPrimary` | `#1E1736` | Text on primary button |
| `grass` | `#8FD49E` | Meta labels, “Más fácil” label |
| `sun` | `#E8C98A` | Wordmark dot |
| `ink` | `#F3EEFF` | Headings, body |
| `inkBody` | `#E7E0F7` | Card body text |
| `inkReading` | `#EDE7FA` | Story text |
| `inkMuted` | `#A79ACB` | Secondary text |
| `inkFaint` | `#8A7FA3` | Status bar |
| `hairline` | `#2E2650` | Screen border, progress track |
| `hairlineStrong` | `#3A3160` | Easier/harder card borders |
| `outline` | `#4A3F74` | Secondary button border |

Green is **never the only carrier of meaning** — every green label is also distinguished by weight, position, or an adjacent word.

### Typography

Two families, both on Google Fonts, both with full Spanish coverage (á é í ó ú ñ ü ¿ ¡ —). **Self-host both** (woff2, `font-display: swap`, Latin + Latin-Ext subsets) — mid-range Android on weak signal is the target.

- **Fredoka** — display and buttons. Weights used: 500, 600.
- **Nunito Sans** — body, labels, story text. Weights used: 400, 600, 700.

| Role | Family / weight | Size | Line-height | Notes |
|---|---|---|---|---|
| Primary button | Fredoka 600 | 32px | 1.2 | Left-aligned, wraps to 2 lines |
| Activity title | Fredoka 600 | 30px | 1.15 | `text-wrap: pretty` |
| Story title | Fredoka 500 | 25px | 1.2 | |
| Secondary button | Fredoka 500 | 21px | — | |
| Story body | Nunito Sans 400 | 21px | 1.65 | `text-wrap: pretty` |
| Steps / body | Nunito Sans 400 | 17px | 1.45 | |
| Card body | Nunito Sans 400 | 16px | 1.45 | |
| Easier/harder body | Nunito Sans 400 | 15px | 1.35 | |
| Label (`Por qué ahora`, `Más fácil`) | Nunito Sans 700 | 13px | — | |
| Meta (`15 MIN · ADENTRO`) | Nunito Sans 700 | 13px | — | uppercase, `letter-spacing: .06em` |
| Reading meta | Nunito Sans 400 | 13px | — | uppercase, `letter-spacing: .06em` |
| Progress counter | Nunito Sans 400 | 14px | — | |

Nothing below 13px, and 13px is used only for uppercase metadata.

### Spacing, radii, sizes

- Screen horizontal padding: **26px** (30px on the reading screen).
- Vertical gap between stacked blocks: **16px**; between story paragraphs: **22px**.
- Radii: primary button **28px**; secondary button **20px**; cards **16px**; easier/harder cards **14px**; progress bar **3px**.
- Primary button: `min-height: 132px`, full width, `padding: 24px`, text left-aligned.
- Secondary button: `min-height: 62px`, full width, centered text.
- All tap targets ≥ 48px. Both Home buttons sit in the **lower half** of the screen — one-handed reach is a requirement, not a preference.
- Design width **390px**; layout must not break wider. Use `max-width`, not fixed `width`.

### Wordmark

“Juguemos” in **Fredoka 600**, `letter-spacing: -0.015em`, followed by three dots in a row: grass, sun, jacarandá — “the ones who are playing”, a *ronda*, not a logo.

- In-app size: 22px text with 5px dots, `gap: 3px`, dot row offset `padding-bottom: 3px`, 8px gap from the word.
- Light: word in `primary` `#6B4EA8`; dots `#3F7D4F` / `#E8C98A` / `#6B4EA8`.
- Dark: word in `ink` `#F3EEFF`; dots `#8FD49E` / `#E8C98A` / `#B79BF0`.
- Do not add colors to the dot row and do not enlarge the dots — that is what tips the mark into looking like a children's app. Treat it as a **working wordmark**; trademark and domain checks are pending.

## Screens

### 1 · Home

**Purpose.** Answer *“¿Qué hacemos ahora?”* in one tap. This screen is the heart of the app and should feel nearly empty.

**Layout.** Vertical flex, full height.
1. Wordmark block — `padding: 22px 26px 0`.
2. Flexible spacer (`flex: 1; min-height: 0`) that pushes everything below to the bottom.
3. Family line, then the two buttons — `padding: 0 26px 34px`, `gap: 18px`.

**Components.**
- **Family line** — “Milán, 2 años · Inca · martes de lluvia”, Nunito Sans 17px/1.5, `inkMuted`, `margin-bottom: 12px`. This string is composed from the family's own data; the day/weather clause is decorative in 0.1 and may be dropped if not available (weather is explicitly out of scope).
- **Primary button** — “¿Qué hacemos ahora?”, Fredoka 600 32px/1.2, left-aligned, `min-height: 132px`, radius 28px. Light: fill `#6B4EA8`, text `#FFFFFF`. Dark: fill `#B79BF0`, text `#1E1736`.
- **Secondary button** — “Hora del cuento”, Fredoka 500 21px, `min-height: 62px`, radius 20px, centered.
  - Light: fill `#FFFFFF`, **2px** border `#3F7D4F`, text `#2F6340`.
  - Dark: fill `#2A2140`, **1px** border `#4A3F74`, text `#F3EEFF`. (Green was deliberately dropped in dark — it vibrated against the purple and competed with the primary action.)

**Never on this screen:** a feed, streaks, points, badges, a list of ideas, or a nudge about days since last played.

### 2 · Activity

**Purpose.** One idea, readable at a glance, while holding a two-year-old.

**Layout.** Vertical flex. Scroll region `padding: 20px 26px 0`, `gap: 16px`; a fixed footer holds “Otra idea” at `padding: 16px 26px 30px`.

**Order and content (verbatim):**
1. **Meta** — “15 MIN · ADENTRO”. Light `grassInk`-adjacent `#3F7D4F`; dark `#8FD49E`.
2. **Title** — “La búsqueda del dinosaurio chiquito”, Fredoka 600 30px/1.15.
3. **“Por qué ahora” card** — radius 16px, `padding: 16px 18px`, fill `#F4EFFA` light / `#241D3F` dark. Label 13px/700 in `#6B4EA8` light, `#B79BF0` dark. Body: “Usa el dinosaurio chiquito, a Milán le encantan los dinos y es ideal para una tarde de lluvia.”
4. **“Qué necesitás”** — label 13px/700 `inkMuted`; body 16px: “El dinosaurio chiquito y un almohadón.”
5. **Steps** — real `<ol>`, `padding-left: 26px`, `gap: 12px`, 17px/1.45:
   1. “Escondé el dinosaurio chiquito debajo de un almohadón mientras Milán mira.”
   2. “Preguntá: “¿Dónde está el dinosaurio?” y buscalo con Milán.”
   3. “Cuando lo encuentre, ¡que ruja!”
   Use curly quotes as shown.
6. **Easier / harder row** — two equal cards, `gap: 10px`, radius 14px, `padding: 12px 14px`, 1px border (`#D9CFE8` light / `#3A3160` dark). “Más fácil” label in green, body “Dejá la cola asomando.”; “Más difícil” label in purple, body “Escondelo en otro lugar del living.”
7. **“Otra idea”** — full-width primary-colored button, `min-height: 60px`, radius 20px, Fredoka 600 21px. Light fill `#6B4EA8` / text white; dark fill `#B79BF0` / text `#1E1736`.

**Toy names are literal.** *el dinosaurio chiquito*, *el tren grandote*, *el osito marrón*, *el caballo percherón* render exactly as the family typed them — never normalized, corrected, or capitalized.

### 3 · Reading screen

**Purpose.** A parent reads aloud in a dim room; the child watches the parent, not the phone. No illustrations.

**Layout.** Vertical flex. Content `padding: 26px 30px 0`, `gap: 22px`. Footer `padding: 16px 30px 34px`.

**Components.**
- **Meta** — “4 MIN · PANTALLA DESPIERTA”, 13px uppercase, `inkFaint` light / `inkMuted` dark, `margin-bottom: 8px`. (This is a label in the mock; in the app the wake behavior is real — see Behavior.)
- **Story title** — “El dinosaurio chiquito sale de paseo”, Fredoka 500 25px/1.2.
- **Story body** — Nunito Sans 21px/1.65, paragraphs as separate `<p>`s, `gap: 22px`, `text-wrap: pretty`. Light background `#FFFDF8` (warmer than the app background); dark `#171228` with text `#EDE7FA`.
- **Dialogue** uses the em dash: “—¿Venís? —preguntó el tren.” Verify the em dash renders in both fonts at the shipped subset.
- **Progress** — 6px track radius 3px (`#EADFF3` light / `#2E2650` dark) with a `#B79BF0` fill, plus “1 de 3” at 14px. This tracks **position in the story**, not achievement — do not turn it into a score or a streak.

Full story text for the sample (verbatim):

> Había una vez un dinosaurio chiquito que vivía en la caja de juguetes de Milán. Una tarde de lluvia, escuchó un ruido que venía del pasillo: ¡chu-chú, chu-chú! Era el tren grandote, que venía a buscarlo para ir de paseo.
>
> —¿Venís? —preguntó el tren.
>
> El dinosaurio chiquito se subió al último vagón, y allá fueron los dos, despacito, por toda la casa.

## Interactions & behavior

- **Home → Activity.** Tapping “¿Qué hacemos ahora?” must show an idea **within seconds**. Never a list, never a feed, never a filter step first. While it resolves, keep the parent on Home with the button in a pressed/waiting state rather than pushing a loading screen.
- **“Otra idea”** replaces the current activity in place. It should feel like turning something over, not navigating. Keep the previous idea retrievable via back.
- **Home → Story options → Reading.** “Hora del cuento” leads to three plot options (title, one-line teaser, reading time); picking one opens the reading screen. The story-options screen is in 0.1 scope but not mocked in this bundle — build it from the same tokens; the three sample options are in the brief.
- **Screen wake.** The reading screen must keep the display awake (`navigator.wakeLock.request('screen')` on web, with the sentinel released on unmount/blur; the platform equivalent on native). Fail silently if unavailable.
- **Offline.** The last activity stays readable with no network: “Estás sin conexión. La última idea sigue acá.” Cache the most recent activity and the open story locally.
- **Error.** “Uy, algo falló. ¿Probamos de nuevo?” with a retry affordance. No blame, no error codes in front of the parent.
- **Press states.** Subtle only — slight scale-down (0.98) or a one-step darker fill, 120ms ease-out. No bounce, no confetti, no celebratory animation on completing an activity (feedback after an activity is explicitly out of scope for 0.1). See guardrails 3–4: motion guides, and there is no audio anywhere in this app.
- **Reduced motion.** Respect `prefers-reduced-motion`; transitions become instant.
- **Dark mode.** 0.1 ships light; a warm night mode is 0.3. Build with both token sets from day one — the dark values above are the target, so don't hard-code light hexes.

  For 0.3, the research points somewhere specific and it's worth knowing now so the token layer doesn't fight it: night reading should trend **amber and brown, low brightness, away from blue and bright white**; surfaces should be dark grey/warm rather than pure black (Material's `#121212` reasoning), with desaturated accents and ≥4.5:1 contrast. Dark mode is measurably less legible than light as text shrinks, so story text on dark stays at least 21px and may go one weight heavier. The current dark set is a cool purple-black — treat warming it as the expected 0.3 move, not a redesign. No competitor ships a warm night theme; that's the opening.
- **Responsive.** Designed at 390px; must not break on larger viewports. Cap content width and center it; the story measure should stay short (~34–40 characters per line at 21px).

## State

Minimal for 0.1:

- `family` — kids (name, age), pet, interests, toys by family name. Loaded once after onboarding; every screen reads from it.
- `currentActivity` — the shown idea; replaced by “Otra idea”; persisted locally for offline.
- `storyOptions` — three options; `currentStory` + `paragraphIndex`/scroll position, persisted so a reopened story resumes where it was.
- `connectivity` — drives the offline line.
- `requestState` — `idle | loading | error` for the two generating actions.

No global store is warranted; component state plus one family context is enough.

## Assets

None. No images, illustrations, icons, or stock photography — by design. The only graphic elements are the three wordmark dots and the progress bar, both pure CSS. Iconography and the app icon land in 0.2.

Fonts: [Fredoka](https://fonts.google.com/specimen/Fredoka) and [Nunito Sans](https://fonts.google.com/specimen/Nunito+Sans), both SIL Open Font License, self-hosted.

## Out of scope for 0.1

Do not build: the toy box, voice recording (but leave room for a mic button beside the onboarding text box), goals, activity categories or filters, weather, the moments journal, parenting tips, recaps, holidays, partner invite, post-activity feedback, or an English interface.

## Files

- `Juguemos - Plaza.dc.html` — the design canvas. Plaza is the block `id="1a"`; its six phone screens are, in order: Home light, Activity light, Reading light, Home dark, Activity dark, Reading dark. `#2a`/`#2b` are the resolved explorations that settled the dark secondary button (neutral outline) and the wordmark (option A, three dots); kept for context only. Open it in a browser — `support.js` must sit beside it.
- `brief.md` — the product brief this design was made from: audience, voice, the five commitments, and the full copy deck.
- `similar-apps.md` — the competitive and cultural research the guardrails section is drawn from. Read section 8 before making any styling judgment call the README doesn't cover.
