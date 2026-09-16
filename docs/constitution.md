# The Ludi Constitution

*Version 1.0 · September 2026*

## Why this exists

Ludi will face hundreds of decisions: what to build, what to cut, how the AI should talk, what to measure, and when to say no. This document is what we come back to when the answer isn't obvious. It applies to features, content, design, the AI's behavior, and how we define success.

It has four parts: our five commitments, the guardrails that protect them, how to decide when they conflict, and how to use this document day to day.

---

## Part I — Our five commitments

### 1. Families play and have fun together

Every feature exists to get a family playing together. The app is the invitation, not the destination. Fun comes first; learning, goals, and tips serve the fun, never the other way around. Learning should feel like play, not homework.

**In practice:** Suggestions are designed to be done together, with at least one adult and one child. Goals feel like games. We celebrate effort and shared moments more than achievement.

**This rules out:** Turning play into chores or scorecards, comparing children with other children, and activities where a parent watches from a phone.

**The test:** *Does this lead to a family laughing together more often?*

### 2. Screens off, play on

The best Ludi session is a short one: open the app, get a great idea, put the phone down. We minimize screen time for the kids and for the parents. The play itself happens in the real world.

**In practice:** Getting an idea takes seconds. Activity steps can be understood at a glance or listened to. Stories are made to be read aloud by a parent or listened to, not watched. Children are not the ones using the screen. Notifications are rare and genuinely useful ("Día del Padre is in 10 days"), never bait to reopen the app.

**This rules out:** Infinite feeds, autoplay, kid-facing screen games, streaks that make families feel guilty, and time spent in the app as a goal.

**How we measure success:** By play, not screen time. We count activities done together, moments captured, and goals progressing, not minutes in the app.

**The test:** *Does this get the phone down faster?*

### 3. We walk alongside every family

Ludi accompanies families through their journey: first words, the terrible twos, a new sibling, the first bike ride, starting school. It shows up at the right moments, remembers what happened, celebrates the wins, and supports the hard stages without judgment.

Parents are the experts on their own kids. The app suggests; it never prescribes.

**In practice:** Timely tips and goals follow the family's stage and situation. Recaps celebrate progress. The moments journal becomes the family's shared memory. The tone is always warm, and "not today" is always a valid answer.

**This rules out:** Judging, pressuring, or alarming parents ("your child is behind"), guilt as a motivator, and pretending to replace professionals. Health and development concerns always point to the pediatrician.

**The test:** *Would a caring, experienced friend say it this way?*

### 4. Just talk to it

Using Ludi should feel like talking to someone who knows your family. Voice is the primary interface. Screens are simple, calm, and obvious.

**In practice:** Anything important can be done with a voice note, in the way families actually speak (Rioplatense Spanish first). The app asks at most one question at a time, confirms instead of interrogating, and never asks for something it already knows. It works one-handed, with a toddler on your hip and background noise. Forms exist as a fallback, not as the main path.

**This rules out:** Long forms before any value, required fields the app could infer, jargon, and multi-step flows for everyday actions.

**The test:** *Could a parent do this by voice, with a toddler on their hip?*

### 5. Ludi grows with your family

The app and its content adapt to what the kids love, and they evolve as the family changes. Everything is personal: the kids' interests, their toys by the family's own names, each parent's style, and the family's stage of life.

**In practice:** The app speaks the family's language, from *el dinosaurio chiquito* to *el caballo grande*. Interests shape activities, stories, and goals. Suggestions adapt to each parent's energy. Goals advance as skills are mastered, content ages up with the kids, and the app lets go of what's no longer true, such as outgrown toys and finished stages.

**This rules out:** Generic one-size-fits-all lists, repeating the same ideas, suggesting toys the family no longer has, and assumptions based on stereotypes. A child's interests come from the child, not from their gender or age alone.

**The test:** *Could this suggestion have been made for any family? If yes, it isn't good enough.*

---

## Part II — Guardrails

The five commitments describe what we want to achieve. The guardrails describe what we will never compromise to get there. They are proposed here based on decisions already made in the product concept, to be confirmed.

**A. Children's safety comes first.** Activities come from a curated, safety-tagged catalog. The AI personalizes and adapts, but never invents unsafe activities. Safety facts come from real toy descriptions, never from assumptions or family names. When in doubt, we choose the safer option.

**B. Family data is sacred.** We collect only what we need, keep it private by default, and never sell it or use it to advertise to children. Voice recordings are discarded once transcribed. Parents can see, change, and delete what the app knows about their family.

**C. We earn trust honestly.** Tips are evidence-based and reviewed by professionals. The AI never diagnoses and never presents itself as a doctor or psychologist. We are clear about what the app is and isn't.

**D. No manipulation.** No dark patterns, fake urgency, guilt trips, or engagement tricks, for parents or children.

**E. Local, not translated.** We build for real families in a real place: their language, calendar, weather, homes, and culture. Every new market is adapted, not just translated.

---

## Part III — When principles conflict

Sometimes two good principles pull in different directions. When that happens, this is the order of priority:

1. **Children's safety and wellbeing**
2. **Family privacy and trust**
3. **Playing together** (Commitment 1)
4. **Screens off, play on** (Commitment 2)
5. **Everything else**, including convenience, personalization, and growth

Some examples of how this plays out:

| Tension | Resolution |
|---|---|
| Voice onboarding is easiest if we keep audio, but audio is sensitive. | Privacy wins: transcribe, confirm, and discard the audio. |
| A daily feed would increase engagement, but keeps parents on their phones. | Screens off wins: no feed. |
| Deeper personalization needs more data. | Privacy wins: ask only for what clearly improves play, and explain why. |
| An AI-invented activity fits the family perfectly, but isn't in the safety-reviewed catalog. | Safety wins: adapt a reviewed activity instead. |

---

## Part IV — Using this document

**Every feature spec names the commitments it serves.** If a feature doesn't clearly serve at least one, it needs a better reason to exist.

**Every feature passes the five tests before it ships:**

| Commitment | Question |
|---|---|
| Play together | Does this lead to a family laughing together more often? |
| Screens off | Does this get the phone down faster? |
| Walk alongside | Would a caring, experienced friend say it this way? |
| Just talk to it | Could a parent do this by voice, with a toddler on their hip? |
| Grows with you | Could this have been made for any family? If yes, it isn't good enough. |

A feature that fails a test gets redesigned or cut.

**This document changes deliberately.** Amendments are written down with a date and a reason, and the whole constitution is reviewed at least once a year or before any major new direction, such as expanding to a new market.
