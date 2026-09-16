/**
 * How a story is written for each age band: six months a band under four
 * years, a year a band at four and five (JUG-145). The band is picked by code,
 * from the youngest kid playing, and only its own fragment is sent: the model
 * never sees the rules of a band this story isn't for. The lengths here
 * repeat the minutes and words the band carries in `storytelling.js`. Each
 * band asks for a little more than the kid can say, since kids understand
 * much more than they say.
 */

/** @type {Record<string, string>} */
export default {
  1: `## Cómo se escribe para este chico: DE UN AÑO A UN AÑO Y MEDIO

- Tres partes de dos a cuatro párrafos. El cuento dura de dos a tres minutos: entre 200 y 300 palabras.
- Oraciones cortas, de hasta ocho palabras, casi todas en presente. Verbos variados y precisos: no solo «juega» y «mira», también «trepa», «sopla», «espía», «salpica».
- Un hecho con un antes y un después: algo se esconde y aparece, algo se moja y se seca, alguien llega de visita. Una pequeña sorpresa en la última parte.
- Un estribillo corto que vuelve en cada parte, para que el chico lo espere: «¡Hola, luna!».
- Sonidos para hacer juntos y cosas de su mundo con su nombre. Dos o tres palabras que quizá no conoce (un animal, un color, una parte del cuerpo), dichas junto a lo que la escena muestra.
- Una o dos invitaciones a señalar o a hacer un gesto, dichas por un personaje: «¿Dónde está la luna?», «¿Cómo salta el sapo?».`,

  '1.5': `## Cómo se escribe para este chico: DE UN AÑO Y MEDIO A DOS AÑOS

- Tres partes de tres a cuatro párrafos. El cuento dura unos tres minutos: entre 280 y 380 palabras.
- Oraciones de hasta diez palabras, casi todas en presente y alguna en pasado. Dos ideas pueden ir unidas con «y» o con «pero».
- Un problema chiquito con una solución que el chico puede adivinar antes de que llegue: algo se perdió, alguien tiene hambre, hay que llegar a un lugar.
- Un estribillo que vuelve en cada parte y crece un poco cada vez.
- Juego de hacer de cuenta: un personaje usa una cosa como si fuera otra, como una caja que es un barco.
- Una pausa donde el chico completa: la frase queda cortada con puntos suspensivos y el párrafo termina ahí, porque el chico la completa con su voz: «El perro hace…». Nunca escribís la respuesta, ni entre paréntesis ni después.
- Tres o cuatro palabras nuevas (animales, cosas, acciones), cada una dicha dos veces en una escena que la muestra.`,

  2: `## Cómo se escribe para este chico: DE DOS A DOS AÑOS Y MEDIO

- Tres partes de cuatro a cinco párrafos. El cuento dura de tres a cuatro minutos: entre 350 y 480 palabras.
- Oraciones de hasta doce palabras. Ya hay causa y efecto, con «porque» y «entonces», y el tiempo se mueve: «antes», «después», «mañana».
- Un problema que se resuelve en dos intentos: el primero no alcanza y el segundo sale porque un personaje pensó algo nuevo.
- Emociones con nombre: contento, enojado, triste, un poquito asustado que después se pasa.
- Una o dos pausas donde el chico completa, con puntos suspensivos al final del párrafo. Nunca escribís la respuesta.
- Una pregunta de qué o de dónde, dicha por un personaje.
- Cuatro o cinco palabras nuevas explicadas por la escena, y adjetivos precisos: «enorme», «pegajoso», «tibio», «resbaloso».`,

  '2.5': `## Cómo se escribe para este chico: DE DOS AÑOS Y MEDIO A TRES AÑOS

- Tres partes de cuatro a seis párrafos. El cuento dura de cuatro a cinco minutos: entre 450 y 600 palabras.
- Oraciones de hasta catorce palabras, con «porque», «cuando», «pero» y «entonces». Diálogos cortos entre los personajes.
- El problema se resuelve en tres intentos, y el tercero funciona gracias a una idea de un personaje. Los intentos fallan de manera tierna, sin burla.
- Contrarios (adentro y afuera, rápido y despacio, pesado y liviano), colores, formas, y contar hasta cinco.
- Emociones con nombre y con su motivo: «estaba triste porque se le había volado el barrilete».
- Cinco o seis palabras nuevas, explicadas por la escena.
- Una o dos preguntas de qué, dónde o quién, dichas por un personaje, y una que conecta el cuento con su vida: «¿Te acordás de la plaza?».`,

  3: `## Cómo se escribe para este chico: DE TRES A TRES AÑOS Y MEDIO

- Tres partes de cinco a seis párrafos. El cuento dura de cuatro a cinco minutos: entre 520 y 680 palabras.
- Oraciones de hasta dieciséis palabras, con subordinadas simples. El cuento se narra en pasado: «Esa mañana, Inca encontró…».
- Una pequeña aventura con un desafío claro: intentos que fallan de manera tierna y una solución que encuentran los personajes.
- Humor: equivocaciones, cosas al revés, alguien que se confunde de manera querible.
- Lo que cada personaje quiere o piensa, aunque sea distinto de lo que quiere otro, y cómo se ponen de acuerdo.
- Seis a ocho palabras nuevas, explicadas por la escena o por un personaje.
- Preguntas de por qué y de qué va a pasar: «¿Qué te parece que hay adentro de la caja?».`,

  '3.5': `## Cómo se escribe para este chico: DE TRES AÑOS Y MEDIO A CUATRO AÑOS

- Tres partes de cinco a siete párrafos. El cuento dura de cinco a seis minutos: entre 620 y 780 palabras.
- Oraciones de largo variado, de hasta dieciocho palabras, con subordinadas y diálogos más largos. Cada personaje tiene su manera de hablar.
- Una aventura con un pequeño misterio o un plan que se tuerce: el chico junta las pistas junto con los personajes.
- Humor con exageraciones y juegos de palabras simples.
- Sentimientos con matices (nervioso, orgulloso, frustrado, aliviado) y por qué los sienten.
- Unas ocho palabras nuevas, algunas difíciles («madriguera», «brújula», «gigantesco»), explicadas por la escena.
- Preguntas que piden adivinar lo que viene y opinar: «¿Vos qué harías?».`,

  4: `## Cómo se escribe para este chico: CUATRO AÑOS

- Tres partes de seis a siete párrafos. El cuento dura de cinco a seis minutos: entre 700 y 850 palabras.
- Oraciones de largo variado, de hasta veinte palabras, con subordinadas y palabras que marcan el tiempo: «mientras», «de repente», «al rato».
- Una aventura con un desafío de verdad, un giro a mitad de camino, y una resolución que los personajes buscan y encuentran solos.
- Humor con malentendidos y personajes con manías.
- Sentimientos mezclados (contento y nervioso a la vez), y alguien que cambia de idea y dice por qué.
- Hasta diez palabras nuevas, explicadas por la escena o por un personaje.
- Una o dos preguntas que piden opinar y que conectan con su vida: «¿Vos qué habrías llevado a la plaza?».`,

  5: `## Cómo se escribe para este chico: CINCO AÑOS

- Tres partes de seis a ocho párrafos. El cuento dura de seis a siete minutos: entre 800 y 1000 palabras.
- Oraciones de largo variado, con subordinadas, diálogos largos y alguna descripción que pinta el lugar.
- Una trama con un giro de verdad: algo que no era lo que parecía, un plan que cambia a mitad de camino. Puede haber una historia chiquita dentro de la grande. La solución la encuentran los personajes, no un adulto.
- Humor con juegos de palabras, adivinanzas y personajes con maneras propias de hablar.
- Sentimientos con matices y puntos de vista distintos: un pequeño dilema donde las dos opciones tienen algo bueno.
- Unas diez palabras nuevas, sin miedo, explicadas por el contexto.
- Preguntas que piden opinión: «¿Vos qué habrías hecho?».`,
}
