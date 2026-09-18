# Ludi — Design

What the app looks like, and the rules behind it. The values live in the code: the colour tokens and the type scale in `web/src/styles/tokens.css`, the primitives every screen is built from in `web/src/shared/ui/`, the icons in `web/src/shared/ui/Icons.jsx`, the app icon in `web/public/`. This document is the reasoning around them, so a UI change can be checked against something. The research behind the rules is in [similar-apps.md](similar-apps.md), and the brand decisions still open are in [brand-brief.md](brand-brief.md).

The direction is called **Plaza**. It was chosen for 0.1, and every screen ships in it. The 0.1 design handoff that specified those screens is in git history; the screens themselves are built, so the code is now the spec.

## Who holds the phone

A parent, never a child. At 6pm on a rainy Tuesday, out of ideas, one hand on the phone and a two-year-old pulling at the other sleeve. In a plaza with glare and weak signal, or a dim bedroom at bedtime.

Children don't look at the screen. Stories have no illustrations, so the child watches the parent read.

**Ludi is a tool for grown-ups, about play, and it should be fun to use.** A calm app can still be a dull one, and a parent who smiles opening it is more likely to play. The playfulness comes from the words, the colour, and the way things move: buttons that give under a thumb, a juego that arrives step by step, petals when the time is up, *Fin* drawn at the end of a story. What it doesn't come from is dressing the app up as a kids' app, with cartoon characters and game rewards, because that tells a child the phone is for them and works against *screens off, play on*.

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

**The brand travels to the inbox.** Ludi's emails are the same short palette and type as the app: the wordmark with its ronda, a white card on sand, one jacarandá button. They carry no images and no web fonts, so nothing is fetched when one is opened and nothing can track it, and they ask clients not to invert their colours, so the brand reads as it was drawn. [api/AGENTS.md](../api/AGENTS.md) says how one is built.

**No photography, no stock art, no gradients.** Everything on screen is type, token colour, a CSS shape, an icon from the set, or one of the small drawings in `shared/ui`. The wordmark, the progress bar, the level trace and the waiting animations are drawn in CSS; *Fin* and the moon at the end of a story, the wordmark Bienvenida writes, and the weather on Home are SVG lines in the tokens.

**The wordmark** is "Ludi" in Fredoka 600 with three dots in grass, sun, and jacarandá. The dots are a *ronda*, not a face. It is a working wordmark: the domain is `ludi.ar`, and the trademark check is pending.

