/** @typedef {{ minutes: number, place: string, title: string, why: string, needs: string, steps: string[], easier: string, harder: string }} Activity */

/** @type {Activity[]} */
export const activities = [
  {
    minutes: 15,
    place: 'Adentro',
    title: 'La búsqueda del dinosaurio chiquito',
    why: 'Usa el dinosaurio chiquito, a Milán le encantan los dinos y es ideal para una tarde de lluvia.',
    needs: 'El dinosaurio chiquito y un almohadón.',
    steps: [
      'Escondé el dinosaurio chiquito debajo de un almohadón mientras Milán mira.',
      'Preguntá: "¿Dónde está el dinosaurio?" y buscalo con Milán.',
      'Cuando lo encuentre, ¡que ruja!',
    ],
    easier: 'Dejá la cola asomando.',
    harder: 'Escondelo en otro lugar del living.',
  },
  {
    minutes: 20,
    place: 'Adentro',
    title: 'El tren grandote lleva pasajeros',
    why: 'Usa el tren grandote y el caballo percherón, y a Milán le encantan los caballos.',
    needs: 'El tren grandote, el caballo percherón y el dinosaurio chiquito.',
    steps: [
      'Armá una vía corta en el piso del living.',
      'Subí al caballo percherón y al dinosaurio chiquito al tren.',
      'En cada parada, preguntá: "¿Quién se baja acá?" y hagan juntos el ruido de ese pasajero.',
    ],
    easier: 'Una vía recta y un solo pasajero.',
    harder: 'Que Milán decida adónde va el tren y quién sube.',
  },
  {
    minutes: 10,
    place: 'Adentro',
    title: 'El osito marrón tiene hambre',
    why: 'Un juego tranquilo con el osito marrón, para bajar un cambio antes de la cena.',
    needs: 'El osito marrón, un plato y una cuchara de plástico.',
    steps: [
      'Sentá al osito marrón en un almohadón y contale a Milán que tiene mucha hambre.',
      'Dale a Milán el plato y la cuchara para que le dé de comer.',
      'Cuando termine, hagan "shh" y acuesten al osito a dormir.',
    ],
    easier: 'Dale vos la primera cucharada y que Milán te copie.',
    harder: 'Que Milán le cuente al osito qué le está dando de comer.',
  },
]