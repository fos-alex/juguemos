/**
 * The first story templates, loaded by the catalog seed on every
 * `docker compose up`; a template already in the database is never
 * overwritten. Bespoke LLM stories replace them later (JUG-71).
 *
 * The same rules as the activity templates apply: toys are known only by
 * name, so they do what any toy can (hide, travel, fall asleep); nothing
 * agrees in gender with a slot ("se durmió", never "se quedó dormido"); and
 * nobody is addressed by a toy's name, since "Buenas noches, el osito" can't
 * be read aloud.
 *
 * Pending Alex's review and a voice pass (JUG-14).
 */

/** @type {import('../../src/stories/stories.service.js').StoryTemplateInput[]} */
export const storyTemplates = [
  {
    slug: 'no-aparece',
    title: '{toy} no aparece.',
    teaser: '{kid} y {pet} buscan por toda la casa.',
    minutes: 3,
    mood: 'lively',
    minAgeMonths: 12,
    maxAgeMonths: 71,
    parts: [
      [
        'Una mañana, {kid} fue a buscar a {toy} y… ¡no estaba!',
        'Buscó debajo de la cama. Nada. Buscó en la caja de juguetes. Tampoco.',
        '—{pet}, ¿me ayudás a buscar?',
      ],
      [
        '{kid} y {pet} fueron a la cocina. Miraron detrás de las ollas. Nada.',
        'Fueron al living. Miraron debajo del sillón y encontraron… ¡una media! Pero a {toy}, no.',
        '—¿Y si miramos en tu cama? —dijo {kid}.',
      ],
      [
        '{pet} movió la cola y salió corriendo. Ahí, en un rincón, asomaba algo conocido.',
        '¡Ahí estaba {toy}, entre las mantas de {pet}!',
        '{kid} le dio a {pet} un abrazo bien fuerte y dijo:',
        '—¡Gracias! Ahora sí, a jugar.',
      ],
    ],
  },
  {
    slug: 'paseo-a-la-plaza',
    title: '{pet} y {toy} van a la plaza.',
    teaser: 'Una aventura por el barrio.',
    minutes: 4,
    mood: 'lively',
    minAgeMonths: 12,
    maxAgeMonths: 71,
    parts: [
      [
        'En la caja de juguetes de {kid} vivía {toy}.',
        'Una tarde, cuando paró la lluvia, {pet} se asomó a la caja.',
        '—Me voy a la plaza —dijo {pet}—. ¿Quién viene?',
        '—¡Yo! —dijo {toy}, y saltó afuera de la caja.',
      ],
      [
        'En la plaza, los jacarandás estaban llenos de flores violetas. {toy} se tiró por el tobogán, y {pet} esperó abajo.',
        'Juntaron hojas, corrieron por el pasto y saludaron a las palomas.',
        'Sentados en el pasto, {toy} le contó a {pet} todo lo que sabe sobre {interest}.',
      ],
      [
        'Cuando empezó a bajar el sol, volvieron a casa despacito.',
        '{kid} los esperaba en la puerta.',
        '—¿Mañana volvemos? —preguntó {toy}.',
        '—Mañana volvemos —dijo {pet}.',
      ],
    ],
  },
  {
    slug: 'no-tiene-sueno',
    title: '{toy} no tiene sueño.',
    teaser: 'Un cuento tranquilo para antes de dormir.',
    minutes: 3,
    mood: 'calm',
    minAgeMonths: 12,
    maxAgeMonths: 71,
    parts: [
      [
        'Era de noche, y en la casa todos se estaban por dormir. Todos… menos {toy}.',
        '—No tengo sueño —dijo bajito.',
        '{kid} le dio un abrazo y le dijo:',
        '—Vamos a ver quién más está despierto.',
      ],
      [
        '{toy2} ya no se movía: estaba soñando.',
        'En la ventana, la luna bostezaba.',
        '{pet} dormía en su cama, con la cola sobre la nariz.',
      ],
      [
        '{toy} los miró a todos. Se estiró despacito, abrió la boca grande, grande… y bostezó.',
        '{kid} le acomodó la manta, sin hacer ruido.',
        '—Buenas noches —susurró {kid}.',
        'Y {toy} se durmió, por fin, con una sonrisa.',
      ],
    ],
  },
  {
    slug: 'mirar-la-noche',
    title: '{toy} sale a mirar la noche.',
    teaser: 'Un paseo lento, con una parada en cada ventana.',
    minutes: 3,
    mood: 'calm',
    minAgeMonths: 12,
    maxAgeMonths: 71,
    parts: [
      [
        'Cuando se apagaron las luces, {toy} se asomó desde la cama de {kid}.',
        '—¿Vamos a mirar la noche? —susurró.',
        '{kid} dijo que sí con la cabeza, sin hacer ruido.',
      ],
      [
        'La primera parada fue la ventana del living. Afuera, la luna miraba la plaza.',
        '—Buenas noches, luna —dijo {kid}.',
        'La segunda parada fue la ventana de la cocina. Ahí dormía una paloma, con la cabeza escondida.',
        '—Buenas noches, paloma.',
      ],
      [
        'La última parada fue la cama. {pet} ya estaba ahí, respirando lento, muy lento.',
        'Todos se acomodaron en la almohada y cerraron los ojos.',
        'Y {toy} también se durmió.',
      ],
    ],
  },
  {
    slug: 'los-charcos',
    title: '{pet} descubre los charcos.',
    teaser: '{kid} y {pet} salen a saltar después de la lluvia.',
    minutes: 3,
    mood: 'lively',
    minAgeMonths: 12,
    maxAgeMonths: 71,
    parts: [
      [
        'Llovió toda la mañana. A la tarde salió el sol, y la vereda quedó llena de charcos.',
        '—¿Qué es eso que brilla? —preguntó {pet}, con las orejas paradas.',
        '—Son charcos —dijo {kid}—. Mirá.',
      ],
      [
        '{kid} saltó adentro del primer charco. ¡Splash!',
        '{pet} miró, movió la cola y saltó también. ¡Splash, splash!',
        'En el charco más grande se veía el cielo, con una nube que parecía un caballo.',
      ],
      [
        'Volvieron a casa con las botas mojadas y las patas embarradas.',
        '—Mañana, ¿llueve otra vez? —preguntó {pet}.',
        '—Ojalá —dijo {kid}, y los dos se rieron.',
      ],
    ],
  },
  {
    slug: 'la-ronda',
    title: '{toy} entra en la ronda.',
    teaser: 'En la plaza, todos entran en la ronda.',
    minutes: 3,
    mood: 'lively',
    minAgeMonths: 12,
    maxAgeMonths: 71,
    parts: [
      [
        '{toy} llegó a la plaza y vio a unos chicos jugando a la ronda.',
        'Se quedó mirando desde el arenero. Tenía muchas ganas de jugar, pero le daba vergüenza.',
      ],
      [
        '{kid} vio a {toy} y le tendió la mano.',
        '—¿Venís? En la ronda entramos todos.',
        '{toy} le dio la mano a {kid}, y {toy2} le dio la otra.',
        '{pet} corría alrededor, feliz de ver a todos juntos.',
      ],
      [
        'Giraron y giraron, cantando, hasta que se sentaron en el pasto, mareados y felices.',
        'Desde ese día, cada vez que {toy} ve una ronda, entra sin preguntar.',
      ],
    ],
  },
]
