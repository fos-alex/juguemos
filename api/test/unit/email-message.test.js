import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { invitationEmail } from '../../src/email/invitation-email.js'
import { compileTemplate, TEMPLATES_DIR, templateNames } from '../../src/email/build-templates.js'
import { renderMessage } from '../../src/email/message.js'

/** @param {Partial<Parameters<typeof renderMessage>[0]>} [overrides] */
const message = (overrides) =>
  renderMessage({
    subject: 'Asunto',
    preheader: 'Vista previa',
    heading: 'Hola',
    paragraphs: ['Primero.', 'Segundo.'],
    action: { label: 'Entrar', url: 'https://ludi.ar/invitacion?token=abc&email=ana%40example.com' },
    closing: 'Hasta luego.',
    ...overrides,
  })

test('every committed template is what its MJML compiles to today', async () => {
  for (const name of templateNames()) {
    const committed = readFileSync(`${TEMPLATES_DIR}/${name}.html`, 'utf8')
    assert.equal(committed, await compileTemplate(name), `${name}.html is stale: run npm run email:build -w api`)
  }
})

test('the message carries the brand, the words, and the link, with no placeholder left', () => {
  const { subject, html, text } = message()
  assert.equal(subject, 'Asunto')
  assert.doesNotMatch(html, /{{/)

  // The wordmark, the ronda's three dots, and the footer come from the partials.
  assert.match(html, /Ludi<span/)
  for (const dot of ['#3F7D4F', '#E8C98A', '#6B4EA8']) assert.ok(html.includes(dot), `the ronda keeps ${dot}`)
  assert.match(html, /El coach de juego que conoce a tu familia/)

  assert.match(html, /Vista previa/)
  assert.match(html, /Hola/)
  assert.match(html, /<p>Primero.<\/p>/)
  assert.match(html, /Entrar/)
  assert.match(html, /Hasta luego./)
  // The link is in the button and again as words, for a client that hides buttons.
  assert.equal(html.match(/https:\/\/ludi\.ar\/invitacion\?token=abc&amp;email=ana%40example\.com/g)?.length, 3)

  // The same words as plain text, with the link on its own line and no markup.
  assert.equal(text, 'Hola\n\nPrimero.\n\nSegundo.\n\nhttps://ludi.ar/invitacion?token=abc&email=ana%40example.com\n\nHasta luego.')
})

test('a parent\'s own words cannot become markup', () => {
  const { html, text } = message({
    heading: 'Hola <script>alert(1)</script>',
    paragraphs: ['Ana & Milán dicen "hola"'],
  })
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /&lt;script&gt;/)
  assert.match(html, /Ana &amp; Milán dicen &quot;hola&quot;/)
  // The text body is not markup, so it keeps the words as they were written.
  assert.match(text, /Ana & Milán dicen "hola"/)
})

test('only an http link reaches the button', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,hola', 'no-es-una-url']) {
    assert.throws(() => message({ action: { label: 'Entrar', url } }), /action.url/)
  }
})

test('a message with a part missing refuses to render, and says which', () => {
  assert.throws(() => message({ preheader: '' }), /needs a preheader/)
  assert.throws(() => message({ heading: undefined }), /needs a heading/)
  assert.throws(() => message({ paragraphs: [] }), /needs paragraphs/)
  assert.throws(() => message({ closing: '  ' }), /needs a closing line/)
  assert.throws(() => message({ action: { label: '', url: 'https://ludi.ar' } }), /needs a label/)
})

test('the invitation is one of these messages, with its own words and subject', () => {
  const email = invitationEmail({
    to: 'ana@example.com',
    link: 'https://ludi.ar/invitacion?token=abc&email=ana%40example.com',
    expiresAt: new Date('2026-10-01T15:00:00Z'),
  })
  assert.equal(email.to, 'ana@example.com')
  assert.equal(email.subject, 'Te invitamos a Ludi')
  assert.match(email.text, /1 de octubre/)
  assert.match(email.text, /^https:\/\/ludi\.ar\/invitacion\?token=abc&email=ana%40example\.com$/m)
  assert.match(String(email.html), /Crear mi cuenta/)
})
