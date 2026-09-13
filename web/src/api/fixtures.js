/**
 * The mock's data: the brief's example family and content written for it.
 * Toy names appear exactly as the family says them, lowercase included.
 */

/** @typedef {{ name: string, age: number | null }} Kid */
/** @typedef {{ kids: Kid[], pet: string, interests: string[], toys: string[] }} Family */
/**
 * @typedef {{ family: Family, flagged: string[], note: string | null }} ParseResult
 * `flagged` holds field keys ('kids.1', 'pet', 'interests', 'toys') the model was unsure about.
 */
/**
 * @typedef {{
 *   id: string, title: string, minutes: number, place: 'adentro' | 'afuera',
 *   why: string, needs: string, steps: string[], easier: string, harder: string,
 * }} Activity
 * `needs` starts lowercase so a toy name at the start keeps its family spelling;
 * the layout capitalises the sentence where it needs to.
 */
/** @typedef {{ id: string, title: string, teaser: string, minutes: number }} StoryOption */
/** @typedef {StoryOption & { parts: string[][] }} Story */

/** @type {Family} */
export const EXAMPLE_FAMILY = {
  kids: [{ name: 'Milán', age: 2 }],
  pet: 'Inca',
  interests: ['los dinosaurios', 'los caballos'],
  toys: ['el dinosaurio chiquito', 'el tren grandote', 'el osito marrón', 'el caballo percherón'],
}

/** The two realistic failures from the wireframes: the dog read as a sibling, a toy losing its house name. */
/** @type {ParseResult} */
export const MISREAD_PARSE = {
  family: {
    kids: [
      { name: 'Milán', age: 2 },
      { name: 'Inca', age: null },
    ],
    pet: '',
    interests: ['los dinosaurios', 'los caballos'],
    toys: ['un tren de madera'],
  },
  flagged: ['kids.1', 'toys'],
  note: 'Inca quedó como hermana en vez de mascota, y el tren perdió su nombre de casa.',
}

/** @type {Activity[]} */
export const ACTIVITIES = [
  {
    id: 'la-busqueda-del-dinosaurio-chiquito',
    title: 'La búsqueda del dinosaurio chiquito',
    minutes: 15,
    place: 'adentro',
    why: 'Usa el dinosaurio chiquito, a Milán le encantan los dinos y es ideal para una tarde de lluvia.',
    needs: 'el dinosaurio chiquito y un almohadón.',
    steps: [
      'Escondé el dinosaurio chiquito debajo de un almohadón mientras Milán mira.',
      'Preguntá: “¿Dónde está el dinosaurio?” y buscalo con Milán.',
      'Cuando lo encuentre, ¡que ruja!',
    ],
    easier: 'Dejá la cola asomando.',
    harder: 'Escondelo en otro lugar del living.',
  },
  {
    id: 'el-tren-grandote-lleva-pasajeros',
    title: 'El tren grandote lleva pasajeros',
    minutes: 20,
    place: 'adentro',
    why: 'El tren grandote es el juguete que Milán no suelta, y el caballo percherón puede ser el primer pasajero.',
    needs: 'el tren grandote, el caballo percherón y el dinosaurio chiquito.',
    steps: [
      'Armá una vía corta en el piso del living.',
      'Subí al caballo percherón y al dinosaurio chiquito al tren.',
      'En cada parada, preguntá: “¿Quién se baja acá?” y hagan juntos el ruido de ese pasajero.',
    ],
    easier: 'Una vía recta y un solo pasajero.',
    harder: 'Que Milán decida adónde va el tren y quién sube.',
  },
  {
    id: 'el-osito-marron-tiene-hambre',
    title: 'El osito marrón tiene hambre',
    minutes: 10,
    place: 'adentro',
    why: 'Un juego tranquilo con el osito marrón, para bajar un cambio antes de la cena.',
    needs: 'el osito marrón, un plato y una cuchara de plástico.',
    steps: [
      'Sentá al osito marrón en un almohadón y contale a Milán que tiene mucha hambre.',
      'Dale a Milán el plato y la cuchara para que le dé de comer.',
      'Cuando termine, hagan “shh” y acuesten al osito a dormir.',
    ],
    easier: 'Dale vos la primera cucharada y que Milán te copie.',
    harder: 'Que Milán le cuente al osito qué le está dando de comer.',
  },
  {
    id: 'galope-en-la-plaza',
    title: 'Galope en la plaza',
    minutes: 20,
    place: 'afuera',
    why: 'A Milán le encantan los caballos, y en la plaza hay lugar de sobra para galopar con Inca.',
    needs: 'nada más que la plaza. Si quieren, el caballo percherón viene de paseo.',
    steps: [
      'Galopen juntos hasta el primer árbol, haciendo “clop, clop”.',
      'En cada árbol, frenen y relinchen bien fuerte.',
      'Que Milán elija el próximo árbol, e Inca los sigue.',
    ],
    easier: 'Vayan al paso, de la mano.',
    harder: 'Que Milán diga cuándo se galopa y cuándo se frena.',
  },
]

