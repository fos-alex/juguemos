# Juguemos — Releases

**Version:** 0.12 draft · September 2026 · Owner: Alex Otero

*A living document. It plans the path from a first concept test to the public alpha. Each release answers one question and has a clear bar for moving on.*

---

> **Release gate: guardrails first.** Nobody outside our family uses Juguemos until the guardrails are complete. Getting the agent's guardrails right needs a lot of trial and error, and it won't be rushed. Until then, Juguemos is played and tested only by Alex's family.

## 1. How releases work

**Start simple, then build on a solid loop.** Each release strengthens the core loop (know the family, suggest, play, learn) before adding anything around it. Features that don't connect well to the loop wait until they do.

**Each release answers one question.** If the answer is no, we fix that before adding more.

**Content is tagged with the full taxonomy from the start.** Age, duration, energy, category, indoor or outdoor, small space, materials, skills, and safety are recorded on every activity even before the interface uses them. Re-tagging a catalog later is expensive.

**Who uses it:**

| Stage | Who |
|---|---|
| **0.1 to 0.4** | Alex's family only, playtesting a lot |
| **0.5 to 0.9** | Close friends, by invitation only, once the guardrails are complete |
| **1.0** | Public alpha |

## 2. Overview

| Release | Theme | The question it answers |
|---|---|---|
| **0.1** | *¿Me gusta?* | Do we reach for Juguemos on our own, and do its ideas and stories feel made for us? |
| **0.2** | *Nos conoce* | Does knowing the family deeply make suggestions clearly better? |
| **0.3** | *El momento justo* | Does knowing the weather and the time of day bring the right idea at the right moment? |
| **0.4** | *Jugar para crecer* | Do goals make play feel like progress without feeling like homework? |
| **0.5** | *Con cuidado* | Is Juguemos safe enough to put in the hands of other families? |
| **0.6** | *Nuestros momentos* | Does the journal become the family's shared memory? |
| **0.7** | *La fábrica* | Can the catalog grow fast without losing quality or safety? |
| **0.8** | *Hablale* | Can a parent do everything important by voice? |
| **0.9** | *Los detalles* | Are we ready to open the doors? |
| **1.0** | *Juguemos* | Public alpha |

## 3. Releases

### 0.1 — *¿Me gusta?*

The goal is to find out quickly whether the concept is worth pursuing. Only Alex's family uses it, so it can be rough, but it has to be personal. The concept is "the play coach that knows your family by heart," and a generic idea generator would not test it.

- **Basic branding.** Name, wordmark, a small color palette and type scale, and a short voice-and-tone guide with sample lines in Rioplatense Spanish.
- **Family onboarding.** Conversational, by text, for one parent. The parent writes about the family in their own words, and the AI extracts the kids (name and age), the pet, interests, and toys by their family names. It shows a *"¿Está bien así?"* card to confirm, and a plain form covers corrections.
- **Suggest an activity.** The one-tap *"¡Juguemos!"* button. It picks one activity from the catalog that fits the kids' ages and fills it in with their names, interests, and the pet. *"Otro juego"* shows a different one. *"Empezar"* starts a silent timer, and while it runs Home shows the juego and the time left, with a way to end it.
- **Tell a story.** *"Hora del cuento"* offers three plot options starring the kids, the pet, and their toys by family name. The parent picks one and reads it on a screen with large text that stays awake. Until the LLM provider is chosen, stories come from templates filled in by code.
- **Who's playing.** Home shows the kids, all marked. The parent unmarks whoever isn't playing, and games and stories are made for the kids who are. Juguemos remembers the choice for next time.
- **Night mode.** Dark from 19:00 to 07:00 local time, switching on its own, and one tap to change between light and dark, above all on the reading screen. It uses the handoff's dark palette; warming it is still open.
- **First iteration of content.** 30–40 activity templates for ages 1–3, drafted with AI, reviewed by Alex, loaded into the database by the catalog seeds, and tagged with the full taxonomy. A short guideline for story length and tone.
- **Admin for the catalog.** A page where Alex adds, edits, switches off, and deletes activity templates while playtesting. It has no login yet, so it's off unless turned on, and never on where anyone outside the family can reach it.
- **Spanish only.** Rioplatense Spanish with *vos*, throughout.

