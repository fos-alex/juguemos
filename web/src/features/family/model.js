/**
 * The family's logic, with no React: the family in words, and the family
 * form's state and how it maps to and from the family.
 */

/** @typedef {import('./types').Family} Family */
/** @typedef {import('./types').FamilyToy} FamilyToy */
/** @typedef {import('./types').Kid} Kid */
/**
 * @typedef {{
 *   kids: { id?: string, name: string, years: string, months: string, interests: string[] }[],
 *   pet: string, toys: FamilyToy[],
 * }} FormState
 * The family form (2h) as typed: the years and the months of each age stay
 * text until saved (JUG-145).
 */
/**
 * @typedef {{ field: string, label: string, value: string, aside?: string, flag?: string }} FamilyRow
 * `field` is where the form opens for this row; `flag` is the key the review
 * card flags it by, when that isn't `field` (every interests row is 'interests').
 */

/**
 * An age in months in words: `8 meses`, `2 años`, `1 año y 10 meses`.
 * @param {number} ageMonths
 * @param {{ alwaysMonths?: boolean }} [options] `alwaysMonths` says `y 0 meses`
 *   too, so a parent who gave only the years sees what the app took and fixes it
 */
export function ageText(ageMonths, { alwaysMonths = false } = {}) {
  const years = Math.floor(ageMonths / 12)
  const months = ageMonths % 12
  const monthsText = months === 1 ? '1 mes' : `${months} meses`
  if (years === 0) return monthsText
  const yearsText = years === 1 ? '1 año' : `${years} años`
  return months === 0 && !alwaysMonths ? yearsText : `${yearsText} y ${monthsText}`
}

/** The Home header line: the kids only. The pet turns up in ideas and stories. @param {Family} family */
export function familyLine(family) {
  return family.kids.map((kid) => (kid.ageMonths == null ? kid.name : `${kid.name}, ${ageText(kid.ageMonths)}`)).join(' · ')
}

const SPANISH_LIST = new Intl.ListFormat('es', { type: 'conjunction' })

/**
 * Who's playing on this device, by name, joined in Spanish: "Milán",
 * "Milán y Sofi", "Tomás, Emma y Milán", with "e" before an "i" sound
 * ("Milán e Inés"). Names stay exactly as written; empty with no kids.
 * @param {Family | null | undefined} family
 */
export function playingNames(family) {
  const kids = family?.kids ?? []
  return SPANISH_LIST.format(kids.filter((kid) => kid.playing !== false).map((kid) => kid.name))
}

/**
 * What the kids playing on this device love (JUG-144), each once, in the
 * order the kids and their interests come. Two kids who both love "los
 * dinosaurios" give it once, as the first of them spelled it.
 * @param {Family | null | undefined} family
 */
export function playingInterests(family) {
  /** @type {Map<string, string>} */
  const seen = new Map()
  for (const kid of family?.kids ?? []) {
    if (kid.playing === false) continue
    for (const interest of kid.interests ?? []) {
      const key = interest.trim().toLocaleLowerCase('es')
      if (!seen.has(key)) seen.set(key, interest)
    }
  }
  return [...seen.values()]
}

/** The same interests, in any order and case. @param {string[]} a @param {string[]} b */
function sameInterests(a, b) {
  const key = (/** @type {string[]} */ list) => list.map((item) => item.trim().toLocaleLowerCase('es')).sort().join('\n')
  return key(a) === key(b)
}

/** The interests as one line that reads as a sentence: joined, with a capital. @param {string[]} interests */
function interestsLine(interests) {
  const line = interests.join(' · ')
  return line[0].toUpperCase() + line.slice(1)
}

/**
 * The family card's rows in a fixed order: each kid, the pet, what they love,
 * the toys. Names are joined exactly as typed; only the interests lines are
 * capitalised, because they read as sentences.
 *
 * What they love goes kid by kid (JUG-144). When every kid loves the same
 * things, as when the parent's text didn't say whose each one was, it is one
 * row for all of them.
 * @param {Family} family
 * @returns {FamilyRow[]}
 */
