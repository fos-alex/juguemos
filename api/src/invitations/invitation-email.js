/**
 * The email that invites someone to Ludi (JUG-34), built from the one branded
 * message in email/message.js. Voice pass pending.
 */
import { renderMessage } from '../email/message.js'

/** @typedef {import('../email/mailer.js').Email} Email */

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
  return {
    to,
    ...renderMessage({
      subject: 'Invitación a Ludi',
      preheader: 'Creá tu cuenta y armemos juegos para tu familia.',
      heading: 'Probá Ludi',
      paragraphs: [
        'Hola! te invitamos a probar Ludi, el coach de juego que conoce a tu familia.',
        `Creá tu cuenta con este email. El enlace funciona hasta el ${until}.`,
      ],
      action: { label: 'Crear mi cuenta', url: link },
      closing: 'Si no esperabas esta invitación, podés ignorar este correo.',
    }),
  }
}
