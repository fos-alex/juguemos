# Handoff: Juguemos 0.1 — Plaza

## Overview

Juguemos is a play coach for families in Buenos Aires with children aged 1–5. It answers one question — *“¿Qué hacemos ahora?”* — with a single activity idea, and writes short stories starring the family for a parent to read aloud. The phone is always held by a parent, never a child.

This bundle covers **all of release 0.1** in the chosen brand direction, **Plaza**: 21 screens across three flows, plus the account screens, the side-panel navigation, and the states (thinking, offline, the AI misunderstanding the family).

- **Flow 1 · First run** — entrada → crear cuenta → verificar email → contame de tu familia → ¿está bien así? → corregir → Home
- **Flow 2 · Daily idea** — Home → pensando → actividad → empezar (reloj) → otra idea · offline
- **Flow 3 · Bedtime** — Home → ¿cuál leemos hoy? → escribiendo → pantalla de lectura

All interface copy is **Rioplatense Spanish with *vos***. Copy in the mockups is what ships unless this document marks it as needing a voice pass.

## About the design files

Two files, both **design references created in HTML** — prototypes showing intended look, structure and behaviour, not production code to copy:

- `Juguemos - Mockups 0.1.dc.html` — **the spec.** 21 screens at 390 × 812 in Plaza colour, with the palette, type scale and component rules at the top. Screens are ided `2a`–`2u`; this document refers to them by that id.
- `Juguemos - Wireframes 0.1.dc.html` — the greyscale structure pass, ided `1a`–`1t`, each with a note explaining what the screen does and what it must never do. **Read the notes** — they carry the reasoning the mockups can't show.
- `Juguemos - Plaza.dc.html` — the brand direction itself: wordmark, light and dark palettes, type scale.

Recreate these in the target codebase's own environment. The brief specifies **React, built by hand, no component library**. If no app exists yet, scaffold one (Vite + React is enough) and build a small set of primitives — `Screen`, `PrimaryButton`, `SecondaryButton`, `TertiaryButton`, `MetaLabel`, `Card`, `Field`, `StepList`, `Drawer` — rather than one-off layouts per screen. Every screen in this bundle is built from that set.

Ignore, in the reference files: the rounded 390 × 812 frame wrappers and their shadows, the fake status bars (`18:05 ●●●`), the id badges and captions, the palette/type panels, and the wireframes' side notes. Those are review scaffolding.

## Fidelity

**High-fidelity.** Colours, type sizes, weights, radii, spacing and copy are final for 0.1 and should be reproduced exactly.

Deliberately unresolved: iconography and the app icon (0.2), illustration style (0.2, and never on the reading screen), the voice-note recording flow (0.2 — only its button, position and gesture are pinned), and the warm night mode (0.3 — dark tokens exist and must be wired from day one).

**Two decisions are still open** — both are presented as alternatives in the mockups and one must be picked before build:

| Decision | Options |
|---|---|
| Home | `2i` question-only (empty top, two buttons) vs `2j` same plus one "última idea" card |
| Activity | `2m` why-first (trust before steps) vs `2n` steps-first (playable without scrolling) |

`2j` is the stronger default: its last-idea card is what makes the offline state (`2q`) graceful.

## Guardrails from the competitive research

`similar-apps.md` is the research behind these rules. They are **build-time constraints, not suggestions** — each is a way this design gets accidentally undone in implementation. The design itself does not change.

**The finding that governs everything:** every parent-facing play app styles itself for adults, and childlike touches stay small accents. Kid styling tells a child the phone is for *them*, which works against the product's core commitment (*screens off, play on*). Juguemos is a tool for grown-ups, about play.

