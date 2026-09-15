/**
 * How a story is written for each age band. The band is picked by code, from
 * the youngest kid playing, and only its own fragment is sent: the model
 * never sees the rules of a band this story isn't for. The lengths here
 * repeat the minutes and words the band carries in `storytelling.js`.
 */

/** @type {Record<string, string>} */
export default {
  1: `## Cómo se escribe para este chico: UN AÑO

- Tres partes de dos o tres párrafos. El cuento entero dura unos dos minutos: entre 150 y 220 palabras.
- Oraciones de tres a seis palabras, una idea por oración, en presente. Sustantivos concretos, cosas que se ven y se tocan, y acciones visibles.
- No hay problema que resolver: un hecho chiquito y querible, como bañar al osito, saludar a la luna, esconder y encontrar.
- Un estribillo de dos a cuatro palabras, igual en cada parte, para que el chico lo espere: «¡Hola, luna!».
- Muchos sonidos y nombres, repetidos. Sin preguntas al chico. Sin palabras nuevas: solo las de todos los días.`,

  2: `## Cómo se escribe para este chico: DOS AÑOS

- Tres partes de tres a cinco párrafos. El cuento dura de tres a cuatro minutos: entre 300 y 450 palabras.
- Oraciones de hasta ocho palabras, simples y directas, casi todas en presente, sin subordinadas.
- Un problema chiquito y querible que se resuelve con ayuda: se perdió algo, alguien no tiene sueño, hay que llegar a algún lado.
- Un estribillo que se repite y puede crecer un poco en cada parte, para que el chico lo diga con el adulto.
- Sonidos de animales y máquinas para hacer juntos: el tren hace chu-chú, el caballo hace clop clop.
- Una o dos pausas donde el chico completa: la frase queda cortada con puntos suspensivos y el párrafo termina ahí, porque el chico la completa con su voz: «El perro hace…». Nunca escribís la respuesta, ni entre paréntesis ni después.
- Palabras de todos los días. A lo sumo una palabra nueva, que la escena explica sola.`,

  3: `## Cómo se escribe para este chico: TRES AÑOS

- Tres partes de cuatro a seis párrafos. El cuento dura de cuatro a cinco minutos: entre 450 y 600 palabras.
- Oraciones de hasta doce palabras. Ya puede haber causa y efecto: «porque», «entonces».
- El problema se resuelve en tres intentos, y el tercero funciona. Los intentos fallan de manera tierna, sin burla.
- Sensaciones con nombre (contento, tranqui, sorprendido), colores, y contar hasta tres o cinco.
- Una palabra nueva, que el cuento mismo explica con la escena.
- Una o dos preguntas simples para el chico, dichas por un personaje: «¿Dónde está el osito?». Una conecta el cuento con su vida: «¿Te acordás de la plaza?».`,

  4: `## Cómo se escribe para este chico: CUATRO AÑOS

- Tres partes de cinco a siete párrafos. El cuento dura de cinco a seis minutos: entre 600 y 750 palabras.
- Oraciones de hasta catorce palabras, con alguna subordinada simple.
- Una pequeña aventura con un desafío claro y una resolución con gusto: un misterio chiquito, un viaje, algo que arreglar entre todos.
- Humor simple y tierno: equivocaciones, sorpresas, alguien que se confunde de manera querible.
- Los personajes pueden planear, equivocarse y corregir. Las emociones se muestran y se nombran.
- Hasta dos palabras nuevas, explicadas por la escena. Una o dos preguntas al chico, y alguna conexión con su vida: «¿Vos qué habrías llevado a la plaza?».`,

  5: `## Cómo se escribe para este chico: CINCO AÑOS

- Tres partes de seis a ocho párrafos. El cuento dura de seis a siete minutos: entre 750 y 900 palabras.
- Oraciones de hasta dieciséis palabras, con subordinadas y diálogos más largos.
- Una aventura con un giro: algo que no era lo que parecía, un plan que cambia a mitad de camino. La solución la encuentran los personajes, no un adulto.
- Humor con juegos de palabras simples y personajes con maneras propias de hablar.
- Sentimientos con matices (nervioso, orgulloso, aliviado) y por qué los sienten.
- Dos o tres palabras nuevas, explicadas por la escena. Preguntas que piden opinión: «¿Vos qué habrías hecho?».`,
}
