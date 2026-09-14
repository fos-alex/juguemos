/**
 * Demo accounts for exploring the app locally, loaded with the catalog by
 * `npm run seed -w api`, each with a different family. The README lists their
 * logins. Seeding skips whatever already exists, so it can run any number of
 * times. Never load this anywhere real: the passwords are in the repo.
 */

/**
 * @typedef {object} SeedAccount
 * @property {string} name
 * @property {string} email
 * @property {string} password
 * @property {import('../src/families/families.service.js').ProfileInput} [family] saved with the account as its first member
 */

const PASSWORD = 'juguemos-local'

/** @type {SeedAccount[]} */
export const accounts = [
  // The brief's example family: a toddler and a pet.
  {
    name: 'Prueba',
    email: 'prueba@juguemos.local',
    password: PASSWORD,
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
  // The sparsest family: a baby, no pet, and two toys.
  {
    name: 'Bebé',
    email: 'bebe@juguemos.local',
    password: PASSWORD,
    family: {
      name: 'Familia de Olivia',
      kids: [{ name: 'Olivia', age: 0 }],
      pets: [],
      interests: ['las canciones', 'el agua'],
      toys: [{ name: 'el sonajero' }, { name: 'la mantita' }],
    },
  },
  // Two kids far apart in age, so a juego has to suit both.
  {
    name: 'Hermanos',
    email: 'hermanos@juguemos.local',
    password: PASSWORD,
    family: {
      name: 'Familia de Tomás y Emma',
      kids: [
        { name: 'Tomás', age: 8 },
        { name: 'Emma', age: 4 },
      ],
      pets: [{ name: 'Michi' }],
      interests: ['el fútbol', 'los piratas', 'dibujar'],
      toys: [
        { name: 'la pelota de fútbol' },
        { name: 'los bloques de madera' },
        { name: 'la bici roja' },
        { name: 'el barco pirata' },
      ],
    },
  },
]
