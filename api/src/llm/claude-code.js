/**
 * Claude Code as the story model (JUG-168). Each call runs the `claude` CLI
 * once in print mode and streams the text of its answer. `client.js` has
 * already wrapped the prompts in the guardrails; this file only runs them.
 *
 * The CLI runs as a plain model: no tools, MCP servers, settings files,
 * CLAUDE.md, skills, or saved sessions, in an empty folder of its own that is
 * removed afterwards. Its environment holds its token and nothing else from
 * the API's, so the database URL and the auth secret never reach it. The
 * system prompt goes in a file and the user prompt through stdin, so neither
 * shows in the process list.
 */
import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { UpstreamError } from '../errors.js'
import { jsonIn } from './prompt.js'

/** @typedef {import('../config.js').LlmConfig} LlmConfig */
/** @typedef {import('./client.js').GuardedCall} GuardedCall */
/**
 * The events of the CLI's stream-json output this file reads: a piece of the
 * answer, and the result that ends the run.
 * @typedef {{
 *   type?: string,
 *   event?: { type?: string, delta?: { type?: string, text?: string } },
 *   is_error?: boolean,
 *   result?: string,
 *   api_error_status?: number | null,
 *   terminal_reason?: string,
 * }} CliEvent
 */

const FLAGS = [
  '--print',
  '--safe-mode',
  '--output-format', 'stream-json',
  '--verbose',
  '--include-partial-messages',
  '--tools', '',
  '--strict-mcp-config',
  '--setting-sources', '',
  '--disable-slash-commands',
  '--no-session-persistence',
]

/**
 * @param {LlmConfig} config
 * @param {string} token a Claude Code OAuth token, from `claude setup-token`
 * @returns {(call: GuardedCall) => AsyncGenerator<string>}
 */
export function claudeCode(config, token) {
  const command = config.command || 'claude'

  return async function* send({ system, user, maxTokens, reasoning, signal }) {
    const folder = await mkdtemp(join(tmpdir(), 'ludi-claude-'))
    /** @type {import('node:child_process').ChildProcessWithoutNullStreams | undefined} */
    let child
    try {
      const systemFile = join(folder, 'system.txt')
      await writeFile(systemFile, system, { mode: 0o600 })

      child = spawn(command, [...FLAGS, '--model', config.model, '--system-prompt-file', systemFile], {
        cwd: folder,
        signal,
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          CLAUDE_CODE_OAUTH_TOKEN: token,
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
          DISABLE_AUTOUPDATER: '1',
          ...(maxTokens ? { CLAUDE_CODE_MAX_OUTPUT_TOKENS: String(maxTokens) } : {}),
          // The CLI has no flag for it; no thinking budget means no thinking.
          ...(reasoning === false ? { MAX_THINKING_TOKENS: '0' } : {}),
        },
      })

      /** @type {Error | undefined} */
      let failure
      let stderr = ''
      const exited = new Promise((resolve) => {
        child?.once('error', (error) => {
          failure = error
          resolve(null)
        })
        child?.once('close', resolve)
      })
      child.stderr.on('data', (chunk) => {
        if (stderr.length < 2000) stderr += chunk
      })
      // A CLI that exits before reading its prompt would otherwise crash the API with EPIPE.
      child.stdin.on('error', () => {})
      child.stdin.end(user)

      let ended = false
      for await (const line of createInterface({ input: child.stdout })) {
        const event = /** @type {CliEvent | null} */ (jsonIn(line))
        if (event?.type === 'stream_event' && event.event?.type === 'content_block_delta') {
          const { delta } = event.event
          if (delta?.type === 'text_delta' && delta.text) yield delta.text
        } else if (event?.type === 'result') {
          ended = true
          if (event.is_error) {
            const status = event.api_error_status ? ` (HTTP ${event.api_error_status})` : ''
            throw new UpstreamError(`The story model failed${status}: ${String(event.result ?? event.terminal_reason).slice(0, 300)}`)
          }
        }
      }

      const code = await exited
      signal?.throwIfAborted()
      if (failure) throw new UpstreamError(`The story model's CLI didn't run: ${failure.message}`)
      if (!ended || code !== 0) {
        throw new UpstreamError(`The story model's CLI exited with code ${code}: ${stderr.trim().slice(0, 300)}`)
      }
    } finally {
      // A reader that stops early leaves the CLI running.
      if (child && child.exitCode === null && child.signalCode === null) child.kill()
      await rm(folder, { recursive: true, force: true })
    }
  }
}
