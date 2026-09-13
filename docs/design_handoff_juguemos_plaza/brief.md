# Juguemos — Design Brief

**Version:** 0.1 · September 2026 · Owner: Alex Otero

*Release 0.1 only. Only the screens listed here are in scope.*

---

## 1. What Juguemos is

Juguemos ("let's play") is a play coach for families in Buenos Aires with children aged 1 to 5. It knows the family: the kids and their ages, what they love, the pet, and the toys, called by the names the family uses at home. It uses that to answer one everyday question: *"¿Qué hacemos ahora?"*

One tap gives one idea for playing together, and then the phone goes down. Juguemos also writes short stories starring the family, for a parent to read aloud.

**Working tagline:** The play coach that knows your family by heart.

## 2. Who holds the phone

Parents do, never the kids. Picture them:

- At 6pm on a rainy Tuesday, tired and out of ideas.
- Holding the phone in one hand, with a two-year-old on their hip or pulling at their sleeve.
- In a plaza with glare and weak signal, or in a dim bedroom at bedtime.

Children don't look at the screen. Stories have no illustrations, so the child watches the parent instead of the phone.

**Juguemos is a tool for grown-ups, about play.** It should feel warm and playful without looking like a kids' app or a toy.

## 3. What the design must do

| Commitment | What it means for the design |
|---|---|
| Families play together | The app is the invitation, not the destination. It celebrates shared moments, never scores. |
| Screens off, play on | An idea within seconds, and one idea at a time, never a list or a feed. Steps can be read at a glance. The best session is a short one. |
| We walk alongside | Warm and never judging. Parents are the experts on their own kids; the app suggests and never prescribes. |
| Just talk to it | Simple, calm, obvious screens that work one-handed. Forms exist only as a fallback. |
| Grows with your family | The family's own names appear everywhere: Milán, Inca, *el dinosaurio chiquito*. Every screen should feel made for this family, not any family. |

**Never:** feeds, streaks, points, badges, progress bars that turn play into a score, guilt, fake urgency, notification bait, pink-for-girls or blue-for-boys colour coding, or stock photos of perfect families.

## 4. Local, not translated

Designed in and for Buenos Aires. Local inspiration is welcome if used lightly: plazas and their jacarandás, *la rayuela* chalked on the pavement, *la ronda*, crafts made from cardboard boxes, family Sundays, and the city's strong tradition of children's books and music.

Avoid postcard clichés such as tango, mate, the Obelisco, or the flag.

## 5. Language and voice

All interface copy is in **Rioplatense Spanish with *vos*** (*hacé*, *escondé*, *contame*, *probá*). Never *tú*, Spain Spanish, or neutral "international" Spanish.

The voice is a warm, experienced friend who knows the family. Sentences are short, words are plain, humour is light. Never preachy or clinical, and no baby talk with parents.

| Moment | Line |
|---|---|
| Main button | ¿Qué hacemos ahora? |
| See a different idea | Otra idea |
| Start of onboarding | Contame de tu familia: quiénes son, cuántos años tienen los chicos, qué les encanta y con qué juegan. |
| Confirming what the app understood | ¿Está bien así? |
| Confirm buttons | Sí, está perfecto · Corregir |
| Story button | Hora del cuento |
| Choosing a story | ¿Cuál leemos hoy? |
| Something failed | Uy, algo falló. ¿Probamos de nuevo? |
| No connection | Estás sin conexión. La última idea sigue acá. |

**Avoid:** exclamation marks everywhere ("¡Súper! ¡Genial!"), guilt ("Hace tres días que no juegan"), and developmental jargon ("estimulación temprana", "hitos del desarrollo").

## 6. Example family

Use this family in every design instead of placeholder text.

- **Alex and Caro**, the parents.
- **Milán**, two years old, who loves dinosaurs and horses.
- **Inca**, the family dog.
- **Toys**, by their family names: *el dinosaurio chiquito*, *el tren grandote*, *el osito marrón*, *el caballo percherón*.

Toy names always appear exactly as the family says them. The app never corrects them or swaps in what the toy really is.

**What a parent writes in onboarding:**

> Somos Alex y Caro, tenemos a Milán, de dos años, y a Inca, nuestra mascota. A Milán le encantan los dinosaurios y los caballos, y tiene un tren de madera que no suelta.

