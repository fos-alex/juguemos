/**
 * Every email Ludi sends is this one message (JUG-34): the wordmark, a
 * heading, a few paragraphs, one button, and a quiet line under it. The HTML
 * comes from `templates/message.html`, compiled from `message.mjml` by
 * `npm run email:build -w api`, and the plain-text body is built from the same
 * words, so the two can't say different things.
 *
 * A message carries a family's words and an address, so nothing here is
 * logged, and a failure names the placeholder, never the value.
 */
import { readFileSync } from 'node:fs'

/** @typedef {import('./mailer.js').Email} Email */

/**
 * What an email says. The paragraphs are plain text, one per paragraph, and
 * the action is the one thing the email asks for.
 * @typedef {object} Message
 * @property {string} preheader the line an inbox shows beside the subject
 * @property {string} subject
 * @property {string} heading
 * @property {string[]} paragraphs
 * @property {{ label: string, url: string }} action the button, and the link the plain-text body carries
 * @property {string} closing the quiet line under the button
 */

/** The compiled template, read once. @type {string | null} */
let template = null

const templateHtml = () => (template ??= readFileSync(new URL('./templates/message.html', import.meta.url), 'utf8'))

/**
 * A line the email says, escaped. Every part of a message is required, so a
 * new email can't go out with an empty heading or no closing line; the name is
 * in the failure, never the words.
 * @param {unknown} value
 * @param {string} name
 */
function words(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`The message needs ${name}`)
  return escapeHtml(value)
}

/** @param {string} value */
const escapeHtml = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')

/**
 * A link the template can carry. Only http(s) reaches an href, so a message
 * can never turn into a `javascript:` link.
 * @param {unknown} url
 */
function checkedUrl(url) {
  if (typeof url !== 'string' || !URL.canParse(url)) throw new Error('action.url is not a URL')
  const { protocol } = new URL(url)
  if (protocol !== 'https:' && protocol !== 'http:') throw new Error('action.url must be http or https')
  return escapeHtml(url)
}

/**
 * Fills the template's `{{placeholders}}`, and refuses to send one it has no
 * value for, so a new placeholder can't go out empty.
 * @param {string} html
 * @param {Record<string, string>} values already escaped
 */
const fill = (html, values) =>
  html.replaceAll(/{{(\w+)}}/g, (_match, key) => {
    if (!(key in values)) throw new Error(`The message template has no value for {{${key}}}`)
    return values[key]
  })

/**
 * One email, as HTML and as plain text.
 * @param {Message} message
 * @returns {Omit<Email, 'to'>} everything but the address, which the sender adds
 */
export function renderMessage({ preheader, subject, heading, paragraphs, action, closing }) {
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) throw new Error('The message needs paragraphs')
  const html = fill(templateHtml(), {
    preheader: words(preheader, 'a preheader'),
    heading: words(heading, 'a heading'),
    body: paragraphs.map((paragraph) => `<p>${words(paragraph, 'a paragraph with words in it')}</p>`).join('\n'),
    actionLabel: words(action?.label, 'a label for its button'),
    actionUrl: checkedUrl(action?.url),
    closing: words(closing, 'a closing line'),
  })
  // The same words, for a client that shows no HTML: the link stands on its
  // own line, where the paragraphs have just explained it.
  const text = [heading, ...paragraphs, action.url, closing].join('\n\n')
  return { subject, text, html }
}