**Done when** we have used it for a couple of weeks and can answer: Did we reach for it on our own? Did the ideas and stories feel made for us? Which ones did we actually play or read? What annoyed us?

**Decisions before building:** how the parent signs in (Better Auth, with email and password) and the activity template format (rows in the database, loaded by the catalog seeds) are decided. The LLM provider is deferred: 0.1 starts with templates filled in by code, and understanding the family's own words and bespoke stories wait for it.

### 0.2 — *Nos conoce*

- **More detailed brand identity.** Illustration style, iconography, and app icon.
- **Toy box.** Each toy's family name and its description for the AI kept separate, with aliases and linked pairs (*el caballo grande* and *el caballo chico*). A toy with only a name keeps filling the slots any toy can, as in 0.1; only activities that need to know what a toy is require its description.
- **Voice notes.** Record in the browser, transcribe, and discard the audio. Used for onboarding, profile updates (*"Milán ya dejó el chupete"*), and adding toys. Live conversation with the agent comes in 0.8.
- **Basic guardrails.** A first version to start the trial and error.
- **Detailed family profiles.** Richer details on each child, the pet, and the home.
- **Recommendations based on the profile.** Activities chosen by age, interests, toys at home, and recent history, so ideas don't repeat.
- **Feedback tap.** One tap after an activity or story, such as *"¡Lo hicimos!"* or *"No era para nosotros,"* which also feeds the recommendations.
- **More activities and content.**

### 0.3 — *El momento justo*

- **Weather.** Current conditions and the forecast for the family's neighborhood, with rain and heat-wave alternatives.
- **Time-aware activities and stories.** Based on the time of day and each child's routine, so an energetic game doesn't show up just before bed and bedtime stories are calm.
- **Enhanced stories with notes to parents.** Voices, sounds, gestures, props from the toy box, and pauses for the child to join in, matched to each child's age.
- **Story series.** Stories that share a setting and characters are grouped into a series. From a series, the parent asks for the next chapter, and Juguemos writes it as a continuation of what happened before.
- **Story library and rereads.** Save a story and reread it with one tap. A series keeps its chapters together, in order.
- **Sign in with Google.** Parents can sign in with their Google account, which shares only their name and email. Until the guardrails are complete, only the family's own accounts get in.
- **An animation while a story is written** (nice to have). A story from the LLM can take up to two minutes before there's anything to read, so an animation shows that it's being written, and it varies with the kids' ages. It gives way to the text as soon as the first words arrive.
- **An animation while a voice note is read** (nice to have). The same for onboarding, while a voice note becomes words and while Juguemos reads the family from them.

### 0.4 — *Jugar para crecer*

- **Goal setting.** Parents write their own goals.
- **Smart goal proposals.** Based on age, interests, and family situation.
- **Activity categories.** Move, Create, Pretend, Explore, Learn, Low-energy, Helpers, and Out & About.
- **Filtering and choosing a type of activity.** For when the parent wants something specific.
- **A colour for each kid.** Each kid gets a colour that goes with their name on Home, on the games and stories they took part in, and on their goals. When one kid is playing, Home takes a light accent in that kid's colour. It's a marker, not a theme.
- **Discovery games.** Short games the parent and kids play together with the phone, built from a few reusable game types. The first is *¿Qué suena?*: the phone plays a sound, such as an animal, an instrument, or a vehicle, and the kids guess what it is from options the parent reads out, or by pointing to the real toy. Difficulty follows the ages of the kids who are playing. The parent holds the phone, and nothing on the screen is aimed at the kids.
- **More activities and content.**

### 0.5 — *Con cuidado*

- **Guardrails, complete.** The full set, refined through the trial and error that started in 0.2. **This unlocks the first close friends.**
- **Invitation-only sign-ups.** Nobody can create an account without an invitation.
- **Life transition goals.** Starting *jardín*, leaving diapers, giving up the pacifier, and preparing for a new sibling.

### 0.6 — *Nuestros momentos*

