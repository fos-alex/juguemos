/**
 * Seeding goes through Better Auth and the services, the same way the app
 * does, instead of writing rows directly. Both seeds skip whatever already
 * exists, so they can run any number of times.
 */

/** @typedef {import('../auth/auth.js').Auth} Auth */
/** @typedef {import('../families/families.service.js').FamiliesService} FamiliesService */
/** @typedef {import('../activities/activities.service.js').ActivitiesService} ActivitiesService */
/** @typedef {import('../activities/activities.service.js').ActivityTemplateInput} ActivityTemplateInput */
/** @typedef {import('../stories/stories.service.js').StoriesService} StoriesService */
/** @typedef {import('../stories/stories.service.js').StoryTemplateInput} StoryTemplateInput */
/** @typedef {import('../../seeds/development.js').SeedAccount} SeedAccount */

/**
 * Adds the catalog's templates. The database is the catalog's home, so a
 * template already in it is never overwritten; this runs on every deploy.
 * @param {{
 *   activities: ActivitiesService,
 *   stories: StoriesService,
 *   catalog: { activityTemplates: ActivityTemplateInput[], storyTemplates: StoryTemplateInput[] },
 *   log?: (message: string) => void,
 * }} options
 */
export async function seedCatalog({ activities, stories, catalog, log = () => {} }) {
  let added = 0
  for (const template of catalog.activityTemplates) if ((await activities.addTemplate(template)).created) added++
  for (const template of catalog.storyTemplates) if ((await stories.addTemplate(template)).created) added++
  const total = catalog.activityTemplates.length + catalog.storyTemplates.length
  log(`Catalog: ${added} template(s) added, ${total - added} already there`)
}

/**
 * Creates the given accounts and their families.
 * @param {{ auth: Auth, families: FamiliesService, accounts: SeedAccount[], log?: (message: string) => void }} options
 */
export async function seedAccounts({ auth, families, accounts, log = () => {} }) {
  const { internalAdapter } = await auth.$context
  for (const { name, email, password, family } of accounts) {
    const existing = await internalAdapter.findUserByEmail(email.toLowerCase())
    const user = existing?.user ?? (await auth.api.signUpEmail({ body: { name, email, password } })).user
    log(`${email}: ${existing ? 'already there' : 'created'}`)

    if (family && !(await families.idOf(user.id))) {
      await families.saveProfile(user.id, family)
      log(`${email}: family created`)
    }
  }
}