/** @type {Story[]} */
export const STORIES = [
  {
    id: 'el-caballo-percheron-pierde-su-herradura',
    title: 'El caballo percherón pierde su herradura.',
    teaser: 'Milán y el caballo percherón la buscan por toda la casa.',
    minutes: 4,
    parts: [
      [
        'Una mañana, el caballo percherón se despertó, estiró las patas y dijo:',
        '—¡Ay! ¿Dónde está mi herradura?',
        'Buscó debajo de la cama. No estaba. Buscó en la caja de juguetes. Tampoco.',
        '—Milán, ¿me ayudás a buscarla?',
      ],
      [
        'Milán y el caballo percherón fueron a la cocina. Clop, clop, clop. Miraron detrás de las ollas. Nada.',
        'Fueron al living. Clop, clop, clop. Miraron debajo del sillón y encontraron… ¡el tren grandote! Pero la herradura, no.',
        '—¿Y si le preguntamos a Inca? —dijo Milán.',
      ],
      [
        'Inca movió la cola y salió corriendo hasta su cucha. Ahí, entre las mantas, brillaba algo.',
        '¡La herradura! Inca la había guardado para que no se perdiera.',
        'El caballo percherón se la puso, dio tres saltos de alegría y dijo:',
        '—¡Gracias, Milán! ¡Gracias, Inca! Clop, clop, clop.',
      ],
    ],
  },
  {
    id: 'inca-y-el-dinosaurio-chiquito-van-a-la-plaza',
    title: 'Inca y el dinosaurio chiquito van a la plaza.',
    teaser: 'Una aventura por el barrio.',
    minutes: 5,
    parts: [
      [
        'Había una vez un dinosaurio chiquito que vivía en la caja de juguetes de Milán. Una tarde de lluvia, escuchó un ruido que venía del pasillo: ¡chu-chú, chu-chú! Era el tren grandote, que venía a buscarlo para ir de paseo.',
        '—¿Venís? —preguntó el tren.',
        'El dinosaurio chiquito se subió al último vagón, y allá fueron los dos, despacito, por toda la casa.',
      ],
      [
        'Afuera, la lluvia ya había parado. Cuando llegaron a la puerta, ahí estaba Inca, moviendo la cola.',
        '—Me voy a la plaza —dijo Inca—. ¿Quién viene?',
        '—¡Yo! —dijo el dinosaurio chiquito, y se bajó del tren de un salto.',
        'El tren grandote se quedó cuidando la casa. Chu-chú, chau.',
      ],
      [
        'En la plaza, los jacarandás estaban llenos de flores violetas. El dinosaurio chiquito se tiró por el tobogán, e Inca lo esperó abajo.',
        'Juntaron hojas, corrieron por el pasto y saludaron a las palomas.',
        'Cuando empezó a bajar el sol, volvieron a casa despacito, cansados y contentos.',
        '—¿Mañana volvemos? —preguntó el dinosaurio chiquito.',
        '—Mañana volvemos —dijo Inca.',
      ],
    ],
  },
  {
    id: 'el-osito-marron-no-tiene-sueno',
    title: 'El osito marrón no tiene sueño.',
    teaser: 'Un cuento tranquilo para antes de dormir.',
    minutes: 3,
    parts: [
      [
        'Era de noche, y en la casa todos se estaban por dormir. Todos… menos el osito marrón.',
        '—No tengo sueño —dijo bajito.',
        'Milán lo abrazó fuerte y le dijo:',
        '—Vamos a ver quién más está despierto.',
      ],
      [
        'El tren grandote estaba quieto en su vía.',
        '—Chu… chú… —bostezó, y cerró los ojos.',
        'El caballo percherón estaba echado en la alfombra. Respiraba lento, muy lento.',
        'Inca ya dormía en su cucha, con la cola sobre la nariz.',
      ],
      [
        'El osito marrón los miró a todos. Estiró los brazos. Abrió la boca grande, grande… y bostezó.',
        'Milán lo tapó con la manta, despacito.',
        '—Buenas noches, osito marrón.',
        'Y el osito marrón, calentito, se quedó dormido.',
      ],
    ],
  },
  {
    id: 'el-tren-grandote-viaja-de-noche',
    title: 'El tren grandote viaja de noche.',
    teaser: 'Un paseo lento, con una parada en cada ventana.',
    minutes: 4,
    parts: [
      [
        'Cuando se apagaron las luces, el tren grandote tocó su silbato muy, muy bajito.',
        '—Chu-chú… ¿quién viene a dar una vuelta?',
        'El dinosaurio chiquito subió primero. Después subió el osito marrón, con su manta.',
      ],
      [
        'La primera parada fue la ventana del living. Afuera, la luna miraba la plaza.',
        '—Buenas noches, luna —dijo Milán.',
        'La segunda parada fue la ventana de la cocina. Ahí dormía una paloma, con la cabeza escondida.',
        '—Buenas noches, paloma.',
      ],
      [
        'La última parada fue la cama de Milán. El tren frenó despacito, sin hacer ruido.',
        'Todos se bajaron, se acomodaron en la almohada y cerraron los ojos.',
        'Chu… chú… El tren grandote también se quedó dormido.',
      ],
    ],
  },
  {
    id: 'inca-descubre-los-charcos',
    title: 'Inca descubre los charcos.',
    teaser: 'Milán e Inca salen a saltar después de la lluvia.',
    minutes: 3,
    parts: [
      [
        'Llovió toda la mañana. A la tarde salió el sol, y la vereda quedó llena de charcos.',
        '—¿Qué es eso que brilla? —preguntó Inca, con las orejas paradas.',
        '—Son charcos —dijo Milán—. Mirá.',
      ],
      [
        'Milán saltó adentro del primer charco. ¡Splash!',
        'Inca lo miró, movió la cola y saltó también. ¡Splash, splash!',
        'En el charco más grande se veía el cielo, con una nube que parecía un caballo.',
      ],
      [
        'Volvieron a casa con las botas mojadas y las patas embarradas.',
        '—Mañana, ¿llueve otra vez? —preguntó Inca.',
        '—Ojalá —dijo Milán, y los dos se rieron.',
      ],
    ],
  },
  {
    id: 'la-ronda-del-dinosaurio-chiquito',
    title: 'La ronda del dinosaurio chiquito.',
    teaser: 'En la plaza, todos entran en la ronda.',
    minutes: 4,
    parts: [
      [
        'El dinosaurio chiquito llegó a la plaza y vio a unos chicos jugando a la ronda.',
        'Se quedó mirando desde el arenero. Él también quería jugar, pero era muy chiquito.',
      ],
      [
        'Milán lo vio y le tendió la mano.',
        '—¿Venís? En la ronda entramos todos.',
        'El dinosaurio chiquito le dio la mano a Milán, y el caballo percherón le dio la otra.',
        'Inca corría alrededor, ladrando de contenta.',
      ],
      [
        'Giraron y giraron, cantando, hasta que todos se sentaron en el pasto, mareados y felices.',
        'Desde ese día, cada vez que el dinosaurio chiquito ve una ronda, entra sin preguntar.',
      ],
    ],
  },
]