1. **Plaza's rounded display type is the known risk — do not amplify it.** Fredoka 600 is the one childish-reading lever here and it's already at its limit. No heavier weight, no rounded *body* font, no extra letter-spacing, and never scale the wordmark's three dots up. Chubby type + saturated colour + glossy buttons is the Duolingo register — the thing to avoid for a calm tool.
2. **No mascot, no character, no cartoon.** Not in empty states, not in loading, not in errors. The wordmark's three dots are a *ronda*, not a face — never give them eyes.
3. **No sound, ever.** Pok Pok's rule: a parent should never need to mute this app in a restaurant. No jingles, no taps, no success chime, and **no alarm when the activity timer ends**. This also keeps the toddler from being pulled to the phone.
4. **Motion guides, never demands.** 120–200 ms ease-out. No bounce, no spring, no confetti, nothing unskippable. BabySparks is reviewed badly precisely for celebration animations that can't be skipped.
5. **No glossy 3D, no gradients, no drop-shadow "toy" buttons.** The primary button is flat purple. Keep it flat.
6. **Keep the palette short.** Pok Pok ships 11 colours plus white for a whole app. The tokens below are the whole palette.
7. **Never clinical.** No progress rings, no milestones, no percentages, no development-area colour coding, no "on track". The only progress bar in the app marks position in a story.
8. **Never sell certainty or fear.** No "the best start", no "don't fall behind", no days-since-last-played. Follow Vroom's rules: never correct the parent, never mention bad outcomes, never imply a deficit.
9. **Keep art off the reading screen.** Readmio removes illustration from the reading view on purpose; Moshi hides graphics once audio starts — the child should watch the parent, not the phone. Text-only stays true even after 0.2 adds illustration.
10. **Avoid "sad beige".** The palette is warm *with* real colour; don't desaturate it toward neutral.
11. **Any "handmade" texture must be real.** If grain or hand-drawn marks arrive (0.2), they come from a named illustrator. Imitation wobble reads cheap.
12. **Local, not postcard.** Plaza, jacarandá, *rayuela*, *la ronda*, cardboard. Never tango, mate, the Obelisco, or the flag. References: Isol, Limonero, Pakapaka, Canticuénticos.

## Design tokens

### Colours — light

| Token | Hex | Use |
|---|---|---|
| `bg` | `#FFF9F0` | Screen background (sand) |
| `surface` | `#FFFFFF` | Cards, fields, secondary button fill |
| `surfaceAccent` | `#F4EFFA` | "Por qué ahora", flagged rows, recording strip, timer screen background |
| `surfaceQuiet` | `#F0EAF8` | Demoted primary (the quiet "Sí, está perfecto" in `2g`), active drawer row |
| `readingBg` | `#FFFDF8` | Reading and story-writing screens only |
| `primary` | `#6B4EA8` | Jacarandá — primary button, wordmark, back arrow, step bullets |
| `primaryPressed` | `#4A3480` | Pressed/waiting primary, tertiary link text |
| `grass` | `#3F7D4F` | Secondary button border, meta labels |
| `grassInk` | `#2F6340` | Green text on light (AA at 17 px) |
| `sun` | `#E8C98A` | Wordmark dot only |
| `ink` | `#2A2140` | Body and headings |
| `inkBody` | `#4A4460` / `#57516A` | Secondary paragraphs |
| `inkMuted` | `#6E6480` | Labels, status bar, helper text |
| `inkFaint` | `#8A7FA3` | Uppercase meta, reading-screen meta |
| `inkDisabled` | `#A9A2B8` | Disabled button text |
| `hairline` | `#EADFF3` | Card borders, dividers, progress track |
| `hairlineStrong` | `#D9CFE8` | Field borders, easier/harder cards |
| `dashed` | `#C9BDE4` | Reserved/placeholder outlines (mic, "próximas funciones") |
| `skeleton` | `#EDE6F6` / `#F0EAF8` | Loading placeholders |
| `disabledFill` | `#EFEAE0` | Offline primary button |

### Colours — dark (0.3 target)

| Token | Hex | Use |
|---|---|---|
| `bg` | `#171228` | Screen background |
| `surface` | `#241D3F` | Cards |
| `surfaceRaised` | `#2A2140` | Secondary button fill |
| `primary` | `#B79BF0` | Primary fill, accents, progress |
| `onPrimary` | `#1E1736` | Text on primary |
| `grass` | `#8FD49E` | Meta labels, "Más fácil" |
| `ink` | `#F3EEFF` | Headings |
| `inkReading` | `#EDE7FA` | Story text |
| `inkMuted` | `#A79ACB` | Secondary text |
| `hairline` | `#2E2650` | Borders, progress track |
| `outline` | `#4A3F74` | Secondary button border |

In dark, the **secondary button loses the green** and becomes `surfaceRaised` + `outline` + `ink` — green vibrated against the purple and competed with the primary. Green is never the only carrier of meaning in either mode: every green label is also distinguished by weight, position, or an adjacent word.

### Typography

Two families, both on Google Fonts, both with full Spanish coverage (á é í ó ú ñ ü ¿ ¡ —). **Self-host both** (woff2, `font-display: swap`, Latin + Latin-Ext) — mid-range Android on weak signal is the target.