- **Moments journal.** Photo, short note, and who took part, with the activity and date attached automatically.
- **Goal check-ins.** A quick rating after a goal activity, such as *"¡Lo logró!"*, *"Va en camino,"* or *"Hoy no,"* captured together with the moment.
- **Parent invite.** The second adult gets their own login, so both parents share the journal.

### 0.7 — *La fábrica*

- **Full content backend with expert review.** Every activity and goal moves through draft, review, and published states, with a record of who reviewed it.
- **Content creation agents with a defined workflow.** From research inspiration to tagged drafts ready for review.
- **CMS-like content experience.** Reviewers work in a browser, not in repo files.
- **Multi-language.** Still undecided. This is where we decide whether and when.

### 0.8 — *Hablale*

- **Live voice conversation with the agent.** Ask for ideas, games, and rhymes out loud.

### 0.9 — *Los detalles*

- **Feriados and special days calendar.** The Argentine calendar and family dates, with themed activities in the days leading up to each one.
- **Each parent's play style.** Energy level, favorite kinds of play, and what they'd rather avoid.
- **Monthly recaps.** What was practiced and achieved.
- **Printable activities.** Pages to print, cut, fold, and colour: letters, numbers, and colours, animals to sort into groups, simple board and card games, colouring pages, and things to build for the family's toys, like a stable for the horse or a rocket to fold for the astronaut. Each page is made for the family, with the kids' names and the animals they love, and piece size follows the kids' ages.
- **Legal work.** Review under Ley 25.326, registration of the database with the AAIP if required, terms of use and privacy policy, and INPI trademark and domain confirmed.

### 1.0 — *Juguemos*

Public alpha.

### After 1.0

- **Parenting tips.** They need expert review and a lot of care. Parents are picky about being told what to do, and poor advice would cost their trust.

## 4. Parked

Ideas from the product concept that are not scheduled yet. They come back when they connect well to the loop.

- Overriding a story's mood (*"uno con pilas"*, *"uno bien tranqui"*).
- Refining suggestions after three skips.
- Nearby places from a maps provider.
- Surprise mode for gifts between parents.
- An English interface.

## 5. Decisions

Changes from the first draft of this plan, and suggestions that were considered and declined.

| Decision | Why |
|---|---|
| 0.1 activities and stories use a simple profile (names, ages, interests, pet) | Without it, 0.1 tests a generic idea generator, not Juguemos. |
| Toys captured by family name in 0.1 onboarding and used in stories; the toy box stays in 0.2 | Hearing *el dinosaurio chiquito* in a story is the cheapest "it knows us" moment. |
| Voice notes in 0.2, live voice conversation in 0.8 | Recording and transcribing a note is standard work. A live voice agent is the hard part. |
| No guardrails in 0.1; basic in 0.2, complete in 0.5 | 0.1 is used only by Alex's family. Guardrails need a lot of trial and error with the agent and won't be rushed. |
| No outside testers until guardrails are complete | Other families only use Juguemos once it is safe to. |
| Close friends join by invitation only; no public alpha until 1.0 | Alex playtests a lot first, then close friends for a while. |
| Goal setting moved from 0.3 to 0.4 | Keeps 0.3 about context and 0.4 about goals. |
| Feedback tap in 0.2 | It feeds the profile-based recommendations that arrive in the same release. |
| Goal check-ins in 0.6, with the journal | Capturing the moment and how it went is one step of the loop. |
| Parent invite in 0.6 | The first iterations are single-parent. A shared journal is the first strong reason for a second login. |
| Holidays kept late (0.9) | A nice-to-have, even if cheap to build. |
| Play styles and monthly recaps at the end (0.9) | They don't form part of the main loop. |
| Parenting tips after 1.0 | Advice has to be excellent or not given at all. |
| Mood toggle and other concept features parked | Start simple, and add features once they connect well. |
| Story series and the story library in 0.3 | A series needs its chapters saved, and toddlers love hearing the same story again. 0.3 already improves stories, so they arrive together. |
| Sound guessing games folded into discovery games in 0.4 | They were planned for 0.8 as a nice-to-have, but they're the same game as *¿Qué suena?*, the first discovery game. |
| Sign in with Google in 0.3, limited to the family's accounts | Nobody outside the family gets in until the guardrails are complete, whatever the sign-in method. |
| Night mode in 0.1, pulled forward from the handoff's 0.3 target | Stories are read at bedtime, and the dark palette was already wired. Alex asked for it in 0.1. |
| The activity catalog lives in the database, loaded by seeds | Alex's call while building 0.1. The database is the catalog's home, not files in the repo. |
| 0.1 starts without an LLM | The provider decision is deferred. Until then, activities and stories come from templates filled in by code. |
| Who's playing in 0.1 | Games and stories should fit the kids who are actually playing. Remembering the choice keeps it to one tap, or none. |
| A colour for each kid in 0.4, as a marker rather than a theme | 0.4 brings each kid's goals, and the story library from 0.3 can show whose stories they were. The colour matters once there's more than one kid to tell apart. |
| A minimal admin for activity templates in 0.1, ahead of 0.7's content backend | Alex asked for it, to shape the playtest's catalog from the browser. 0.7 still brings review states, versions, and reviewer accounts. |
| Discovery games in 0.4, with the answers in the room and no pictures on the screen | They teach animal names, sounds, and words, which fits 0.4's goals, and parents can pick them through its categories and filter. The constitution rules out kid-facing screen games, so the parent holds the phone and the kids answer out loud or with real things. |
| Waiting animations in 0.3, as nice-to-haves | Stories from the LLM can take up to two minutes, and 0.3 already improves stories. The animations need the illustration style from 0.2, and the onboarding one should be in place before friends join in 0.5. |
| Printable activities in 0.9 | They need the illustration style from 0.2, what the toy box knows each toy is, and 0.7's content workflow to produce pages at volume. They also pair with the feriados calendar in 0.9, with pages for the special days. |