export function familyRows(family) {
  /** @type {FamilyRow[]} */
  const rows = family.kids.map((kid, index) =>
    kid.ageMonths == null
      ? { field: `kids.${index}`, label: 'Chicos', value: kid.name, aside: '· sin edad' }
      : { field: `kids.${index}`, label: 'Chicos', value: `${kid.name} · ${ageText(kid.ageMonths, { alwaysMonths: true })}` },
  )
  if (family.pet) rows.push({ field: 'pet', label: 'Mascota', value: family.pet })

  const [first, ...others] = family.kids
  const shared = first && first.interests.length > 0 && others.every((kid) => sameInterests(kid.interests, first.interests))
  if (shared) {
    rows.push({ field: 'interests.0', flag: 'interests', label: others.length > 0 ? 'Les encanta' : 'Le encanta', value: interestsLine(first.interests) })
  } else {
    family.kids.forEach((kid, index) => {
      if (kid.interests.length === 0) return
      rows.push({ field: `interests.${index}`, flag: 'interests', label: `A ${kid.name} le encanta`, value: interestsLine(kid.interests) })
    })
  }

  if (family.toys.length > 0) rows.push({ field: 'toys', label: 'Juguetes', value: family.toys.map((toy) => toy.name).join(' · ') })
  return rows
}

/** @param {Family | null | undefined} family @returns {FormState} */
export function toForm(family) {
  const kids =
    family?.kids.map((kid) => ({
      id: kid.id,
      name: kid.name,
      years: kid.ageMonths == null ? '' : String(Math.floor(kid.ageMonths / 12)),
      months: kid.ageMonths == null ? '' : String(kid.ageMonths % 12),
      interests: [...(kid.interests ?? [])],
    })) ?? []
  return {
    kids: kids.length > 0 ? kids : [{ name: '', years: '', months: '', interests: [] }],
    pet: family?.pet ?? '',
    toys: family?.toys.length ? family.toys : [{ name: '' }],
  }
}

/**
 * A name as it sounds, only to tell whether the parent is talking about
 * someone or something the form already has: no case, accents, or extra
 * spaces. What is saved is always the name as typed.
 * @param {string} name
 */
const heard = (name) =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/** A row the parent hasn't written anything in, which a voice note fills instead of pushing down. */
const blankKid = (/** @type {FormState['kids'][number]} */ kid) =>
  !kid.name.trim() && !kid.years && !kid.months && kid.interests.length === 0

/**
 * What the parent just said about the family, folded into the form they have
 * open (JUG-103). A note on the edit form says what changed, so nothing is
 * taken away by being left out of it: a kid already on the form keeps their
 * place, their id, and the spelling the family gave them, and takes the age
 * and whatever new they love; a name the form doesn't have yet is added at
 * the end, and so are toys it doesn't have. The pet changes only when the
 * note names one.
 *
 * Names are matched as they sound, so "milan" is the Milán already there.
 * Nothing is saved here either: the form is what the parent checks, and
 * "Guardar" is what saves it.
 * @param {FormState} form
 * @param {Family} said what the API read in the parent's words
 * @returns {FormState}
 */
export function withChanges(form, said) {
  const kids = form.kids.filter((kid) => !blankKid(kid))
  const toys = form.toys.filter((toy) => toy.name.trim())

  for (const kid of said.kids) {
    const years = kid.ageMonths == null ? null : String(Math.floor(kid.ageMonths / 12))
    const months = kid.ageMonths == null ? null : String(kid.ageMonths % 12)
    const at = kids.findIndex((each) => heard(each.name) === heard(kid.name))
    if (at < 0) {
      kids.push({ name: kid.name, years: years ?? '', months: months ?? '', interests: [...kid.interests] })
      continue
    }
    const known = kids[at]
    kids[at] = {
      ...known,
      years: years ?? known.years,
      months: months ?? known.months,
      interests: [
        ...known.interests,
        ...kid.interests.filter((one) => !known.interests.some((each) => heard(each) === heard(one))),
      ],
    }
  }

  for (const toy of said.toys) {
    if (!toys.some((each) => heard(each.name) === heard(toy.name))) toys.push({ name: toy.name })
  }

  return {
    kids: kids.length > 0 ? kids : toForm(null).kids,
    pet: said.pet || form.pet,
    toys: toys.length > 0 ? toys : toForm(null).toys,
  }
}

/**
 * Drops what was left empty; never touches how a name is spelled. An age with
 * only the years is that many years and no months; one left blank is unknown.
 * @param {FormState} form
 * @returns {Family}
 */
export function toFamily(form) {
  return {
    kids: form.kids
      .filter((kid) => kid.name.trim())
      .map((kid) => ({
        id: kid.id,
        name: kid.name.trim(),
        ageMonths: kid.years || kid.months ? Number(kid.years || 0) * 12 + Number(kid.months || 0) : null,
        interests: kid.interests.map((interest) => interest.trim()).filter(Boolean),
      })),
    pet: form.pet.trim(),
    // Each toy keeps its id, so the toy box keeps what it knows about it.
    toys: form.toys.map((toy) => ({ id: toy.id, name: toy.name.trim() })).filter((toy) => toy.name),
  }
}
