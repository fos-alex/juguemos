La familia va a leer un cuento a {{moment}}.

Los chicos: {{kids}}.
La mascota: {{pet}}.
Los juguetes: {{toys}}.
Lo que le gusta: {{interests}}.

El chico ancla del cuento tiene {{anchorAge}}, así que aplica la banda {{band}} con precisión. Cada propuesta se escribe después con el largo y la lengua de esa banda: alrededor de {{minutes}} minutos de lectura.

Proponé {{count}} tramas bien distintas entre sí: distintos escenarios, distintos tipos de acontecer. Que por lo menos una tenga un toque de humor, si el momento lo permite. Que en las tres aparezcan los chicos y algo de la familia (la mascota, un juguete, algo que le gusta). Los títulos dicen los personajes por su nombre.
{{avoid}}
Contestá solo con un objeto JSON, sin markdown ni explicaciones, con una sola clave «tramas», cuyo valor es un array de {{count}} objetos con estas claves:
- "title": el título del cuento, con los personajes, terminado en punto.
- "teaser": una línea que dan ganas de leerlo, en presente, sin revelar el final.
- "minutes": un número entero de minutos de lectura, dentro del largo de la banda.
- "premise": dos o tres oraciones que cuentan la trama completa, final incluido, para que otro pueda escribir el cuento a partir de ahí.
