/**
 * Data for exploring the app locally, loaded by `npm run seed -w api`.
 * Seeding skips whatever already exists, so it can run any number of times.
 * Never load this anywhere real: the passwords are in the repo.
 */

/**
 * @typedef {object} SeedAccount
 * @property {string} name
 * @property {string} email
 * @property {string} password
 * @property {{ name: string | null }} [family] created with the account as its first member
 */

/** @type {SeedAccount[]} */
export const accounts = [
  {
    name: 'Prueba',
    email: 'prueba@juguemos.local',
    password: 'juguemos-local',
    family: { name: 'Familia de prueba' },
  },
]