- **Fredoka** — display, buttons, numbers, drawer items, wordmark. Weights 400/500/600.
- **Nunito Sans** — body, labels, story text. Weights 400/600/700.

| Role | Family / weight | Size | Line-height |
|---|---|---|---|
| Home primary button | Fredoka 600 | 32 | 1.2 |
| Screen title (`¿Está bien así?`, `Revisá tu email`) | Fredoka 600 | 30 | 1.15 |
| Activity title `2m` | Fredoka 600 | 30 | 1.15 |
| Onboarding prompt | Fredoka 600 | 27 | 1.2 |
| Activity title `2n` / section head | Fredoka 600 | 24 | 1.2 |
| Timer digits | Fredoka 500 | 104 | 1.0 |
| Story title | Fredoka 500 | 23 | 1.25 |
| Drawer item, card title, OTP digit | Fredoka 500/400 | 20–26 | 1.25 |
| Primary/secondary button label | Fredoka 600/500 | 19–23 | — |
| Story body | Nunito Sans 400 | 21 | 1.65 |
| Steps `2n` | Nunito Sans 400 | 20 | 1.4 |
| Row value, field text | Nunito Sans 400 | 18–19 | 1.4 |
| Steps `2m`, body | Nunito Sans 400 | 17 | 1.45 |
| Card body | Nunito Sans 400 | 16 | 1.45 |
| Helper, teaser meta | Nunito Sans 400 | 15 | 1.4 |
| Label (`Por qué ahora`, `Más fácil`) | Nunito Sans 700 | 12–13 | — |
| Meta (`15 MIN · ADENTRO`) | Nunito Sans 700 | 13 | — uppercase, `letter-spacing: .06em` |
| Row label (`CHICOS`, `JUGUETES`) | Nunito Sans 700 | 12 | — uppercase, `letter-spacing: .1em` |

Nothing below 12 px, and 12–13 px only for uppercase metadata.

### Spacing, radii, sizes

- Screen padding: **26 px** (30 px on reading/writing screens, 22 px inside the drawer).
- Stacked block gap **14–18 px**; story paragraph gap **20 px**; button stack gap **12–14 px**; bottom safe padding **34–36 px**.
- Radii: Home primary **28**; buttons/fields/cards **20 / 14 / 16–18**; pill **999**; mic **32** (64 px circle).
- Home primary `min-height: 132`, left-aligned text, `padding: 24`. Secondary **62**. Bar primary **60–64**. Tertiary **48–52**, underlined, no box.
- Every tap target ≥ 48 px. Both Home actions and every screen's primary action sit in the **lower half**.
- Design width **390 px**; must not break wider — `max-width`, not fixed `width`.

### Wordmark

“Juguemos” in **Fredoka 600**, `letter-spacing: -0.015em`, plus three dots (grass, sun, jacarandá) at `gap: 3px`, offset `padding-bottom: 3px`, 8 px from the word. In-app 22 px text / 5 px dots; splash 38 px / 8 px. Light: word in `primary`. Dark: word in `ink`, dots `#8FD49E` / `#E8C98A` / `#B79BF0`. Treat as a **working wordmark** — trademark and domain checks pending.

## Screens

### Flow 1 · First run

**`2a` Entrada.** Wordmark centred in an otherwise empty upper two-thirds. Bottom: tagline (17 px, centred, muted), then **Continuar con Google** (secondary style, 22 px circle glyph + label), **Crear cuenta con email** (primary, 60 px), **Ya tengo cuenta** (tertiary). Google is listed first — one tap, and most target parents have an Android account. The Google path **skips `2b` and `2c`** and lands on `2d` with the email already verified. "Ya tengo cuenta" reuses the same two controls in sign-in mode; no separate screen in 0.1. No social proof, no carousel.

**`2b` Crear cuenta.** Back + "Creá tu cuenta". Three fields: *Cómo te llamás* (Alex), *Email*, *Contraseña* (masked, with a `mostrar` toggle in `primaryPressed`, and "Mínimo 8 caracteres." under it). Focused field = 2 px `primary` border. Primary **Crear cuenta**; Google repeated below as secondary for the parent who changes their mind. No confirm-password, no strength meter, no username. Field errors appear under the field that caused them, in words — never a red banner.

**`2c` Verificar el email.** "Revisá tu email" + "Te mandamos un código de 6 números a **alex@mail.com**." Six equal boxes (Fredoka 26 px, the active one 2 px `primary`), then "Reenviar el código en 0:42" as plain text. Verification fires **automatically on the sixth digit**; the primary button is for parents who don't trust that. Paste fills all six; OS autofill supported. A wrong code clears the boxes and explains in one line — no lockout copy, no attempt counter. **Cambiar el email** returns to `2b` with the field focused (the common real failure is a typo). The Google path never reaches here.

