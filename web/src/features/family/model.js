/**
 * The family's logic, with no React: the family in words, and the family
 * form's state and how it maps to and from the family.
 */

/** @typedef {import('./types').Family} Family */
/** @typedef {import('./types').FamilyToy} FamilyToy */
/**
 * @typedef {{
 *   kids: { id?: string, name: string, age: string }[], pet: string, interests: string[],
 *   toys: FamilyToy[],
 * }} FormState
 * The family form (2h) as typed: ages stay text until saved.
 */

/** @param {number} age */
export function ageText(age) {
  return age === 1 ? '1 año' : `${age} años`
}

/** The Home header line: the kids only. The pet turns up in ideas and stories. @param {Family} family */
export function familyLine(family) {
  return family.kids.map((kid) => (kid.age == null ? kid.name : `${kid.name}, ${ageText(kid.age)}`)).join(' · ')
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
 * The family card's rows in a fixed order: each kid, the pet, what they love,
 * the toys. Toy names are joined exactly as typed; only the interests line is
 * capitalised, because it reads as a sentence.
 * @param {Family} family
 */
export function familyRows(family) {
  /** @type {{ field: string, label: string, value: string, aside?: string }[]} */
  const rows = family.kids.map((kid, index) =>
    kid.age == null
      ? { field: `kids.${index}`, label: 'Chicos', value: kid.name, aside: '· sin edad' }
      : { field: `kids.${index}`, label: 'Chicos', value: `${kid.name} · ${ageText(kid.age)}` },
  )
  if (family.pet) rows.push({ field: 'pet', label: 'Mascota', value: family.pet })
  if (family.interests.length > 0) {
    const interests = family.interests.join(' · ')
    rows.push({ field: 'interests', label: 'Le encanta', value: interests[0].toUpperCase() + interests.slice(1) })
  }
  if (family.toys.length > 0) rows.push({ field: 'toys', label: 'Juguetes', value: family.toys.map((toy) => toy.name).join(' · ') })
  return rows
}

/** @param {Family | null | undefined} family @returns {FormState} */
export function toForm(family) {
  const kids = family?.kids.map((kid) => ({ id: kid.id, name: kid.name, age: kid.age == null ? '' : String(kid.age) })) ?? []
  return {
    kids: kids.length > 0 ? kids : [{ name: '', age: '' }],
    pet: family?.pet ?? '',
    interests: family?.interests ?? [],
    toys: family?.toys.length ? family.toys : [{ name: '' }],
  }
}

/** Drops what was left empty; never touches how a name is spelled. @param {FormState} form @returns {Family} */
export function toFamily(form) {
  return {
    kids: form.kids
      .filter((kid) => kid.name.trim())
      .map((kid) => ({ id: kid.id, name: kid.name.trim(), age: kid.age ? Number(kid.age) : null })),
    pet: form.pet.trim(),
    interests: form.interests,
    // Each toy keeps its id, so the toy box keeps what it knows about it.
    toys: form.toys.map((toy) => ({ id: toy.id, name: toy.name.trim() })).filter((toy) => toy.name),
  }
}
