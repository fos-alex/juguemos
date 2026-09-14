/**
 * The first activity templates, loaded by the catalog seed on every
 * `docker compose up`. A template already in the database is never
 * overwritten: the database is the catalog's home, so change a loaded
 * template there.
 *
 * Slots ({kid}, {pet}, {toy}, {toy2}, {toy3}, {interest}) are filled with the
 * family's words. 0.1 knows toys only by name, so a template can't assume
 * what a toy is, and nothing may agree in gender with a slot ("cuando
 * aparezca", not "cuando lo encuentre"). Write "a {toy}" and "de {toy}"
 * freely: they contract to "al" and "del".
 *
 * Pending Alex's review and a voice pass (JUG-14).
 */

/** @type {import('../../src/activities/activities.service.js').ActivityTemplateInput[]} */
export const activityTemplates = [
  {
    slug: 'la-busqueda',
    title: 'La búsqueda de {toy}',
    minutes: 15,
    place: 'indoor',
    minAgeMonths: 12,
    maxAgeMonths: 47,
    energy: 'medium',
    categories: ['pretend'],
    smallSpace: true,
    materials: ['un almohadón'],
    skills: ['permanencia del objeto', 'lenguaje'],
    safety: ['El juguete tiene que ser más grande que la boca del chico.'],
    why: 'Usa {toy}, y a esta edad pocas cosas divierten más que esconder y encontrar. Ideal para una tarde adentro.',
    needs: '{toy} y un almohadón.',
    steps: [
      'Escondé {toy} debajo de un almohadón mientras {kid} mira.',
      'Preguntá: “¿Dónde está?” y busquen juntos.',
      'Cuando aparezca, ¡festejen con un grito de alegría!',
    ],
    easier: 'Dejá una parte asomando.',
    harder: 'Escondé {toy} en otro lugar del living.',
  },
  {
    slug: 'tren-de-almohadones',
    title: 'Un tren de almohadones',
    minutes: 20,
    place: 'indoor',
    minAgeMonths: 18,
    maxAgeMonths: 59,
    energy: 'medium',
    categories: ['pretend', 'move'],
    smallSpace: false,
    materials: ['almohadones'],
    skills: ['juego simbólico', 'turnos'],
    safety: [],
    why: '{toy} y {toy2} viajan de pasajeros, y {kid} maneja el tren.',
    needs: 'unos almohadones en fila, {toy} y {toy2}.',
    steps: [
      'Pongan los almohadones en fila: esa es la vía, y también el tren.',
      'Suban a {toy} y a {toy2} como pasajeros.',
      'En cada parada, preguntá: “¿Quién se baja acá?” y hagan juntos el ruido de ese pasajero.',
    ],
    easier: 'Un solo pasajero y un viaje corto.',
    harder: 'Inventen paradas con cosas que le encantan a {kid}, como {interest}.',
  },
  {
    slug: 'hora-de-comer',
    title: '{toy} tiene hambre',
    minutes: 10,
    place: 'indoor',
    minAgeMonths: 12,
    maxAgeMonths: 47,
    energy: 'low',
    categories: ['pretend', 'low_energy'],
    smallSpace: true,
    materials: ['un plato', 'una cuchara de plástico'],
    skills: ['juego simbólico', 'motricidad fina', 'cuidar a otro'],
    safety: [],
    why: 'Un juego tranquilo con {toy}, para bajar un cambio antes de la cena.',
    needs: '{toy}, un plato y una cuchara de plástico.',
    steps: [
      'Sentá a {toy} en un almohadón y contale a {kid} que tiene mucha hambre.',
      'Dale a {kid} el plato y la cuchara para que le dé de comer.',
      'Cuando termine, hagan “shh” y acuesten a {toy} a dormir.',
    ],
    easier: 'Dale vos la primera cucharada y que {kid} te copie.',
    harder: 'Que {kid} cuente qué le está dando de comer.',
  },
  {
    slug: 'galope-en-la-plaza',
    title: 'Galope en la plaza',
    minutes: 20,
    place: 'outdoor',
    minAgeMonths: 18,
    maxAgeMonths: 71,
    energy: 'high',
    categories: ['move', 'explore'],
    smallSpace: false,
    materials: [],
    skills: ['motricidad gruesa', 'seguir consignas'],
    safety: ['Galopen lejos de la calle y de las hamacas en movimiento.'],
    why: 'En la plaza hay lugar de sobra para galopar, y {pet} se suma a la carrera.',
    needs: 'nada más que la plaza.',
    steps: [
      'Galopen juntos hasta el primer árbol, haciendo “clop, clop”.',
      'En cada árbol, frenen y relinchen bien fuerte.',
      'Que {kid} elija el próximo árbol, y {pet} los sigue.',
    ],
    easier: 'Vayan al paso, de la mano.',
    harder: 'Que {kid} diga cuándo se galopa y cuándo se frena.',
  },
]
