/**
 * The demo accounts' seed. It goes through Better Auth and the services, the
 * same way the app does, instead of writing rows directly, and skips whatever
 * already exists, so it can run any number of times. The catalog's templates
 * are loaded by the catalog service.
 */

/** @typedef {import('../auth/auth.js').Auth} Auth */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../invitations/invitations.service.js').InvitationsService} InvitationsService */
/** @typedef {import('../families/families.service.js').Profile} Profile */
/** @typedef {import('../materials/materials.service.js').MaterialsService} MaterialsService */
/** @typedef {import('../toys/toys.service.js').ToysService} ToysService */
/** @typedef {import('../../seeds/development.js').SeedToyBox} SeedToyBox */
/** @typedef {import('../../seeds/development.js').SeedAccount} SeedAccount */

/**
 * Creates the given accounts and their families, with their toy boxes and
 * materials.
 * @param {{
 *   auth: Auth, invitations: InvitationsService, families: FamiliesService, toys: ToysService,
 *   materials: MaterialsService, accounts: SeedAccount[],
 *   log?: (message: string) => void,
 * }} options `invitations` is how a demo account gets in: an invitation is the
 *   only way to create one, so the seed opens its own instead of sending email
 */
export async function seedAccounts({ auth, invitations, families, toys, materials, accounts, log = () => {} }) {
  const { internalAdapter } = await auth.$context
  for (const { name, email, password, family, toyBox, materials: answers = {} } of accounts) {
    const existing = await internalAdapter.findUserByEmail(email.toLowerCase())
    const user = existing?.user ?? (await signUp(auth, invitations, { name, email, password })).user
    log(`${email}: ${existing ? 'already there' : 'created'}`)

    if (family && !(await families.idOf(user.id))) {
      const profile = await families.saveProfile(user.id, family)
      if (toyBox) await fillToyBox(toys, profile, toyBox)
      for (const [key, have] of Object.entries(answers)) await materials.mark(profile.id, key, have)
      log(`${email}: family created`)
    }
  }
}

/**
 * Creates one account through its own invitation, which is what the sign-up
 * hook asks for (JUG-34). Nothing is emailed.
 * @param {Auth} auth
 * @param {InvitationsService} invitations
 * @param {{ name: string, email: string, password: string }} account
 */
async function signUp(auth, invitations, { name, email, password }) {
  const { token } = await invitations.open(email)
  return auth.api.signUpEmail({ body: { name, email, password, invitation: token } })
}

/**
 * Adds what the toy box knows beyond the toys' names, finding toys and kids
 * in the saved profile by name.
 * @param {ToysService} toys
 * @param {Profile} profile
 * @param {SeedToyBox} toyBox
 */
async function fillToyBox(toys, profile, { details = {}, links = [] }) {
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
}
