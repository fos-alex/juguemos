/**
 * The email that invites someone to Ludi (JUG-34), in plain text and in HTML.
 * Voice pass pending.
 */

/** @typedef {import('../email/mailer.js').Email} Email */

/** @param {string} value */
const escapeHtml = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

/**
 * @param {{ to: string, link: string, expiresAt: Date }} invitation
 * @returns {Email}
 */
export function invitationEmail({ to, link, expiresAt }) {
  const until = expiresAt.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  const text = [
    'Hola:',
    'Te invitamos a Ludi, el coach de juego que conoce a tu familia.',
    `Para crear tu cuenta, abrí este enlace antes del ${until}:`,
    link,
    'Si no esperabas esta invitación, podés ignorar este correo.',
  ].join('\n\n')
  const html = [
    '<p>Hola:</p>',
    '<p>Te invitamos a Ludi, el coach de juego que conoce a tu familia.</p>',
    `<p><a href="${escapeHtml(link)}">Crear mi cuenta en Ludi</a></p>`,
    `<p>El enlace funciona hasta el ${until}. Si no esperabas esta invitación, podés ignorar este correo.</p>`,
  ].join('\n')
  return { to, subject: 'Te invitamos a Ludi', text, html }
}