**`2d` Contame de tu familia.** The brief's prompt *is* the headline (Fredoka 27 px), not a field label. Below: a text box that **grows to fill** the screen, holding the brief's example as hint text (cleared on focus). Then "Escribilo, o mantené apretado el micrófono y contámelo.", then the tertiary **Prefiero un formulario** — the opt-out, which goes straight to `2h` and skips the summary card entirely. Bottom row: **Listo** (primary, flex) + the **64 px mic**, bottom-right, dashed `dashed` border with a `0.2` tag. No character counter, no validation.

**`2e` Nota de voz (0.2).** The held state, wireframed to pin the gesture: prompt dims, and the composer row becomes a **recording strip** — `0:07`, a bar-level trace, "← cancelar" — with the mic filled `primary`. **"Listo" is gone while recording**, so nothing sits beside or under the mic to be hit by mistake; the mic keeps its exact position and size. Above it, a dashed lock target and ↑ with "desplazá hacia arriba para fijar". Hold to record, slide up to lock hands-free (a parent holding a two-year-old can't hold a button), slide left or lift on "cancelar" to discard, lift anywhere else to send — no confirm step, no playback-and-approve. Silent throughout. Transcription, editing and retry are **not** designed.

**`2f` ¿Está bien así?** One card, four rows — *Chicos* (name · age), *Mascota*, *Le encanta*, *Juguetes* — each with a 12 px uppercase label and a 19 px value, separated by `#F0EAF8` hairlines. **Toy names appear exactly as typed** (*el dinosaurio chiquito*, *el tren grandote*, *el osito marrón*, *el caballo percherón*) — never normalised, corrected or capitalised. Primary **Sí, está perfecto**; secondary **Corregir**. This screen is for reading, not editing: no per-row edit affordances, no confidence scores, no "we think", no percentages.

**`2g` Entendió mal.** Same card, same order. Misread rows get `surfaceAccent` fill **+ a 3 px `primary` left bar + a bold "tocá para corregir" line** — three signals, never colour alone. Tapping a row opens `2h` focused on that field. One explanatory line under the card ("Inca quedó como hermana en vez de mascota, y el tren perdió su nombre de casa."). The emphasis flips: **Corregir** becomes primary, "Sí, está perfecto" drops to `surfaceQuiet`. No apology copy, no red, no error icon — the app doesn't dramatise its own mistake.

**`2h` Corregir.** The fallback, and it looks like a plain form. Same four groups in the same order as the card: *Chicos* (name + age side by side, "+ agregar otro chico" in `grassInk`), *Mascota*, *Le encanta* (removable chips + a dashed `+`), *Juguetes* labelled **"como los llaman en casa"** — the field most likely to be "fixed" by a well-meaning autocorrect. Everything optional. Primary **Guardar**. Reached three ways: the Corregir button, a tapped row in `2g`, or the opt-out in `2d`. After onboarding it lives permanently under **Mi familia** in the drawer.

**`2i` / `2j` Home.** See the open decision above. Header: 24 px hamburger (three 2 px `primary` bars) + wordmark, then the family line **"Milán, 2 años"** — kids only; the pet appears inside ideas and stories, never in the header. A flexible spacer pushes the actions down: **¿Qué hacemos ahora?** (132 px, Fredoka 32, left-aligned) and **Hora del cuento** (62 px secondary). `2j` adds one 18 px-radius card above the spacer — "LA ÚLTIMA IDEA", title, "15 min · adentro". One card, never a list; hidden when there's nothing to show. Never a feed, streaks, points, badges, or a nudge about days since last played.

**`2k` Panel lateral.** 304 px drawer over a `rgba(26,18,44,.55)` scrim with Home's buttons showing at the right edge, so the way out is obvious (scrim or ✕). Header: ✕ + wordmark. Then the account block (Alex / alex@mail.com). Items at 21 px Fredoka, 52 px+ rows: **¿Qué hacemos ahora?** (current — `surfaceQuiet` fill, not a colour cue), **Hora del cuento**, **Mi familia**, then a dashed **"próximas funciones"** slot. **Ajustes** is pinned to the bottom behind a hairline: account, not navigation. Everything after 0.1 (el baúl de juguetes, el diario, recuerdos) joins that list — which is why this is a drawer, not a tab bar. No badges, no counts, no red dots.

### Flow 2 · Daily idea

**`2l` Pensando una idea.** The wait happens **on Home** — the pressed button darkens to `primaryPressed` and holds three dots (slow ~1.2 s pulse, reduced-motion aware); "Hora del cuento" greys out so a second tap can't queue two requests. No navigation, no spinner overlay, no progress bar, no percentage, no "generating your activity…". If it's still thinking after ~6 s, one plain line appears under the button — **copy needs a voice pass**.

**`2m` / `2n` Actividad.** See the open decision. Shared: header = back + `15 MIN · ADENTRO` in `grassInk`; footer pinned, **Empezar** (primary, flex 1.5) + **Otra idea** (secondary, flex 1).
- `2m` order: title 30 px → "Por qué ahora" in a `surfaceAccent` card → "Qué necesitás" → three numbered steps with 28 px `primary` bullets → Más fácil / Más difícil as two bordered cards. Why-first, because that paragraph is what proves the app knows Milán.
- `2n` order: title 24 px → "Necesitás:" in one line → hairline → steps at **20 px** with large lilac numerals → hairline → easier/harder as a two-column footer line → "Por qué ahora" demoted to a quiet tinted card at the bottom. Playable in the first screenful.

**`2o` Empezar · el reloj.** The whole screen turns `surfaceAccent` — the only full-tint screen in the app, signalling "this screen is different". Centred: activity title (20 px `primary`), **104 px countdown**, and "Dejá el teléfono. El reloj sigue solo." Bottom: **Ocultar el reloj** (secondary — returns to the activity with the count running small in the header) and **Terminamos** (tertiary). Counts down from the activity's own estimate; it is a hint, not a target. **Silent at zero** — no alarm, no chime, no vibration the toddler will come running to; the screen simply stops counting. Dismissing costs nothing and the app never reports how long they actually played. The timer belongs to the activity, not the screen — backing out doesn't kill it. *This is the closest the app gets to a scoreboard: it must never log streaks, compare sessions, or say "you stopped early." Copy needs a voice pass.*

**`2p` Otra idea.** A swap, not a new screen: the activity's own blocks become lilac skeletons in place and refill when the next idea lands — like turning a card over. Layout height holds so the footer doesn't jump under the thumb; "Empezar" goes disabled and "Otra idea" shows the three dots. Back returns to the previous idea. No counter of ideas seen, no "3 left today", no shuffle animation.

**`2q` Sin conexión.** Built on `2j`. Status bar shows the loss, then the brief's line "Estás sin conexión. La última idea sigue acá." and the cached last-idea card, fully readable. Both generating actions go flat (`disabledFill` / `inkDisabled`): visible, clearly unavailable; tapping repeats the offline line rather than failing. An open story stays readable from the same cache. No retry spinner loop, no full-screen takeover, no "check your connection" dialog.

### Flow 3 · Bedtime

**`2r` ¿Cuál leemos hoy?** Three equal cards — title (Fredoka 20 px), one-line teaser, then reading time as `4 MIN` in `inkFaint`, always the last line because it's the deciding factor at 8 pm. All three fit without scrolling. Equal weight: the app suggests, it doesn't recommend one. Tertiary **Otras opciones** at the bottom — re-rolling should feel cheap (copy needs a voice pass). **No cover art, no illustration, no mascot** — this is exactly the screen where kid-styled apps signal to a child that the phone is for them.

**`2s` Escribiendo el cuento.** Background switches to `readingBg`. The chosen title is already set; the body arrives as text, with skeleton lines **at story measure and line-height** so nothing reflows when words land. Three dots at the bottom, same waiting language as `2l`. Reading can begin as soon as the first paragraph exists. **The wake lock engages here**, not after. No "writing your story…" theatre, no typing animation.

**`2t` / `2u` Pantalla de lectura (light / dark).** Header: back + `4 MIN · PANTALLA DESPIERTA`. Title in `primary` (light) / `#B79BF0` (dark), then story text at **21 px / 1.65** with 20 px paragraph gaps and `text-wrap: pretty`. Dialogue uses the em dash: "—¿Venís? —preguntó el tren." Footer: a 6 px bar (42 % filled) and "1 de 3" — **position in the story, never achievement**, and the only progress indicator in the app. Screen stays awake while open; releases on exit. No illustration, ever. 0.1 ships light; `2u` is the 0.3 target and nothing here may depend on a light background.

## Interactions & behaviour

- **Home → idea in seconds.** Never a list, never a feed, never a filter step. The wait stays on Home (`2l`).
- **Otra idea** replaces in place (`2p`); back retrieves the previous idea.
- **Empezar** opens `2o`; hiding the clock returns to the activity with a small running figure in the header.
- **Hora del cuento** → `2r` → `2s` → `2t`. Picking a story is the last interaction before reading.
- **Wake lock.** `navigator.wakeLock.request('screen')` on web (release on unmount/blur; platform equivalent on native), engaged from `2s` onward. Fail silently if unavailable.
- **Offline.** Cache the most recent activity and the open story locally; `2q` is the Home state.
- **Error.** "Uy, algo falló. ¿Probamos de nuevo?" with a retry affordance. No blame, no error codes in front of the parent.
- **Press states.** Slight scale-down (0.98) or one step darker, 120 ms ease-out. See guardrails 3–4: motion guides, and there is **no audio anywhere in this app**.
- **Reduced motion.** Respect `prefers-reduced-motion`; transitions become instant.
- **Dark mode.** 0.1 ships light; wire both token sets from day one — don't hard-code light hexes. For 0.3, the research points at **amber/brown, low brightness, away from blue and bright white**, surfaces dark-warm rather than pure black (Material's `#121212` reasoning), desaturated accents, ≥4.5:1 contrast, and story text no smaller than 21 px (dark mode is measurably less legible as text shrinks) — possibly one weight heavier. The current dark set is a cool purple-black; warming it is the expected 0.3 move, not a redesign. No competitor ships a warm night theme — that's the opening.
- **Responsive.** Designed at 390 px; cap and centre content above that. Story measure stays short (~34–40 characters at 21 px).