**An activity:**

> **La búsqueda del dinosaurio chiquito** · 15 min · Adentro
>
> *Por qué ahora:* usa el dinosaurio chiquito, a Milán le encantan los dinos y es ideal para una tarde de lluvia.
>
> *Qué necesitás:* el dinosaurio chiquito y un almohadón.
>
> 1. Escondé el dinosaurio chiquito debajo de un almohadón mientras Milán mira.
> 2. Preguntá: "¿Dónde está el dinosaurio?" y buscalo con Milán.
> 3. Cuando lo encuentre, ¡que ruja!
>
> *Más fácil:* dejá la cola asomando. *Más difícil:* escondelo en otro lugar del living.

**Three story options:**

> **El caballo percherón pierde su herradura.** Milán y el caballo percherón la buscan por toda la casa. · 4 min
>
> **Inca y el dinosaurio chiquito van a la plaza.** Una aventura por el barrio. · 5 min
>
> **El osito marrón no tiene sueño.** Un cuento tranquilo para antes de dormir. · 3 min

**The start of a story:**

> Había una vez un dinosaurio chiquito que vivía en la caja de juguetes de Milán. Una tarde de lluvia, escuchó un ruido que venía del pasillo: ¡chu-chú, chu-chú! Era el tren grandote, que venía a buscarlo para ir de paseo.
>
> —¿Venís? —preguntó el tren.
>
> El dinosaurio chiquito se subió al último vagón, y allá fueron los dos, despacito, por toda la casa.

## 7. Screens in scope for 0.1

| Screen | What it does |
|---|---|
| **Sign in** | One parent, one account. Sign-in method isn't decided yet, so keep it generic. |
| **Tell us about your family** | A large text box with the onboarding prompt, and the example above as a hint. Text only in 0.1. Voice notes arrive in 0.2, so leave room for a microphone button next to the text box, but don't design the recording flow. |
| **¿Está bien así?** | A summary card of what the app understood: the kids (name and age), the pet, interests, and toys by their family names. The parent confirms or corrects it. |
| **Correction form** | A plain form with kids, pet, interests, and toys. The fallback, not the main path. |
| **Home** | The big *"¿Qué hacemos ahora?"* button is the heart of the app. *"Hora del cuento"* sits here too, as the second action. |
| **Activity** | One idea: title, time, why it fits now, what you need, steps, and easier and harder versions. *"Otra idea"* shows a different one. Readable at a glance. |
| **Story options** | Three plot options, each with a title, a one-line teaser, and an estimated reading time. |
| **Reading screen** | Large, calm text that's comfortable in a dim room, with no illustrations. The screen stays awake. A light version is enough for 0.1, but a warm night mode arrives in 0.3, so the palette must also work on a dark background. |

**Not in 0.1:** the toy box, voice recording, goals, activity categories and filters, weather, the moments journal, parenting tips, recaps, holidays, the partner invite, feedback after an activity, and an English interface.

## 8. Practical constraints

- **Phone first.** Design at about 390 px wide, for mid-range Android phones and iPhones. Desktop isn't a target, though it must not break.
- **One-handed.** Main actions sit in the lower half of the screen, within thumb reach. Tap targets are at least 48 px.
- **Readable anywhere.** Text contrast meets WCAG AA at minimum, including in a sunny plaza. Colour is never the only way to show meaning. Story text is noticeably larger than body text, with generous line height and short lines.
- **Fonts.** Free, openly licensed, self-hostable (e.g. Google Fonts). Full Spanish support: *á é í ó ú ñ ü*, *¿* and *¡*, and the dash (—) used for dialogue in stories. At most two families.
- **Simple to build.** Built by hand in React with no component library. A small set of simple, reusable components beats many one-off layouts.

## 9. Branding for 0.1

The basic brand covers the **name and wordmark**, a **small colour palette** with a dark variant, a **type scale**, and a **short voice-and-tone guide** with sample lines in Rioplatense Spanish.

It does not yet cover illustration style, iconography, or the app icon. Those come in 0.2.

*Juguemos* is Spanish for "let's play" — an invitation rather than the name of a tool. Trademark and domain checks are still pending, so treat the wordmark as a working version.
