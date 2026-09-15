/**
 * The user turns that ask for the story itself: the default one writes the
 * plot the family chose, and `keywordStory` writes a story about an interest
 * they tapped instead, so the model invents the plot and titles it in the
 * same call. The band rules are in the system prompt, so these only point at
 * them.
 */
export default `Escribí el cuento para esta familia, a partir de la trama elegida.

Los chicos: {{kids}}.
La mascota: {{pet}}.
Los juguetes: {{toys}}.
Lo que le gusta: {{interests}}.

El reparto de este cuento:
{{casting}}

Aplicá las reglas de la banda con precisión, en el largo y en la lengua. El cuento tiene que durar {{minutes}} minutos.

La trama elegida:
«{{title}}»
{{premise}}

Contá esta trama, con su mismo final. Escribí solo el texto del cuento, en este formato exacto, sin markdown, sin título, sin numerar los párrafos y sin explicaciones. No escribas nada fuera del formato: ni saludos, ni comentarios, ni aclaraciones. Lo primero que escribís es «PARTE 1», y el cuento termina con el último párrafo de la parte tres.

PARTE 1
(un párrafo por línea, separados por una línea en blanco)

PARTE 2
(los párrafos de la parte dos)

PARTE 3
(los párrafos de la parte tres)

Tres partes, ni más ni menos. Cada párrafo tiene una, dos o hasta tres oraciones cortas, de las que se dicen de corrido y cierran bien para respirar.`


/** The story of an interest the parent tapped (JUG-140): no plot, and a title of its own. */
export const keywordStory = `Escribí un cuento para esta familia sobre el tema que eligieron.

Los chicos: {{kids}}.
La mascota: {{pet}}.
Los juguetes: {{toys}}.
Lo que le gusta: {{interests}}.

El reparto de este cuento:
{{casting}}

Aplicá las reglas de la banda con precisión, en el largo y en la lengua. El cuento tiene que durar {{minutes}} minutos.

El tema es: {{keyword}}. La trama la inventás vos sobre ese tema, con un problema chiquito y un final feliz.

Escribí solo el título y el texto del cuento, en este formato exacto, sin markdown, sin numerar los párrafos y sin explicaciones. No escribas nada fuera del formato: ni saludos, ni comentarios, ni aclaraciones. Lo primero que escribís es la línea del título, y el cuento termina con el último párrafo de la parte tres.

TÍTULO: (el título del cuento, que diga a los personajes por su nombre, terminado en punto)

PARTE 1
(un párrafo por línea, separados por una línea en blanco)

PARTE 2
(los párrafos de la parte dos)

PARTE 3
(los párrafos de la parte tres)

Tres partes, ni más ni menos. Cada párrafo tiene una, dos o hasta tres oraciones cortas, de las que se dicen de corrido y cierran bien para respirar.`
