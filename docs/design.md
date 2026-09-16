# Juguemos — Design

What the app looks like, and the rules behind it. The values live in the code: the colour tokens and the type scale in `web/src/styles/tokens.css`, the primitives every screen is built from in `web/src/shared/ui/`. This document is the reasoning around them, so a UI change can be checked against something. The research behind the rules is in [similar-apps.md](similar-apps.md).

The direction is called **Plaza**. It was chosen for 0.1, and every screen ships in it. The 0.1 design handoff that specified those screens is in git history; the screens themselves are built, so the code is now the spec.

## Who holds the phone

A parent, never a child. At 6pm on a rainy Tuesday, out of ideas, one hand on the phone and a two-year-old pulling at the other sleeve. In a plaza with glare and weak signal, or a dim bedroom at bedtime.

Children don't look at the screen. Stories have no illustrations, so the child watches the parent read.

**Juguemos is a tool for grown-ups, about play.** The playfulness comes from the words and the colour, not from styling the app like a kids' app. Kid styling tells a child the phone is for them, which works against *screens off, play on*.

## What the design has to do

From the five commitments in [constitution.md](constitution.md):

| Commitment | What it means on screen |
|---|---|
| Families play together | The app is the invitation, not the destination. No scores. |
| Screens off, play on | A juego within seconds, one at a time, never a list or a feed. A short session is a good session. |
| We walk alongside | Warm and never judging. The app suggests; the parent decides. |
| Just talk to it | Calm, obvious screens that work one-handed. Forms are the fallback, not the main path. |
| Grows with your family | The family's own names everywhere: Milán, Inca, *el dinosaurio chiquito*. |

## The choices already made

**Two fonts.** Fredoka for display, buttons, numbers, and the wordmark; Nunito Sans for body, labels, and story text. Both self-hosted, both with full Spanish coverage (á é í ó ú ñ ü ¿ ¡ —). Fredoka 600 is the one childish-reading lever in the design and it is already at its limit: no heavier weight, no rounded body font, no extra letter-spacing.

**One short palette,** in `tokens.css` and nowhere else, with a light and a dark set. Sand background, jacarandá purple as the primary, grass green for meta labels and secondary borders. Warm, with real colour: not desaturated toward neutral. In dark the secondary button loses the green, which vibrated against the purple.

**Night mode** is dark from 19:00 to 07:00, unless a one-tap choice overrides it until the next switch. The dark set is wired from day one so nothing depends on a light background. It is currently a cool purple-black; warming it toward amber is the expected 0.3 move, not a redesign.

**No images.** Every graphic element is CSS: the wordmark's three dots, the hamburger bars, the mic, the progress bar, the waiting animations. Iconography and the app icon arrive in 0.2.

**The wordmark** is "Juguemos" in Fredoka 600 with three dots in grass, sun, and jacarandá. The dots are a *ronda*, not a face. It is a working wordmark; trademark and domain checks are pending.

**Phone first, 390 px.** Capped with `max-width`, never a fixed width. Desktop must not break but gets no layout work. Primary actions sit in the lower half, within thumb reach, and every tap target is at least 48 px.

## The rules that are easiest to undo by accident

Each of these is a way the design gets dismantled one reasonable-looking commit at a time.

1. **No mascot, character, or cartoon.** Not in empty states, loading, or errors. The wordmark's dots never get eyes and never grow past splash size. The waiting animations are shapes from the plaza — *la ronda*, jacarandá petals, *la rayuela* — and never a creature (JUG-132, JUG-133).
2. **No sound, ever,** including when the activity timer ends. A parent should never have to mute this app in a restaurant, and a chime pulls the toddler back to the phone. The one exception is the voice note's short vibration ticks, which Alex added (JUG-135).
3. **Motion guides and never demands.** 120–200 ms ease-out. No bounce, spring, confetti, or anything unskippable, and respect `prefers-reduced-motion`. The waiting animations are the one long loop: slow and quiet, and always back where they began, so nothing in them counts. When motion is reduced they are the three dots again.
4. **Flat.** No gradients, gloss, 3D, or drop-shadow buttons. Chubby type plus saturated colour plus glossy buttons is the register of a game, not of a calm tool.
5. **Never clinical and never a scoreboard.** No progress rings, streaks, points, badges, counts, percentages, milestones, development-area colour coding, "on track", "you stopped early", or days since the family last played. The only progress bar in the app marks position in a story. The timer never logs or compares sessions.
6. **Never sell certainty or fear.** No "the best start", no "don't fall behind". Never correct the parent, mention bad outcomes, or imply a deficit.
7. **One juego, never a list or a feed.** The wait for a juego happens on Home. Home's last-juego card is capped at one.
8. **Colour is never the only signal.** Flagged rows get a tint, a bar, and words. The current drawer item is a filled row, not a coloured one.
9. **No art beside a story,** even after 0.2 brings illustration: no cover art on the options, and nothing in or around the text a parent is reading. The child should watch the parent, not the phone. The only thing that shows before a story does is the waiting animation while it is written, and it gives way to the first words (JUG-132). The wake lock holds from the moment a story starts being written until the parent leaves it.
10. **The family's words stay exactly as typed.** Toy names are never normalised, capitalised, or autocorrected.
11. **Local, not postcard.** Plaza, jacarandá, *rayuela*, *la ronda*, cardboard. Never tango, mate, the Obelisco, or the flag. The references are Isol, Limonero, Pakapaka, Canticuénticos.
12. **Any handmade texture has to be real.** If grain or hand-drawn marks arrive in 0.2, they come from a named illustrator. Imitation wobble reads cheap.

## Words

All interface copy is **Rioplatense Spanish with *vos*** (*hacé*, *escondé*, *contame*, *probá*). Never *tú*, Spain Spanish, or neutral international Spanish.

The voice is a warm, experienced friend who knows the family. Short sentences, plain words, light humour. Never preachy, never clinical, and no baby talk with parents. Avoid exclamation marks everywhere ("¡Súper! ¡Genial!"), guilt ("Hace tres días que no juegan"), and developmental jargon ("estimulación temprana", "hitos del desarrollo").

What the app suggests is a **juego**, never an *idea*, and Home's button says **¡Juguemos!** (JUG-69).

Failures say "Uy, algo falló. ¿Probamos de nuevo?" — no blame, no error codes in front of a parent. Field errors go under the field that caused them, in words, never in a red banner. Offline says "Estás sin conexión. El último juego sigue acá."

Some copy still needs a voice pass; those places are marked `Voice pass pending` in the code.

## Still open

- **Activity layout.** The app shows why-first: the paragraph that proves it knows Milán comes before the steps. `ActivityView` still takes a `layout` prop and can render steps-first, which is playable in the first screenful, until Alex picks one and the other goes.
- **0.2 design** (JUG-84) covers iconography, the app icon, illustration style, the toy box screens, and the voice note's states, which were built from the primitives ahead of it.
