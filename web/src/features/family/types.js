/**
 * The shapes the family screens work with. The API module translates to and
 * from the API's own shapes, so screens never see them.
 */

/**
 * @typedef {{ id?: string, name: string, ageMonths: number | null, playing?: boolean, interests: string[] }} Kid
 * `ageMonths` is the kid's age today, in months (JUG-145). `id` is missing only
 * for a kid the form hasn't saved yet. `playing` is whether the kid plays with
 * this parent (JUG-107); a kid without it plays. `interests` are what this kid
 * loves (JUG-144), as the family typed them.
 */
/**
 * @typedef {{ id?: string, name: string }} FamilyToy
 * A toy as the family profile knows it: the family's name for it, and its id
 * once saved, which the form sends back so the toy box keeps what it knows.
 */
/**
 * @typedef {{ id?: string, name: string, calledAs: string }} Parent
 * A parent's name, and what the kids call them (JUG-21), both as typed.
 */
/** @typedef {'perro' | 'gato' | 'pajaro' | 'pez' | 'conejo' | 'tortuga' | 'otro'} PetKind What animal the pet is (JUG-21). */
/** @typedef {'departamento' | 'casa' | 'casa_con_parque'} Home The kind of home (JUG-21). */
/**
 * @typedef {{ name: string, located: boolean }} Location
 * Where the family lives (JUG-25), as typed, and whether Ludi could find it.
 * A city or a zone is enough: it is only read to know what the weather is
 * like there. The coordinates stay on the server.
 */
/**
 * @typedef {{
 *   parents: Parent[], kids: Kid[], pet: string, petKind: PetKind, home: Home | null,
 *   location: Location | null, toys: FamilyToy[],
 * }} Family
 * `petKind` is a dog until the family says otherwise, with or without a pet.
 * `location` is null until the family says where they live.
 */
/**
 * @typedef {Omit<Family, 'toys' | 'location'> & { location?: string | null, toys?: FamilyToy[] }}
 *   FamilyInput
 * The family as a form saves it. Where they live goes back as the words the
 * parent typed, and the API answers with whether it found them (JUG-25). A
 * form that doesn't show a field leaves it out and the API keeps what it has:
 * the toys, which live in the toy box (JUG-21), and the location, which
 * onboarding's card never asks for.
 */
/**
 * @typedef {{ family: Family, flagged: string[], note: string | null }} ParseResult
 * `flagged` holds field keys ('parents', 'kids.1', 'pet', 'interests', 'toys') the model was unsure about.
 */

export {}
