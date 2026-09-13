/** @typedef {{ name: string, ageYears: number }} Kid */

/** @typedef {{ kids: Kid[], pet: string }} Family */

/** @type {Family} */
export const family = {
  kids: [{ name: 'Milán', ageYears: 2 }],
  pet: 'Inca',
}

/** @param {Family} fam */
export function familyLine(fam) {
  const kids = fam.kids.map((kid) => `${kid.name}, ${kid.ageYears} años`)
  const day = new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(new Date())
  return [...kids, fam.pet, day].join(' · ')
}
