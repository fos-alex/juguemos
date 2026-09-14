/**
 * The LLM Juguemos talks to: OpenCode Go, an OpenAI-compatible gateway the
 * self-hosted `opencode` account fronts. Server-side only; the browser never
 * sees the key. Without a key there is no client and stories fall back to the
 * seeded templates.
 *
 * The gateway asks two things of its clients (opencode.ai/docs/go): identify
 * with our own user agent, and send a stable `x-opencode-session` id per
 * conversation so requests route and cache well. Each generation is its own
 * conversation, so each call makes its own id.
 */
import { randomUUID } from 'node:crypto'
import { AppError } from '../errors.js'

/**
 * @typedef {object} LlmConfig
 * @property {string | null} apiKey no key, no LLM: template stories only
 * @property {string} baseUrl required when apiKey is set
 * @property {string} model required when apiKey is set
 */

/** @typedef {object} LlmCall @property {string} system @property {string} user */
/**
 * @typedef {object} Llm
 * @property {(call: LlmCall & { signal?: AbortSignal }) => AsyncGenerator<string>} stream
 */

const USER_AGENT = 'juguemos-api/0.1'

/**
 * @param {{ config: LlmConfig }} deps
 * @returns {Llm | null} null when no key is configured
 */
export function createOpenCodeLlm({ config }) {
  const apiKey = config.apiKey?.trim()
  if (!apiKey) return null
  if (!config.baseUrl) throw new Error('llm.baseUrl is required when a key is configured')
  if (!config.model) throw new Error('llm.model is required when a key is configured')
  const baseUrl = config.baseUrl.replace(/\/$/, '')

  return {
    /**
     * The model's answer, piece by piece. Errors from the gateway throw as
     * `UpstreamError`, so the client never sees them and the log has them.
     * @param {LlmCall & { signal?: AbortSignal }} call
     */
    async *stream({ system, user, signal }) {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT,
          'x-opencode-session': `juguemos-${randomUUID()}`,
        },
        body: JSON.stringify({
          model: config.model,
          stream: true,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      }).catch((error) => {
        throw new UpstreamError(`The story model is unreachable: ${error.message}`)
      })
      if (!response.ok || !response.body) {
        throw new UpstreamError(`The story model answered HTTP ${response.status}`)
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
          const delta = /** @type {{ choices?: { delta?: { content?: string } }[] }} */ (readJson(data))
          const text = delta?.choices?.[0]?.delta?.content
          if (text) yield text
        }
      }
    },
  }
}

/** @param {string} data */
function readJson(data) {
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

/** The LLM gateway failed, in a way the parent can only retry. */
export class UpstreamError extends AppError {
  /** @param {string} message */
  constructor(message) {
    super(message, 502)
  }
}
