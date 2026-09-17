import assert from 'node:assert/strict'
import { access, chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import { UpstreamError } from '../../src/errors.js'
import { createLlm } from '../../src/llm/client.js'
import { withGuardrails } from '../../src/llm/guardrails.js'

/**
 * A fake `claude`: it answers with the lines in answer.json, and writes what
 * it got (arguments, folder, environment, stdin, system prompt) to
 * received.json. Its environment is the one the client gives it, so both
 * files sit next to the script instead of being named in a variable.
 */
const FAKE_CLI = `#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
const here = dirname(process.argv[1])
const { lines = [], code = 0, stderr = '', hang = false } = JSON.parse(readFileSync(join(here, 'answer.json'), 'utf8'))
let stdin = ''
for await (const chunk of process.stdin) stdin += chunk
const args = process.argv.slice(2)
const system = readFileSync(args[args.indexOf('--system-prompt-file') + 1], 'utf8')
writeFileSync(join(here, 'received.json'), JSON.stringify({ args, cwd: process.cwd(), env: process.env, stdin, system, pid: process.pid }))
for (const line of lines) process.stdout.write(JSON.stringify(line) + '\\n')
process.stderr.write(stderr)
if (hang) setInterval(() => {}, 1000)
else process.exitCode = code
`

/** @type {string} */
let folder
/** @type {string} */
let command
before(async () => {
  folder = await mkdtemp(join(tmpdir(), 'ludi-fake-claude-'))
  command = join(folder, 'claude.mjs')
  await writeFile(command, FAKE_CLI)
  await chmod(command, 0o755)
})
after(() => rm(folder, { recursive: true, force: true }))

/** @param {object} answer what the fake CLI does next */
const answerWith = (answer) => writeFile(join(folder, 'answer.json'), JSON.stringify(answer))
const received = async () => JSON.parse(await readFile(join(folder, 'received.json'), 'utf8'))

/** @param {string} text */
const piece = (text) => ({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text } } })
const success = { type: 'result', subtype: 'success', is_error: false, result: 'Había una vez' }

/** @param {Partial<import('../../src/config.js').LlmConfig>} [overrides] */
const claudeCode = (overrides) =>
  /** @type {import('../../src/llm/client.js').Llm} */ (
    createLlm({ config: { provider: 'claude-code', apiKey: 'cc-token', baseUrl: '', model: 'sonnet', appUrl: '', command, ...overrides } })
  )

/** @param {import('../../src/llm/client.js').Llm} llm @param {Partial<import('../../src/llm/client.js').LlmCall>} [call] */
async function write(llm, call) {
  let text = ''
  for await (const chunk of llm.stream({ system: 'sistema', user: 'usuario', ...call })) text += chunk
  return text
}

test('Claude Code streams the text of the answer and nothing else', async () => {
  const thinking = { type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'mmm' } } }
  await answerWith({ lines: [{ type: 'system', subtype: 'init' }, thinking, piece('Había '), piece('una vez'), success] })
  assert.equal(await write(claudeCode()), 'Había una vez')
})

test('the CLI gets the model, the guardrails, the family words by stdin, and no tools or settings', async () => {
  await answerWith({ lines: [success] })
  await write(claudeCode(), { data: 'Tenemos a Milán, de dos años.' })

  const { args, system, stdin, cwd } = await received()
  assert.equal(args[args.indexOf('--model') + 1], 'sonnet')
  assert.equal(args[args.indexOf('--tools') + 1], '')
  for (const flag of ['--print', '--safe-mode', '--strict-mcp-config', '--no-session-persistence', '--disable-slash-commands']) {
    assert.ok(args.includes(flag), `${flag} is passed`)
  }
  assert.equal(args[args.indexOf('--setting-sources') + 1], '')
  assert.equal(system, withGuardrails('sistema'))
  assert.equal(stdin, 'usuario\n\n<datos-de-la-familia>\nTenemos a Milán, de dos años.\n</datos-de-la-familia>')
  assert.ok(!args.some((arg) => arg.includes('Milán')), "the family's words stay out of the arguments")
  await assert.rejects(access(cwd), 'the folder it ran in is removed')
})

test("the CLI's environment holds its token and none of the API's settings", async () => {
  process.env.BETTER_AUTH_SECRET = 'a-secret-the-cli-must-not-see'
  try {
    await answerWith({ lines: [success] })
    await write(claudeCode())
    const { env } = await received()
    assert.equal(env.CLAUDE_CODE_OAUTH_TOKEN, 'cc-token')
    assert.equal(env.BETTER_AUTH_SECRET, undefined)
    assert.equal(env.MAX_THINKING_TOKENS, undefined)
    assert.equal(env.CLAUDE_CODE_MAX_OUTPUT_TOKENS, undefined)

    await write(claudeCode(), { maxTokens: 400, reasoning: false })
    const limited = (await received()).env
    assert.equal(limited.CLAUDE_CODE_MAX_OUTPUT_TOKENS, '400')
    assert.equal(limited.MAX_THINKING_TOKENS, '0')
  } finally {
    delete process.env.BETTER_AUTH_SECRET
  }
})

test('a failed run throws UpstreamError with the reason the CLI gives', async () => {
  await answerWith({ lines: [{ type: 'result', is_error: true, api_error_status: 401, result: 'Invalid bearer token' }], code: 1 })
  await assert.rejects(
    write(claudeCode()),
    (error) => error instanceof UpstreamError && /HTTP 401/.test(error.message) && /Invalid bearer token/.test(error.message),
  )
})

test('a CLI that exits without a result throws UpstreamError with its stderr', async () => {
  await answerWith({ lines: [piece('Había ')], code: 2, stderr: 'something broke' })
  await assert.rejects(
    write(claudeCode()),
    (error) => error instanceof UpstreamError && /code 2/.test(error.message) && /something broke/.test(error.message),
  )
})

test('a missing CLI throws UpstreamError', async () => {
  await assert.rejects(
    write(claudeCode({ command: join(folder, 'no-such-claude') })),
    (error) => error instanceof UpstreamError && /Claude Code CLI isn't installed/.test(error.message),
  )
})

test('a reader that stops early stops the CLI', async () => {
  await answerWith({ lines: [piece('Había ')], hang: true })
  for await (const chunk of claudeCode().stream({ system: 'sistema', user: 'usuario' })) {
    assert.equal(chunk, 'Había ')
    break
  }
  const { pid } = await received()
  await new Promise((resolve) => setTimeout(resolve, 100))
  assert.throws(() => process.kill(pid, 0), 'the CLI is gone')
})

test('a reader who leaves stops the CLI', async () => {
  await answerWith({ lines: [piece('Había ')], hang: true })
  const controller = new AbortController()
  await assert.rejects(async () => {
    for await (const chunk of claudeCode().stream({ system: 'sistema', user: 'usuario', signal: controller.signal })) {
      assert.equal(chunk, 'Había ')
      controller.abort()
    }
  })
  const { pid } = await received()
  await new Promise((resolve) => setTimeout(resolve, 100))
  assert.throws(() => process.kill(pid, 0), 'the CLI is gone')
})
