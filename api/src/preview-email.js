import { invitationEmail } from './email/invitation-email.js'

// Prints an email as it would go out, to look at it in a browser:
// `npm run email:preview -w api > /tmp/ludi-email.html`. The plain-text body
// goes to stderr, so the HTML on stdout stays a file.
const { subject, text, html } = invitationEmail({
  to: 'invitada@example.com',
  link: 'https://ludi.ar/invitacion?token=un-token-de-ejemplo&email=invitada%40example.com',
  expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
})
console.error(`Asunto: ${subject}\n\n${text}\n`)
console.log(html)
