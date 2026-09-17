import { ConfigError, loadConfig } from './config.js'
import { invitationEmail } from './invitations/invitation-email.js'
import { createMailer } from './email/mailer.js'
import { UpstreamError } from './errors.js'

// Sends one email, to check the SMTP settings, the domain's DNS records, and
// how the branded template looks in a real inbox:
// `npm run email:test -w api -- you@example.com`, or on the droplet
// `docker compose exec api node api/src/send-test-email.js you@example.com`.
// It is the invitation email with a link that leads nowhere, so nobody is
// invited by running it.
const to = process.argv[2]
if (!to) {
  console.error('Usage: node src/send-test-email.js you@example.com')
  process.exit(1)
}

let config
try {
  config = loadConfig()
} catch (error) {
  if (!(error instanceof ConfigError)) throw error
  console.error(`Configuration error: ${error.message}`)
  process.exit(1)
}

const mailer = createMailer({ config: config.email })
if (!mailer) {
  console.error('Email is off: set SMTP_HOST, and the other SMTP settings in .env.example')
  process.exit(1)
}

const DAY_MS = 24 * 60 * 60 * 1000

try {
  await mailer.send(
    invitationEmail({
      to,
      link: new URL('/invitacion?token=correo-de-prueba&email=prueba', config.auth.url).href,
      expiresAt: new Date(Date.now() + 14 * DAY_MS),
    }),
  )
} catch (error) {
  if (!(error instanceof UpstreamError)) throw error
  // EAUTH is a wrong SMTP_USER or SMTP_PASSWORD; a refused sender is usually a
  // domain the service hasn't verified yet.
  console.error(`Not sent. ${error.message}`)
  process.exit(1)
}
console.log(`Sent from ${config.email.from} through ${config.email.host}:${config.email.port}`)
