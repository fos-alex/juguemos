/** @typedef {import('../auth/auth.js').Auth} Auth */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../../seeds/development.js').SeedAccount} SeedAccount */

/**
 * Creates the given accounts and their families, skipping whatever already
 * exists, so it can run any number of times. It goes through Better Auth and
 * the services, the same way the app does, instead of writing rows directly.
 * @param {{ auth: Auth, families: FamiliesService, accounts: SeedAccount[], log?: (message: string) => void }} options
 */
export async function seed({ auth, families, accounts, log = () => {} }) {
  const { internalAdapter } = await auth.$context
  for (const { name, email, password, family } of accounts) {
    const existing = await internalAdapter.findUserByEmail(email.toLowerCase())
    const user = existing?.user ?? (await auth.api.signUpEmail({ body: { name, email, password } })).user
    log(`${email}: ${existing ? 'already there' : 'created'}`)

    if (family && !(await families.familyOf(user.id))) {
      await families.create(user.id, family)
      log(`${email}: family created`)
    }
  }
}