## State

- `account` — name, email, auth provider, `emailVerified`.
- `family` — kids (name, age), pet, interests, toys by family name. Written by onboarding (`2d`/`2h`), read by every screen; editable forever via **Mi familia**.
- `parseResult` — what the model understood plus per-field confidence, which drives the flagged rows in `2g`. Never surfaced as a number.
- `currentActivity` — the shown idea; replaced by Otra idea; persisted locally for offline.
- `activityTimer` — `{ activityId, endsAt, hidden }`. Owned by the activity, survives navigation, silent at zero.
- `storyOptions`, `currentStory`, `position` — persisted so a reopened story resumes.
- `connectivity`, `requestState` (`idle | loading | error`) for the two generating actions.
- `drawerOpen`.

Component state plus one family context is enough; no global store is warranted.

## Assets

None. No images, illustrations, icons or stock photography — by design. Every graphic element is CSS: the three wordmark dots, the hamburger bars, the mic (capsule + base line), the padlock, the level trace, the progress bar, the `G` circle on the Google button. Iconography and the app icon land in 0.2 — until then, glyphs (`←`, `✕`) stand in and should be replaced by the platform's own affordances.

Fonts: [Fredoka](https://fonts.google.com/specimen/Fredoka) and [Nunito Sans](https://fonts.google.com/specimen/Nunito+Sans), both SIL Open Font License, self-hosted.

## Copy needing a voice pass before build

"Listo" (`2d`), "Prefiero un formulario" (`2d`), "Guardar" (`2h`), the >6 s waiting line (`2l`), "Empezar" (`2m`/`2n`), "Dejá el teléfono. El reloj sigue solo." / "Ocultar el reloj" / "Terminamos" (`2o`), "Otras opciones" (`2r`), and all account-screen labels (`2a`–`2c`). Everything else is taken verbatim from the brief.

## Out of scope for 0.1

Do not build: the toy box, voice recording (button and gesture only), goals, activity categories or filters, weather, the moments journal, parenting tips, recaps, holidays, the partner invite, post-activity feedback, or an English interface. The drawer's "próximas funciones" slot is where these will land.

## Files

- `Juguemos - Mockups 0.1.dc.html` — all 21 screens in Plaza colour, ids `2a`–`2u`. The spec.
- `Juguemos - Wireframes 0.1.dc.html` — greyscale structure, ids `1a`–`1t`, with per-screen notes on intent and anti-patterns.
- `Juguemos - Plaza.dc.html` — brand direction: wordmark, light/dark palettes, type scale.
- `brief.md` — the product brief: audience, voice, the five commitments, the full copy deck.
- `similar-apps.md` — the competitive and cultural research behind the guardrails. Read section 8 before making any styling call this README doesn't cover.
