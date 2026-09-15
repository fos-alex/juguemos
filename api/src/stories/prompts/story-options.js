/**
 * The user turn that asks for one plot option, for the casting the code drew.
 * The band rules are in the system prompt, so this only points at them.
 */
export default `La familia va a leer un cuento a {{moment}}.

Los chicos: {{kids}}.
La mascota: {{pet}}.
Los juguetes: {{toys}}.
Lo que le gusta: {{interests}}.

El reparto de este cuento:
{{casting}}

Proponé una sola trama para ese reparto, de alrededor de {{minutes}} minutos de lectura: aplicá las reglas de la banda con precisión, en el largo y en la lengua. Que el título diga a los personajes por su nombre.
{{avoid}}
Contestá solo con un objeto JSON, sin markdown ni explicaciones, con estas claves:
- "title": el título del cuento, con los personajes, terminado en punto.
- "teaser": una línea que dan ganas de leerlo, en presente, sin revelar el final.
- "minutes": un número entero de minutos de lectura, dentro del largo de la banda.
- "premise": dos oraciones que cuentan la trama completa, final incluido, para que otro pueda escribir el cuento a partir de ahí.`