**The app icon** is that same ronda on a jacarandá field. See [The app icon](#the-app-icon) below.

**Phone first, 390 px.** Capped with `max-width`, never a fixed width. Desktop must not break but gets no layout work. Primary actions sit in the lower half, within thumb reach, and every tap target is at least 48 px.

## The rules that are easiest to undo by accident

Each of these is a way the design gets dismantled one reasonable-looking commit at a time.

1. **No mascot, character, or cartoon.** Not in empty states, loading, or errors. The wordmark's dots never get eyes and never grow past splash size. The waiting animations are *la ronda* and a crayon, pencil, or pen drawing, never a creature (JUG-132, JUG-133, JUG-160). The interest marks draw the animal or the toy as a line pictogram (JUG-166): a dot for an eye at most, never a mouth or an expression, and never a character with a name. The `FamilyIcon`'s two figures are a pictogram with no faces, and they stay that way.
2. **No sound, ever,** including when the activity timer ends. A parent should never have to mute this app in a restaurant, and a chime pulls the toddler back to the phone. The one exception is the voice note's short vibration ticks, which Alex added (JUG-135). A discovery game is not an exception but the point: in *¿Qué suena?* the sound is the game (JUG-177), so it plays there and nowhere else, and only when the parent taps *Escuchar*, *Otra vez*, *Ver la respuesta*, or *Otro sonido*. Nothing in it plays by itself.
3. **Motion plays but never holds anyone up.** Things are allowed to bounce a little, pop, and land. Nothing waits for an animation to finish, nothing is unskippable, and nothing celebrates an achievement: no confetti, no fanfare. Every animation is off with `prefers-reduced-motion`. See [Motion](#motion).
4. **Flat.** No gradients, gloss, 3D, or drop-shadow buttons. Chubby type plus saturated colour plus glossy buttons is the register of a game, not of a calm tool.
5. **Never clinical and never a scoreboard.** No progress rings, streaks, points, badges, counts, percentages, milestones, development-area colour coding, "on track", "you stopped early", or days since the family last played. The only progress bar in the app marks position in a story. The timer never logs or compares sessions.
6. **Never sell certainty or fear.** No "the best start", no "don't fall behind". Never correct the parent, mention bad outcomes, or imply a deficit.
7. **One juego, never a list or a feed.** The wait for a juego happens on Home. Home's last-juego card is capped at one. *Lo que jugamos* is the one list of juegos, and it holds only what the family already played or read in the last month (JUG-188): a way back to a favourite, never a catalogue to browse, and never a count.
8. **Colour is never the only signal.** Flagged rows get a tint, a bar, and words. A chosen chip gets a check as well as a fill. The current drawer item is a filled row, not a coloured one.
9. **Nothing drawn or moving inside the story text.** The child should watch the parent, not the phone, so nothing moves or sits in the paragraphs a parent is reading. Styled words are the one exception: the sounds the parent acts out are bold and in the primary colour (JUG-170), with no icon beside them. Beside a story is fine: its interest mark sits in the corner of its card on the options, the shelves, and Home (JUG-160), and over its title on the reading screen (JUG-166), and the legend of its sounds, with their marks, sits between the title and the text (JUG-170). Before the story, the drawing wait holds its place and gives way to the first words (JUG-132); after the last paragraph, *Fin* draws itself once (JUG-159). The wake lock holds from the moment a story starts being written until the parent leaves it.
10. **The family's words stay exactly as typed.** Toy names are never normalised, capitalised, or autocorrected. The one exception is the interest chips under *Quizás un cuento de…*, which drop a leading article (*dinosaurios*, not *los dinosaurios*) and still send the words as typed (JUG-190).
11. **Local, not postcard.** Plaza, jacarandá, *rayuela*, *la ronda*, cardboard. Never tango, mate, the Obelisco, or the flag. The references are Isol, Limonero, Pakapaka, Canticuénticos.
12. **Any handmade texture has to be real.** If grain or hand-drawn marks arrive, they come from a named illustrator. Imitation wobble reads cheap.
13. **An icon never carries a meaning on its own.** Every icon is decorative, and the button around it holds the label. See [Iconography](#iconography).

## Motion

Motion is where most of the fun lives, so it gets the same care as colour. The values are tokens in `tokens.css`, and the shared keyframes (`rise-in`, `pop-in`, `slide-in`) are in `base.css`.

| Token | Value | For |
|---|---|---|
| `--motion-quick` | 160 ms | Guidance: a press, a border, a colour change |
| `--motion-moment` | 420 ms | Something arriving: a card, a step, a chip |
| `--motion-stagger` | 70 ms | The gap between things that arrive one after another |
| `--ease-out` | settles, no overshoot | Anything that follows the finger |
| `--ease-play` | a small overshoot | Anything that lands |

**The kinds of motion.**

- **A press gives.** Buttons squash to 95% and cards to 97%, and spring back when the finger lifts.
- **Things arrive, one after another.** A screen settles up as it opens. A juego's blocks and then its steps rise in turn, with each number popping in after its step. Home's cards, the toys in the baúl, the story options as they are written, and the menu's rows do the same.
- **A few moments get a small drawing or a gesture, once.** They are listed below. Each plays once and needs nothing from the parent.
- **Waits loop, slowly.** The waiting animations are the only loops (JUG-132, JUG-133), always back where they began, so nothing in them counts. The waiting dots hop in turn like a ronda, and a long wait is the ronda turning. A story being written is a drawing (JUG-160): a crayon under three, a pencil to five, and a pen after that, drawing the story's interest mark, or a zigzag, a house, or a line of handwriting when it has none. It draws, holds, fades, and starts again.

**The moments.**

| When | What happens |
|---|---|
| A new account arrives on Bienvenida | The wordmark writes itself: *Ludi* stroke by stroke, then the i's dot, then the ronda hops in, one dot after another (JUG-173) |
| Home opens | The wordmark's three dots hop once, one after another |
| Home opens with the weather, or it is tapped | The weather in the corner draws itself once: the sun's rays turn in, rain falls, the wind blows through, a wool hat lands, the moon swings in. The tap also shows its line (JUG-191) |
| ¡Juguemos! is thinking | The ronda turns inside the button |
| Otro juego | The next juego is dealt in from the side |
| A chip is added or chosen | It pops in; a chosen one swells and its check turns in |
| The timer reaches zero | Jacarandá petals fall once over the screen and the clock nods. Still no sound |
| ¿Qué suena? shows its answer | The answer's row swells once and its check pops in, whether the kids guessed it or not (JUG-177) |
| The end of a story | *Fin* is drawn with a line under it; at night, a moon and two stars |
| Night mode is tapped | The sun comes up turning, or the moon swings in |
| A story card, a story's title, or a toy appears | Its interest mark lands with a small turn (`mark-in`) |

**Limits that don't move.** No sound, outside a discovery game's own taps. Nothing that counts, scores, or rewards: a moment marks that something happened, never that the family did well. Nothing loops except a wait. Nothing moves inside the story text. And with reduced motion, all of it is off: anything that starts hidden shows at its final state, and the petals don't appear.

**Adding a moment.** Use the tokens and the shared keyframes, keep it under about half a second unless it is a wait, the petals, or a drawing like *Fin* (about a second and a half at most), and check it with reduced motion on. A drawing goes in `shared/ui/Moments.jsx`, never as an `<svg>` in a screen. Add it to the table above.

## Colour

The whole palette is `web/src/styles/tokens.css`, in a light set and a dark set. **Never write a hex value in a component or a screen.** A colour that isn't a token doesn't exist; if a screen needs one, add it to `tokens.css` in both sets. The two places hex is written out are the app icon and the email templates (`api/src/email/templates/partials/head.mjml`), because neither can read `tokens.css`; both change when a brand colour changes.

| Group | Tokens | What it is for |
|---|---|---|
| Page | `--bg`, `--surface`, `--surface-accent`, `--surface-quiet`, `--reading-bg` | The page, cards on it, and the two screens that repaint the page through `Screen`'s `tone` |
| Brand | `--primary`, `--primary-pressed`, `--on-primary` | Jacarandá. The primary button, links, and the icons in a header |
| Grass | `--grass`, `--grass-ink`, `--secondary-border`, `--secondary-text` | Meta labels and the secondary button's outline. In dark the secondary button drops the green |
| Ink | `--ink`, `--ink-body`, `--ink-body-soft`, `--ink-reading`, `--ink-muted`, `--ink-faint`, `--ink-hint`, `--ink-disabled` | Text, from a heading down to a placeholder. Going quieter means going down this list, never adding opacity |
| Lines | `--hairline`, `--hairline-strong`, `--row-divider`, `--dashed` | Card borders, dividers, and the dashed edge of anything not filled in yet |
| Wordmark | `--wordmark`, `--dot-grass`, `--dot-sun`, `--dot-jacaranda` | The wordmark and the `RondaIcon`. Beyond them, only the moments use the dot colours: the petals, the stars and moon at the end of a story, and the fill of the weather's sun, moon, bolt, and wool hat (JUG-191) |

Contrast meets WCAG AA in both sets, because the app gets read in a sunny plaza and in a dark bedroom.

## Type

Two families, no third. Sizes are px so they don't compound, and the scale below is what the code uses; a new screen picks the nearest role rather than a new size.

**Fredoka** (`--font-display`), 400–600. Headings, buttons, card titles, the wordmark, and numbers.

| Role | Size | Weight |
|---|---|---|
| Page title | 30 | 600 |
| Header title, inline | 24 | 600 |
| Card title, drawer row | 20–21 | 400–600 |
| Buttons | 17–22, by size | 600 |
| Timer numeral | 104 | 500 |

**Nunito Sans** (`--font-body`), 400–700. Everything a parent reads as a sentence.

| Role | Size | Line height |
|---|---|---|
| Story text | 21 | 1.65, capped at 36ch |
| Lede, family line | 17 | 1.4–1.45 |
| Field input | 18 | — |
| Body, card meta, chips | 15–16 | 1.4 |
| Label, field help, field error | 13–14 | 1.4 |
| Uppercase meta (`MetaLabel`) | 12–13, .06em | — |

Story text is deliberately larger than anything else: it is read aloud in a dim room.

## Space, shape, and line

- **Page padding is 26 px** on both sides, everywhere. The drawer uses 22.
- **Corner radius** goes with size: 14 for a drawer row, 16–18 for a card, 20 for a button, 28 for Home's big button, 999 for a chip, 50% for a dot. Nothing is square and nothing is a pill unless it is a chip.
- **Tap targets are at least 48 px,** even where the visible shape is smaller. A chip is 40 px tall and grows its target with a `::after` inset.
- **Borders are 1 px,** 2 px only where the border is the shape itself (the mic, a toggle's mark). The icon set's line is also 2 px, which is why the two sit together.
- **Nothing casts a shadow.** Separation comes from a hairline or a change of surface.

## Iconography

One set, in `web/src/shared/ui/Icons.jsx`, exported through `shared/ui/index.js`. It replaced the `←`, `✕`, `✓`, `×`, `+` and `↑` characters and the CSS hamburger and padlock, so the app no longer depends on how a phone happens to draw a character.

**The drawing rules.** Every icon is one 24 px drawing on the same grid:

- `viewBox="0 0 24 24"`, and nothing inside the outer 2 px of the box.
- A **2 px stroke** in `currentColor`, round caps and round joins, `fill="none"`. One weight; there is no light or bold variant.
- **No two-tone, no fill, no background plate.** A shape reads by its outline, the way the mic and the padlock already did.
- Colour comes from whatever the icon sits in, so **night mode needs no second drawing.** An icon in a header is `--primary`; one in a drawer row takes the row's ink; one in a filled toggle takes `--on-primary`.
- `RondaIcon` is the one exception: it is filled, in the three wordmark colours, because it is the brand mark rather than a pictogram. It never grows past a row's height and never gets a face.

**The rules that matter more than the drawing.**

- **An icon is decorative.** Every one is `aria-hidden`, and the button around it carries the `aria-label`. An icon is never the only thing that says what a control does: the drawer's rows are still words, and a chosen chip has a check *and* a fill *and* `aria-pressed`.
- **An icon never replaces a word in a primary action.** Buttons say what they do in Rioplatense Spanish. Icons sit on the small controls: back, close, the menu, the mic, a chip's mark, a drawer row.
- **`size` is the only knob.** 24 in a 48 px target, 22 in a drawer row, 15–18 inside a chip or a mark, 28 on the mic. Don't restyle the stroke.
- **Add a new icon here, never an `<svg>` in a screen,** so the set stays one weight. If a screen needs an idea the set doesn't have, the icon is the work, not the workaround.

**What the set covers.** Back, home, close, check, plus, menu, arrow-up; mic and lock for the voice note; sun and moon for night mode; and one per drawer section — ronda (¡Juguemos!), book (Hora del cuento), a clock turning back (Lo que jugamos), family, toy box, scissors (Materiales), and sliders for Ajustes. Sliders rather than a gear, which reads mechanical.

**The pet's animal is the one place with emoji.** In the family form the Mascota row is one control: a picker with the animal's emoji, and the pet's name beside it. Emoji rather than the set, because seven animals would cost seven drawings; the emoji alone, with no word next to it, because the row reads at a glance. Each animal still carries its word as the option's accessible name, so a screen reader says "Perro". Nothing else in the app uses emoji.

**Interest marks** (JUG-160, JUG-166) are the one group that isn't a control. `MarkIcon` draws something kids commonly love, on the same grid and line as the rest: the animal or the toy itself, as a line pictogram.

| Mark | For |
|---|---|
| `dinosaur` | dinosaurios, T-rex, triceratops |
| `dragon` | dragones |
| `unicorn` | unicornios |
| `dog` | perros, cachorros |
| `cat` | gatos |
| `horse` | caballos, ponis |
| `rabbit` | conejos |
| `butterfly` | mariposas, bichos, vaquitas de San Antonio |
| `cow` | vacas, toros, la granja |
| `lion` | leones |
| `bear` | osos, ositos, peluches |
| `elephant` | elefantes |
| `bird` | pájaros, pollitos, patos, loros, búhos, pingüinos |
| `whale` | ballenas, delfines, orcas |
| `fish` | peces, tiburones, pescar |
| `truck` | camiones, volquetes, bomberos |
| `tractor` | tractores, excavadoras, topadoras, grúas |
| `car` | autos, coches, carreras |
| `train` | trenes |
| `plane` | aviones |
| `rocket` | cohetes, astronautas, el espacio |
| `boat` | barcos, piratas, veleros |
| `robot` | robots |
| `blocks` | bloques, Lego, Rasti |
| `waves` | el mar, la playa, la pileta, el agua, sirenas |
| `bow` | muñecas, princesas, hadas |
| `notes` | música, canciones, bailar, instrumentos |
| `ball` | fútbol, pelotas |
| `paw` | animales, mascotas, el zoológico |

`interestMark()` in the family feature picks one from the family's own words, a story's, or a toy's, without accents or case, and many words get none. The list is tried in order, so the specific thing wins over the general one: a *camión de bomberos* is a truck, a *unicornio* is not a horse, and only an animal nothing else matches gets the paw. A mark is decoration, never a category or a filter: it shows beside an interest chip, on a story's card, over a story's title on the reading screen, beside a sound in a story's legend (from `characterMark()`: the pet by its animal, anyone else by their words), and on a toy's card in the baúl and its own screen, and the story wait draws it. It is still the words beside it that say what something is.

**Drawing a new mark.** Line only, on the 24 px grid, no fill. An animal gets at most a dot for an eye and never a mouth, a smile, or an expression, so it stays a pictogram and never becomes a character. No path longer than 100 units, since the story wait draws each one with a 100-unit dash. Add it to the set, to the word list, and to the table above.

## The app icon

`web/public/icon.svg` is the mark: the wordmark's ronda of three dots on a jacarandá field, in sun, grass, and sand. The wordmark itself is not in it: even at four letters it can't be read at 16 px, and a phone already writes the name under the icon.

- **Full bleed,** because a maskable icon is cropped to whatever shape the phone uses. The ronda sits inside the maskable safe zone — the middle 80% — so one drawing covers both `any` and `maskable` and the manifest lists it once.
- The colours are written out as hex, not tokens, because a file outside the app can't read `tokens.css`. **Both files change together** when a brand colour changes.
- **The icon does not follow night mode.** A home-screen icon can't, and the jacarandá field holds up on a light and a dark home screen.
- `web/public/favicon.svg` is the same mark drawn tighter, with a rounded corner: a favicon has no safe zone to keep clear, and at 16 px the ronda needs every pixel.

The PNGs in `web/public/` are rendered from those two files and committed, so no build step depends on a drawing tool:

```bash
cd web/public
rsvg-convert -w 192 -h 192 icon.svg -o icon-192.png
rsvg-convert -w 512 -h 512 icon.svg -o icon-512.png
rsvg-convert -w 180 -h 180 icon.svg -o apple-touch-icon.png
for s in 16 32 48; do rsvg-convert -w $s -h $s favicon.svg -o /tmp/f$s.png; done
magick /tmp/f16.png /tmp/f32.png /tmp/f48.png favicon.ico
```

The manifest is in `web/vite.config.js`; the favicon and Apple touch links are in `web/index.html`.

## Illustration

**Not chosen yet, and no 0.2 feature waits on it** (JUG-85). The three directions and their references are in [brand-brief.md](brand-brief.md), for Alex to pick from.

Until there is a decision, the rules hold either way:

- **Never on the reading screen or the story options.** That is rule 9 and it does not move.
- **Never a character.** No mascot, no recurring friend, nothing with a face. Places, objects, and light, not creatures.
- **Only from a named illustrator,** commissioned and credited, and never generated or imitated. An app that tells families their words matter can't use art nobody made.
- **Token colours only,** so a drawing works in both sets or ships in two versions.
- **Nowhere a parent is in a hurry.** Illustration belongs where someone is arriving — the entrada screen, an empty baúl — never between a parent and a juego. The waiting animations stay drawn in code (JUG-132, JUG-133, JUG-160).

## Words

All interface copy is **Rioplatense Spanish with *vos*** (*hacé*, *escondé*, *contame*, *probá*). Never *tú*, Spain Spanish, or neutral international Spanish.

The voice is a warm, experienced friend who knows the family. Short sentences, plain words, light humour. Never preachy, never clinical, and no baby talk with parents. Avoid exclamation marks everywhere ("¡Súper! ¡Genial!"), guilt ("Hace tres días que no juegan"), and developmental jargon ("estimulación temprana", "hitos del desarrollo").

What the app suggests is a **juego**, never an *idea*, and Home's button says **¡Juguemos!** (JUG-69).

Failures say "Uy, algo falló. ¿Probamos de nuevo?" — no blame, no error codes in front of a parent. Field errors go under the field that caused them, in words, never in a red banner. Offline says "Estás sin conexión. El último juego sigue acá."

Some copy still needs a voice pass; those places are marked `Voice pass pending` in the code.

## Still open

- **Activity layout.** The app shows why-first: the paragraph that proves it knows Milán comes before the steps. `ActivityView` still takes a `layout` prop and can render steps-first, which is playable in the first screenful, until Alex picks one and the other goes.
- **Illustration** (JUG-85): the style, who draws it, and whether it appears at all. [brand-brief.md](brand-brief.md) has the directions to choose from.
- **The type scale drifted.** Sixteen sizes between 12 and 38 px are in use where the table above names eight roles. Worth a pass that moves each one to its nearest role, but not while screens are still being added.
- **A warmer dark set,** toward amber rather than the current purple-black, expected in 0.3.
