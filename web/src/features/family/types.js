/**
 * The shapes the family screens work with. The API module translates to and
 * from the API's own shapes, so screens never see them.
 */

/**
 * @typedef {{ id?: string, name: string, age: number | null, playing?: boolean, interests: string[] }} Kid
 * `id` is missing only for a kid the form hasn't saved yet. `playing` is whether
 * the kid plays with this parent (JUG-107); a kid without it plays. `interests`
 * are what this kid loves (JUG-144), as the family typed them.
 */
/**
 * @typedef {{ id?: string, name: string }} FamilyToy
 * A toy as the family profile knows it: the family's name for it, and its id
 * once saved, which the form sends back so the toy box keeps what it knows.
 */
/** @typedef {{ kids: Kid[], pet: string, toys: FamilyToy[] }} Family */
/**
 * @typedef {{ family: Family, flagged: string[], note: string | null }} ParseResult
 * `flagged` holds field keys ('kids.1', 'pet', 'interests', 'toys') the model was unsure about.
 */

export {}
