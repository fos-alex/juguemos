/**
 * The LLM that writes stories: OpenCode Go or OpenRouter, chosen with
 * LLM_PROVIDER in config.js. Both speak the OpenAI chat completions API, so
 * one client serves both; they differ only in a few headers and, for
 * OpenRouter, a data policy. Server-side only: the browser never sees the key.
 * Without a key there is no client, and stories come from the seeded templates.
 *
 * Every call made here carries the guardrails (JUG-90): this is the one place
 * a request to a model is built, so it is the one place they can't be
 * forgotten.
 */
import { randomUUID } from 'node:crypto'
import { UpstreamError } from '../errors.js'
import { asData, withGuardrails } from './guardrails.js'
import { jsonIn } from './prompt.js'

/** @typedef {import('../config.js').LlmConfig} LlmConfig */
/**
 * @typedef {object} LlmCall
 * @property {string} system
 * @property {string} user
 * @property {string} [data] the family's own words, which go to the model
 *   inside the data block instead of in the instructions, so a text that
 *   reads like an order stays a text (JUG-90)
 * @property {number} [maxTokens] the most tokens the answer may run to; left
 *   out, the provider's own limit applies
 * @property {boolean} [reasoning] false asks a reasoning model to skip its
 *   thinking, on the providers that take the option
 */
/**
 * @typedef {object} Llm
 * @property {(call: LlmCall & { signal?: AbortSignal }) => AsyncGenerator<string>} stream
 */

const USER_AGENT = 'ludi-api/0.1'

/**
 * What each provider needs on top of the chat completions API.
 * - OpenCode Go (opencode.ai/docs/go) asks for a stable `x-opencode-session`
 *   id per conversation. Each generation is its own conversation, so each
 *   call gets a new id.
 * - OpenRouter takes the app's URL and name in `HTTP-Referer` and `X-Title`.
 *   `data_collection: 'deny'` sends a request only to upstream providers that
 *   don't store or train on prompts, because prompts carry the kids' names.
 *   It is also the one that takes `reasoning: { enabled: false }`, which a
 *   short call passes so a reasoning model answers without thinking first.
 * @type {Record<LlmConfig['provider'], (config: LlmConfig, call: { reasoning?: boolean }) => { headers: Record<string, string>, body: object }>}
 */
const PROVIDER_EXTRAS = {
  opencode: () => ({ headers: { 'x-opencode-session': `ludi-${randomUUID()}` }, body: {} }),
  openrouter: (config, { reasoning }) => ({
    headers: { 'HTTP-Referer': config.appUrl, 'X-Title': 'Ludi' },
    body: { provider: { data_collection: 'deny' }, ...(reasoning === false ? { reasoning: { enabled: false } } : {}) },
  }),
}

/**
 * @param {{ config: LlmConfig }} deps
 * @returns {Llm | null} null when the chosen provider has no key
 */
export function createLlm({ config }) {
  const apiKey = config.apiKey?.trim()
  if (!apiKey) return null
  if (!config.baseUrl) throw new Error('llm.baseUrl is required when a key is configured')
  if (!config.model) throw new Error('llm.model is required when a key is configured')
  const baseUrl = config.baseUrl.replace(/\/$/, '')
  const extras = PROVIDER_EXTRAS[config.provider]

  return {
    /**
     * The model's answer, piece by piece. The guardrails wrap the task's
     * system prompt, and the family's words, when the call has any, go after
     * the instructions inside the data block. Errors from the provider throw
     * as `UpstreamError`: the log has the reason, and the client doesn't.
     * @param {LlmCall & { signal?: AbortSignal }} call
     */
    async *stream({ system, user, data, maxTokens, reasoning, signal }) {
      const { headers, body } = extras(config, { reasoning })
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT,
          ...headers,
        },
        body: JSON.stringify({
          model: config.model,
          stream: true,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
          messages: [
            { role: 'system', content: withGuardrails(system) },
            { role: 'user', content: data ? `${user}\n\n${asData(data)}` : user },
          ],
          ...body,
        }),
      }).catch((error) => {
        throw new UpstreamError(`The story model is unreachable: ${error.message}`)
      })
      if (!response.ok || !response.body) {
        const reason = await response.text().catch(() => '')
        throw new UpstreamError(`The story model answered HTTP ${response.status}: ${reason.slice(0, 300)}`)
      }

      const decoder = new TextDecoder()
      let buffer = ''
      for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true })
        let index
        while ((index = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, index).trim()
          buffer = buffer.slice(index + 1)
          const data = line.startsWith('data:') ? line.slice(5).trim() : ''
          if (!data || data === '[DONE]') continue
          const event = /** @type {{ error?: { message?: string }, choices?: { delta?: { content?: string } }[] } | null} */ (
            jsonIn(data)
          )
          // A failure after the stream has started arrives as an event with an error.
          if (event?.error) throw new UpstreamError(`The story model failed: ${event.error.message ?? 'no reason given'}`)
          const text = event?.choices?.[0]?.delta?.content
          if (text) yield text
        }
      }
    },
  }
}
