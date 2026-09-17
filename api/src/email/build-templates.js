/**
 * Compiles the email templates: every `src/email/templates/*.mjml` becomes the
 * `.html` beside it, which is what the API sends. Run it after editing a
 * template, and commit both files:
 *
 *   npm run email:build -w api
 *
 * MJML is a dev dependency and the production image installs none, so nothing
 * at runtime compiles a template, the same way web/public's PNGs are rendered
 * from the SVGs and committed. `test/unit/email.test.js` fails when a
 * committed HTML file no longer matches its MJML.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import mjml2html from 'mjml'

export const TEMPLATES_DIR = fileURLToPath(new URL('./templates', import.meta.url))

/** The note for whoever opens the generated file. @param {string} name */
const generatedFrom = (name) => `<!-- Generated from ${name} by \`npm run email:build -w api\`. Edit the MJML, not this file. -->`

/** The templates, without the partials they are built from. */
export const templateNames = () =>
  readdirSync(TEMPLATES_DIR)
    .filter((file) => file.endsWith('.mjml'))
    .map((file) => file.replace('.mjml', ''))

/**
 * The HTML one template compiles to right now, with the generated note under
 * the doctype so the note can't come before it.
 * @param {string} name
 * @returns {Promise<string>}
 */
export async function compileTemplate(name) {
  const filePath = `${TEMPLATES_DIR}/${name}.mjml`
  // MJML 5 ignores <mj-include> unless asked, and only reads partials under
  // the template's own folder.
  const { html, errors } = await mjml2html(readFileSync(filePath, 'utf8'), {
    filePath,
    ignoreIncludes: false,
    validationLevel: 'strict',
  })
  if (errors.length > 0) throw new Error(`${name}.mjml: ${errors.map(({ formattedMessage }) => formattedMessage).join('; ')}`)
  const [doctype, ...rest] = html.split('\n')
  return [doctype, generatedFrom(`${name}.mjml`), ...rest].join('\n')
}

/** @param {(message: string) => void} [log] */
export async function buildTemplates(log = () => {}) {
  for (const name of templateNames()) {
    writeFileSync(`${TEMPLATES_DIR}/${name}.html`, await compileTemplate(name))
    log(`Built ${name}.html`)
  }
}
