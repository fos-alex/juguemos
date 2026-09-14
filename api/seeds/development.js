/**
 * Data for exploring the app locally, loaded with the catalog by
 * `npm run seed -w api`: an account for the brief's example family. Seeding
 * skips whatever already exists, so it can run any number of times. Never
 * load this anywhere real: the passwords are in the repo.
 */

/**
 * @typedef {object} SeedAccount
 * @property {string} name
 * @property {string} email
 * @property {string} password
 * @property {import('../src/families/families.service.js').ProfileInput} [family] saved with the account as its first member
 */

/** @type {SeedAccount[]} */
export const accounts = [
  {
    name: 'Prueba',
    email: 'prueba@juguemos.local',
    password: 'juguemos-local',
    family: {
      name: 'Familia de prueba',
      kids: [{ name: 'Milán', age: 2 }],
      pets: [{ name: 'Inca' }],
      interests: ['los dinosaurios', 'los caballos'],
      toys: [
        { name: 'el dinosaurio chiquito' },
        { name: 'el tren grandote' },
        { name: 'el osito marrón' },
        { name: 'el caballo percherón' },
      ],
    },
  },
]
