import type { Family } from '@juguemos/shared'

export const family: Family = {
  kids: [{ name: 'Milán', ageYears: 2 }],
  pet: 'Inca',
}

export function familyLine(fam: Family): string {
  const kids = fam.kids.map((kid) => `${kid.name}, ${kid.ageYears} años`)
  const day = new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(new Date())
  return [...kids, fam.pet, day].join(' · ')
}
