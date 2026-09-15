/**
 * The two things every LLM call needs: filling a prompt before it is sent,
 * and reading the JSON that comes back. Both are pure, and both are the only
 * copy: a prompt with an unfilled placeholder is a bug, and a model that
 * answers with prose instead of JSON is normal and returns null.
 */

/** @typedef {Record<string, string>} Values */

/**
 * Fills a prompt's `{{key}}` placeholders. A placeholder with no value throws,
 * so the prompt and the code can't drift apart quietly and no story says
 * "{{kids}}" out loud.
 * @param {string} template
 * @param {Values} values
 * @returns {string}
 */
export function render(template, values) {
  return template.replace(/{{(\w+)}}/g, (_, key) => {
    if (!(key in values)) throw new Error(`No value for the prompt's {{${key}}}`)
    return values[key]
  })
}

/**
 * The JSON inside a model's answer: markdown fences dropped, then the
 * outermost array or object parsed. Null when the answer holds none or what
 * it holds doesn't parse, which the caller decides what to do about.
 * @param {string} answer
 * @returns {any}
 */
export function jsonIn(answer) {
  const cleaned = answer.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const start = cleaned.search(/[[{]/)
  const end = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'))
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    return null
  }
}
