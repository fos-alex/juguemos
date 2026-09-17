/**
 * The user turns that ask for the next episode of a series (JUG-59). The band
 * rules are in the system prompt, so these only point at them.
 *
 * The second episode is the one that makes the series: it is written from the
 * whole first episode, and the same call names the series, says where it
 * happens, and sums the first episode up, so no extra call is needed. Every
 * episode after that is written from what the series already knows.
 *
 * The lines outside the story — SERIE, LUGAR, ANTES, TÍTULO, RESUMEN and
 * PERSONAJES — are bookkeeping: `StoryParser` keeps them out of the story, and
 * nobody ever reads them aloud.
 */

/** What both prompts say about the family and the series' cast. */
const family = `Los chicos: {{kids}}.
La mascota: {{pet}}.
Los juguetes: {{toys}}.
Lo que le gusta: {{interests}}.{{parents}}

El reparto de la serie, que se mantiene en todos los episodios:
{{casting}}`

/** The three parts, which every episode has. */
const parts = `PARTE 1
(un párrafo por línea, separados por una línea en blanco)

PARTE 2
(los párrafos de la parte dos)

PARTE 3
(los párrafos de la parte tres)`

/** The last line of both prompts. */
const closing = `Tres partes, ni más ni menos. Cada párrafo tiene una, dos o hasta tres oraciones cortas, de las que se dicen de corrido y cierran bien para respirar.`

/** The second episode: the one that turns a cuento the family liked into a series. */
export const secondEpisode = `Escribí el segundo episodio de una serie para esta familia.

${family}

El hilo de la serie, que ningún episodio cambia: {{storyline}}

El primer episodio se llama «{{first}}» y fue así:

{{firstText}}

Aplicá las reglas de la banda con precisión, en el largo y en la lengua. El episodio tiene que durar {{minutes}} minutos.

Este episodio sigue al primero: los mismos personajes y el mismo mundo, otro día. Pasa algo nuevo, con su propio problema chiquito y su propio final. Podés sumar un personaje secundario nuevo, que va a quedar en la serie.

Escribí solo las líneas de este formato exacto, sin markdown, sin numerar los párrafos y sin explicaciones. No escribas nada fuera del formato: ni saludos, ni comentarios, ni aclaraciones.

SERIE: (el nombre de la serie, distinto del título del primer episodio, que le quede bien a todos los episodios, terminado en punto)
LUGAR: (en una línea, dónde pasa la serie)
ANTES: (en una o dos oraciones, qué pasó en el primer episodio)
TÍTULO: (el título de este episodio, que diga a sus personajes por su nombre, terminado en punto)

${parts}

RESUMEN: (en una o dos oraciones, qué pasó en este episodio)
PERSONAJES: (los personajes que inventaste y quedan en la serie, separados por punto y coma, cada uno con su nombre, dos puntos y tres o cuatro palabras que digan quién es; los padres, los chicos, la mascota y los juguetes de la familia no van acá)

${closing}`

/** Every episode from the third on, written from what the series already knows. */
export const nextEpisode = `Escribí el episodio {{number}} de una serie para esta familia.

${family}

{{series}}

Lo que pasó hasta acá, episodio por episodio:
{{episodes}}

Aplicá las reglas de la banda con precisión, en el largo y en la lengua. El episodio tiene que durar {{minutes}} minutos.

Este episodio sigue a los anteriores: los mismos protagonistas, el mismo lugar y el mismo hilo. Pasa algo nuevo que no pasó en ningún episodio anterior, con su propio problema chiquito y su propio final. Podés traer de vuelta un personaje de otro episodio o sumar uno nuevo, que va a quedar en la serie.

Escribí solo las líneas de este formato exacto, sin markdown, sin numerar los párrafos y sin explicaciones. No escribas nada fuera del formato: ni saludos, ni comentarios, ni aclaraciones.

TÍTULO: (el título de este episodio, que diga a sus personajes por su nombre, terminado en punto)

${parts}

RESUMEN: (en una o dos oraciones, qué pasó en este episodio)
PERSONAJES: (los personajes que inventaste y quedan en la serie, los de antes y los nuevos, separados por punto y coma, cada uno con su nombre, dos puntos y tres o cuatro palabras que digan quién es; los padres, los chicos, la mascota y los juguetes de la familia no van acá)

${closing}`