## 6. Open questions

- **Styling by age.** Should Home's look, or the animation while a story is written, change with the age of the kid who's playing? The recommendation is no: age already shapes the games and stories, and styling by age would make Juguemos look like a kids' app, which the design handoff rules out. The story animation could vary with the story being written instead.
- **Characters in waiting animations.** The design handoff rules out a mascot, character, or cartoon in loading states. A cute character needs the handoff amended; a calm animation in the Plaza style doesn't.

- **The LLM in 0.1.** Does the playtest wait for the LLM provider, or start with template stories and the family form, adding conversational onboarding and bespoke stories when they're ready?
- **Friends and guardrails.** The first target for friends was 0.3 or 0.4, but guardrails complete in 0.5. Should guardrails move earlier so friends can join sooner, or do friends wait for 0.5?
- **Timing.** How long should each release take?
- **Catalog size.** Are 30–40 activities enough for a couple of weeks of 0.1 without repeats feeling obvious?
- **Multi-language.** Decided in 0.7.

## 7. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 draft | September 2026 | First draft, based on Alex's initial release plan. |
| 0.2 draft | September 2026 | Simplified to a solid core loop first. Guardrails gate outside testers, friends join by invitation after 0.5, tips move after 1.0, and several concept features are parked. |
| 0.3 draft | September 2026 | Added Story series to 0.3, and moved the story library out of Parked into 0.3 with it. |
| 0.4 draft | September 2026 | Added sound guessing games to 0.8 as a nice-to-have. |
| 0.5 draft | September 2026 | Added Sign in with Google to 0.3. |
| 0.6 draft | September 2026 | Added night mode to 0.1. |
| 0.7 draft | September 2026 | Synced 0.1 with decisions made while building: the catalog lives in the database, sign-in uses Better Auth, the LLM is deferred, and Home says *¡Juguemos!* and *Otro juego*. |
| 0.8 draft | September 2026 | Added who's playing to 0.1, and a colour for each kid to 0.4. |
| 0.9 draft | September 2026 | Added an admin for the activity templates to 0.1. |
| 0.10 draft | September 2026 | Added discovery games to 0.4, and folded the sound guessing games from 0.8 into them. |
| 0.11 draft | September 2026 | Added waiting animations for stories and voice notes to 0.3, as nice-to-haves. |
| 0.12 draft | September 2026 | Added printable activities to 0.9. |
