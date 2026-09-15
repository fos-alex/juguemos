/**
 * The demo accounts' seed. It goes through Better Auth and the services, the
 * same way the app does, instead of writing rows directly, and skips whatever
 * already exists, so it can run any number of times. The catalog's templates
 * are loaded by the catalog service.
 */

/** @typedef {import('../auth/auth.js').Auth} Auth */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../families/families.service.js').Profile} Profile */
/** @typedef {import('../toys/toys.service.js').ToysService} ToysService */
/** @typedef {import('../../seeds/development.js').SeedToyBox} SeedToyBox */
/** @typedef {import('../../seeds/development.js').SeedAccount} SeedAccount */

/**
 * Creates the given accounts and their families, with their toy boxes.
 * @param {{
 *   auth: Auth, families: FamiliesService, toys: ToysService, accounts: SeedAccount[], log?: (message: string) => void,
 * }} options
 */
export async function seedAccounts({ auth, families, toys, accounts, log = () => {} }) {
  const { internalAdapter } = await auth.$context
  for (const { name, email, password, family, toyBox } of accounts) {
    const existing = await internalAdapter.findUserByEmail(email.toLowerCase())
    const user = existing?.user ?? (await auth.api.signUpEmail({ body: { name, email, password } })).user
    log(`${email}: ${existing ? 'already there' : 'created'}`)

    if (family && !(await families.idOf(user.id))) {
      const profile = await families.saveProfile(user.id, family)
      if (toyBox) await fillToyBox(toys, profile, toyBox)
      log(`${email}: family created`)
    }
  }
}

/**
 * Adds what the toy box knows beyond the toys' names, finding toys and kids
 * in the saved profile by name.
 * @param {ToysService} toys
 * @param {Profile} profile
 * @param {SeedToyBox} toyBox
 */
async function fillToyBox(toys, profile, { details = {}, links = [], materials = [] }) {
  /** @param {{ id: string, name: string }[]} rows @param {string} name */
  const idOf = (rows, name) => {
    const row = rows.find((candidate) => candidate.name === name)
    if (!row) throw new Error(`Seed toy box: no "${name}" in the family`)
    return row.id
  }
  for (const [name, { kid, ...input }] of Object.entries(details)) {
    await toys.edit(profile.id, idOf(profile.toys, name), kid ? { ...input, kidId: idOf(profile.kids, kid) } : input)
  }
  for (const [first, ...rest] of links) {
    await toys.link(
      profile.id,
      idOf(profile.toys, first),
      rest.map((name) => idOf(profile.toys, name)),
    )
  }
  if (materials.length > 0) await toys.chooseMaterials(profile.id, materials)
}
