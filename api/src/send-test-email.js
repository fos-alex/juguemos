import { ConfigError, loadConfig } from './config.js'
import { createMailer } from './email/mailer.js'
import { UpstreamError } from './errors.js'

// Sends one email, to check the SMTP settings and the domain's DNS records:
// `npm run email:test -w api -- you@example.com`, or on the droplet
// `docker compose exec api node api/src/send-test-email.js you@example.com`.
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

try {
  await mailer.send({
    to,
    subject: 'Ludi: correo de prueba',
    text: 'Si te llegó este correo, Ludi ya puede enviar correos.',
  })
} catch (error) {
  if (!(error instanceof UpstreamError)) throw error
  // EAUTH is a wrong SMTP_USER or SMTP_PASSWORD; a refused sender is usually a
  // domain the service hasn't verified yet.
  console.error(`Not sent. ${error.message}`)
  process.exit(1)
}
console.log(`Sent from ${config.email.from} through ${config.email.host}:${config.email.port}`)
