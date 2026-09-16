import assert from 'node:assert/strict'
import { test } from 'node:test'
import { THEME_KEYS, THEMES, themesOf } from '../../src/catalog/themes.js'

test('interests are read into themes by their stems, with accents and case ignored', () => {
  assert.deepEqual(themesOf(['los dinosaurios']), ['dinosaurios'])
  assert.deepEqual(themesOf(['Los Trenes', 'la playa']), ['vehiculos', 'agua'])
  assert.deepEqual(themesOf(['el fútbol']), ['pelota'])
  assert.deepEqual(themesOf(['los muñecos']), ['munecos'])
  assert.deepEqual(themesOf(['Inca, el perro']), ['animales'])
})

test('one interest can be about two themes, and each theme comes once, in the list order', () => {
  assert.deepEqual(themesOf(['pintar dinosaurios', 'los dinos']), ['dinosaurios', 'dibujar'])
})

test('words the list does not know, and short words, give nothing', () => {
  assert.deepEqual(themesOf(['la televisión']), [])
  assert.deepEqual(themesOf(['ir a lo de la abuela']), [])
  assert.deepEqual(themesOf([]), [])
})

test('a stem never catches a word from another theme by accident', () => {
  assert.deepEqual(themesOf(['el monopatín']), ['cuerpo'])
  assert.deepEqual(themesOf(['el mono', 'los monos']), ['animales'])
  assert.deepEqual(themesOf(['el pañuelo']), [])
  assert.deepEqual(themesOf(['la banana']), [])
})

test('every theme has a key, a label, and at least one stem, and the keys are unique', () => {
  assert.equal(new Set(THEME_KEYS).size, THEMES.length)
  for (const theme of THEMES) {
    assert.match(theme.key, /^[a-z]+$/)
    assert.ok(theme.label)
    assert.ok(theme.stems.length > 0)
  }
})
