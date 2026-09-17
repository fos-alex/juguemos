/**
 * The user turn that asks for the screen's plots, one per casting the code
 * drew, in the same order. The band rules are in the system prompt, so this
 * only points at them.
 */
export default `La familia va a leer un cuento a {{moment}}.

Los chicos: {{kids}}.
La mascota: {{pet}}.
Los juguetes: {{toys}}.
Lo que le gusta: {{interests}}.{{parents}}

El reparto de cada trama, ya decidido, que tenés que respetar tal cual:
{{castings}}

Cada trama usa solo a los de su reparto. Si un reparto dice «sin mascota», «sin juguetes» o «sin los chicos de la familia», esa trama no los nombra, aunque aparezcan en la lista de arriba por otra trama.

Proponé {{count}} tramas, una por cada reparto y en ese mismo orden, de alrededor de {{minutes}} minutos de lectura cada una: aplicá las reglas de la banda con precisión, en el largo y en la lengua. Que cada título diga a sus personajes por su nombre, y que las tramas sean bien distintas entre sí: distintos escenarios, distintos tipos de acontecer.
{{avoid}}
Contestá solo con un objeto JSON, sin markdown ni explicaciones, con una sola clave «tramas», cuyo valor es un array de {{count}} objetos, en el orden de los repartos, con estas claves:
- "title": el título del cuento, corto, de hasta ocho palabras, con los personajes, terminado en punto.
- "teaser": una línea corta, de hasta doce palabras, que da ganas de leerlo, en presente, sin revelar el final.
- "minutes": un número entero de minutos de lectura, dentro del largo de la banda.
- "premise": dos oraciones que cuentan la trama completa, final incluido, para que otro pueda escribir el cuento a partir de ahí.`
