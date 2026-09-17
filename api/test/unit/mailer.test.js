import assert from 'node:assert/strict'
import { createServer } from 'node:net'
import { after, before, test } from 'node:test'
import { ConfigError, DEFAULT_SMTP_PORT, loadConfig } from '../../src/config.js'
import { createMailer, smtpOptions } from '../../src/email/mailer.js'
import { UpstreamError } from '../../src/errors.js'

/** @typedef {import('../../src/config.js').EmailConfig} EmailConfig */

/** @type {EmailConfig} */
const RESEND = { host: 'smtp.resend.com', port: 2465, user: 'resend', password: 're_key', from: 'Ludi <hola@ludi.ar>' }

// An SMTP server that offers no STARTTLS, and records every command it gets.
/** @type {string[]} */
let commands = []
/** @type {import('node:net').Server} */
let server
/** @type {number} */
let port
before(async () => {
  server = createServer((socket) => {
    socket.write('220 fake ESMTP\r\n')
    socket.on('data', (chunk) => {
      for (const line of chunk.toString().split('\r\n').filter(Boolean)) {
        commands.push(line)
        if (/^QUIT/i.test(line)) socket.end('221 bye\r\n')
        else socket.write('250 OK\r\n')
      }
    })
    socket.on('error', () => {})
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(undefined)))
  port = /** @type {import('node:net').AddressInfo} */ (server.address()).port
})
after(() => server.close())

test('without a host there is no mailer', () => {
  assert.equal(createMailer({ config: { ...RESEND, host: null } }), null)
})

test('the message goes out from EMAIL_FROM with the subject and both bodies', async () => {
  /** @type {object[]} */
  const sent = []
  const mailer = createMailer({ config: RESEND, transport: { sendMail: async (message) => sent.push(message) } })

  await mailer?.send({ to: 'ana@example.com', subject: 'Hola', text: 'Texto.', html: '<p>Texto.</p>' })
  assert.deepEqual(sent, [{ from: 'Ludi <hola@ludi.ar>', to: 'ana@example.com', subject: 'Hola', text: 'Texto.', html: '<p>Texto.</p>' }])
})

test('a refused email throws UpstreamError with the codes and without the address', async () => {
  const refusal = Object.assign(new Error("Can't send mail - all recipients were rejected: 550 5.1.1 <ana@example.com>: no such user"), {
    code: 'EENVELOPE',
    responseCode: 550,
  })
  const mailer = createMailer({ config: RESEND, transport: { sendMail: async () => Promise.reject(refusal) } })

  await assert.rejects(
    mailer?.send({ to: 'ana@example.com', subject: 'Hola', text: 'Texto.' }) ?? Promise.resolve(),
    (error) =>
      error instanceof UpstreamError &&
      error.message === 'The email service failed: EENVELOPE, SMTP 550' &&
      !error.message.includes('ana@example.com'),
  )
})

test('TLS from the start on 465 and 2465, and STARTTLS required on every other port', () => {
  assert.deepEqual(
    { ...smtpOptions(RESEND), connectionTimeout: 0, greetingTimeout: 0, socketTimeout: 0 },
    {
      host: 'smtp.resend.com',
      port: 2465,
      secure: true,
      requireTLS: false,
      auth: { user: 'resend', pass: 're_key' },
      connectionTimeout: 0,
      greetingTimeout: 0,
      socketTimeout: 0,
    },
  )
  assert.equal(smtpOptions({ ...RESEND, port: 465 }).secure, true)
  for (const other of [25, 587, 2587]) {
    const options = smtpOptions({ ...RESEND, port: other })
    assert.equal(options.secure, false)
    assert.equal(options.requireTLS, true)
  }
  assert.equal(smtpOptions({ ...RESEND, user: null, password: null }).auth, undefined)
})

test('a service that offers no TLS gets no email', async () => {
  commands = []
  const mailer = createMailer({ config: { ...RESEND, host: '127.0.0.1', port, user: null, password: null } })

  await assert.rejects(
    mailer?.send({ to: 'ana@example.com', subject: 'Hola', text: 'Texto.' }) ?? Promise.resolve(),
    (error) => error instanceof UpstreamError && !error.message.includes('ana@example.com'),
  )
  assert.ok(commands.some((command) => /^EHLO/.test(command)), 'the mailer reached the server')
  assert.ok(!commands.some((command) => /^(MAIL|RCPT|DATA)/.test(command)), `nothing was sent: ${commands.join(', ')}`)
})

const REQUIRED = { BETTER_AUTH_URL: 'https://ludi.local:3000', BETTER_AUTH_SECRET: 'a-secret-that-is-at-least-32-chars' }

test('email settings: off without a host, 2465 by default, and a sender and both credentials when set', () => {
  assert.deepEqual(loadConfig(REQUIRED).email, { host: null, port: DEFAULT_SMTP_PORT, user: null, password: null, from: '' })
  assert.deepEqual(
    loadConfig({
      ...REQUIRED,
      SMTP_HOST: 'smtp.resend.com',
      SMTP_PORT: '2587',
      SMTP_USER: 'resend',
      SMTP_PASSWORD: 're_key',
      EMAIL_FROM: 'Ludi <hola@ludi.ar>',
    }).email,
    { host: 'smtp.resend.com', port: 2587, user: 'resend', password: 're_key', from: 'Ludi <hola@ludi.ar>' },
  )
  assert.throws(
    () => loadConfig({ ...REQUIRED, SMTP_HOST: 'smtp.resend.com' }),
    (error) => error instanceof ConfigError && /EMAIL_FROM is not set/.test(error.message),
  )
  assert.throws(
    () => loadConfig({ ...REQUIRED, SMTP_HOST: 'smtp.resend.com', EMAIL_FROM: 'hola@ludi.ar', SMTP_USER: 'resend' }),
    (error) => error instanceof ConfigError && /SMTP_USER and SMTP_PASSWORD/.test(error.message),
  )
  assert.throws(
    () => loadConfig({ ...REQUIRED, SMTP_PORT: 'dos mil' }),
    (error) => error instanceof ConfigError && /SMTP_PORT must be a whole number/.test(error.message),
  )
})
