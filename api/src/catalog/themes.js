/**
 * Themes: what an activity is about, as a short list of tags a template
 * carries, and the words a family's interests are read into them with. A kid
 * who loves "los dinosaurios" matches a template tagged `dinosaurios`; a
 * template tagged nothing matches nobody in particular, and is still offered
 * on everything else it has going for it.
 *
 * The list is in code, like the materials (JUG-153): a template names its
 * themes by key, the catalog refuses any other, and the ranking reads the
 * family's interests into keys with the stems below. A stem matches a word
 * that starts with it once accents and case are gone, so "Dinos", "dinosaurio"
 * and "los dinosaurios" all reach `dinosaurios`. Keep stems long enough not to
 * catch other words, and end one with `$` when only the whole word will do
 * ("mono$" and "monos", since "mono" is also how monopatín starts). Never
 * change a key once templates carry it.
 */

/** @typedef {{ key: string, label: string, stems: string[] }} ThemeDefinition */

/** @type {ThemeDefinition[]} */
export const THEMES = [
  {
    key: 'animales',
    label: 'Animales',
    stems: [
      'anim', 'bich', 'mascot', 'perr', 'cachorr', 'gato', 'gatit', 'caball', 'poni', 'pony', 'vaca', 'chanch', 'cerd',
      'ovej', 'gallin', 'poll', 'pato', 'leon', 'tigr', 'elefant', 'jiraf', 'mono$', 'monos', 'monit', 'oso', 'osit', 'conej', 'tortug',
      'sapo', 'rana', 'pez', 'pece', 'tibur', 'delfin', 'ballen', 'pajar', 'aves', 'loro', 'hormig', 'maripos', 'insect',
      'granj', 'zoo', 'selv',
    ],
  },
  { key: 'dinosaurios', label: 'Dinosaurios', stems: ['dino', 'rex', 'dragon'] },
  {
    key: 'vehiculos',
    label: 'Autos, trenes y aviones',
    stems: [
      'vehicul', 'auto', 'coche', 'camion', 'tren', 'avion', 'moto', 'bici', 'colectiv', 'bondi', 'tractor', 'barco',
      'cohete', 'ambulanci', 'bomber', 'grua', 'excavador', 'helicopter', 'rueda', 'subte', 'nave',
    ],
  },
  {
    key: 'musica',
    label: 'Música y baile',
    stems: ['music', 'cancion', 'cant', 'bail', 'tambor', 'guitarr', 'instrument', 'ritmo', 'ronda'],
  },
  {
    key: 'agua',
    label: 'Agua',
    stems: ['agua', 'pilet', 'bañar', 'bañad', 'bañer', 'burbuj', 'jabon', 'lluvi', 'charc', 'moj', 'espum', 'playa'],
  },
  {
    key: 'construir',
    label: 'Construir y armar',
    stems: ['constru', 'arma', 'torre', 'bloque', 'ladrill', 'lego', 'rasti', 'encastr', 'caja', 'rompecabez', 'puzzle'],
  },
  { key: 'dibujar', label: 'Dibujar y pintar', stems: ['dibuj', 'pint', 'crayon', 'garabat', 'colore', 'marcador', 'temper'] },
  {
    key: 'cocinar',
    label: 'Cocinar y la comida',
    stems: ['cocin', 'masa', 'amas', 'comid', 'galletit', 'torta', 'pizza', 'helad', 'frut', 'verdur', 'merienda'],
  },
  {
    key: 'naturaleza',
    label: 'Plantas y bichos',
    stems: ['plant', 'flor', 'arbol', 'jardin', 'natur', 'hoja', 'semill', 'tierr', 'huert', 'pasto', 'piedr', 'caracol'],
  },
  { key: 'pelota', label: 'Pelotas', stems: ['pelot', 'futbol', 'balon', 'pate', 'basquet', 'tenis'] },
  { key: 'esconderse', label: 'Esconderse y buscar', stems: ['escond', 'busc', 'sorpres', 'tesoro', 'misteri'] },
  { key: 'libros', label: 'Libros y cuentos', stems: ['libro', 'cuento', 'leer', 'lectur', 'histori', 'poes'] },
  {
    key: 'disfraces',
    label: 'Disfraces y personajes',
    stems: ['disfraz', 'princes', 'superher', 'super', 'heroe', 'pirat', 'hada', 'bruj', 'monstru', 'castill', 'reyes', 'reina'],
  },
  {
    key: 'munecos',
    label: 'Muñecos y jugar a la casita',
    stems: ['muñec', 'bebe', 'doctor', 'medic', 'cocinit', 'casit', 'peluch', 'teter', 'mamader'],
  },
  { key: 'numeros', label: 'Números y contar', stems: ['numer', 'contar', 'cuenta'] },
  { key: 'letras', label: 'Letras y nombres', stems: ['letra', 'nombre', 'abecedari', 'escrib', 'palabr'] },
  { key: 'colores', label: 'Colores y formas', stems: ['color', 'forma', 'circul', 'cuadrad'] },
  {
    key: 'cuerpo',
    label: 'Correr, saltar y trepar',
    stems: ['corr', 'salt', 'trep', 'escal', 'plaza', 'tobog', 'hamac', 'mover', 'carrer', 'monopat', 'triciclo'],
  },
]

export const THEME_KEYS = THEMES.map((theme) => theme.key)

/** A word with no accents or case, so a stem reads every spelling. @param {string} word */
export const plain = (word) =>
  word
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')

const STEMS = THEMES.map((theme) => ({
  key: theme.key,
  stems: theme.stems.map((stem) => (stem.endsWith('$') ? { word: plain(stem.slice(0, -1)) } : { start: plain(stem) })),
}))

/** @param {string} word @param {{ word?: string, start?: string }} stem */
const matches = (word, stem) => (stem.word != null ? word === stem.word : word.startsWith(/** @type {string} */ (stem.start)))

/**
 * The themes some interests speak of, each once, in the order of the list.
 * "los dinosaurios" gives dinosaurios; "los trenes y los autos" gives
 * vehiculos; "la playa" gives agua. Words the list doesn't know give nothing.
 * @param {string[]} interests the family's words, as typed
 * @returns {string[]}
 */
export function themesOf(interests) {
  const words = interests.flatMap((interest) => plain(interest).split(/[^\p{L}]+/u)).filter((word) => word.length >= 3)
  return STEMS.filter(({ stems }) => words.some((word) => stems.some((stem) => matches(word, stem)))).map(({ key }) => key)
}
