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
 * @typedef {{ parents: Parent[], kids: Kid[], pet: string, petKind: PetKind, home: Home | null, toys: FamilyToy[] }} Family
 * `petKind` is a dog until the family says otherwise, with or without a pet.
 */
/**
 * @typedef {Omit<Family, 'toys'> & { toys?: FamilyToy[] }} FamilyInput
 * The family as the form saves it. Mi familia's form has no toys, which live
 * in the toy box (JUG-21), so it leaves them out and the API keeps them.
 */
/**
 * @typedef {{ family: Family, flagged: string[], note: string | null }} ParseResult
 * `flagged` holds field keys ('parents', 'kids.1', 'pet', 'interests', 'toys') the model was unsure about.
 */

export {}
