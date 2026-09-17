/**
 * Email, sent through an SMTP service (JUG-169). Resend to start; any service
 * works, chosen with the SMTP settings in config.js. Server-side only.
 *
 * An email carries a parent's address and what the message says, so neither
 * is logged or put in an error message.
 */
import { createTransport } from 'nodemailer'
import { UpstreamError } from '../errors.js'

/** @typedef {import('../config.js').EmailConfig} EmailConfig */
/**
 * @typedef {object} Email
 * @property {string} to one address
 * @property {string} subject
 * @property {string} text the plain-text body, which every email has
 * @property {string} [html] the same message as HTML, for clients that show it
 */
/**
 * @typedef {object} Mailer
 * @property {(email: Email) => Promise<void>} send
 */
/**
 * @typedef {object} Transport what the mailer hands a message to: nodemailer's SMTP transport, or a test's own
 * @property {(message: { from: string } & Email) => Promise<unknown>} sendMail
 */

/** The ports where TLS starts with the connection. Every other port upgrades with STARTTLS. */
const TLS_PORTS = new Set([465, 2465])

/** How long to wait on the service, instead of nodemailer's minutes, since a request may be waiting too. */
const TIMEOUT_MS = 15_000

/**
 * nodemailer's SMTP options for the settings. Nothing is sent in plain text: a
 * port that doesn't start with TLS must upgrade to it, or the email fails.
 * @param {EmailConfig} config
 */
export function smtpOptions({ host, port, user, password }) {
  const secure = TLS_PORTS.has(port)
  return {
    host: host ?? undefined,
    port,
    secure,
    requireTLS: !secure,
    auth: user && password ? { user, pass: password } : undefined,
    connectionTimeout: TIMEOUT_MS,
    greetingTimeout: TIMEOUT_MS,
    socketTimeout: TIMEOUT_MS,
  }
}

/**
 * @param {{ config: EmailConfig, transport?: Transport }} deps `transport`
 *   replaces the SMTP connection, so tests can see what would be sent
 * @returns {Mailer | null} null when no service is configured
 */
export function createMailer({ config, transport }) {
  if (!config.host) return null
  const smtp = transport ?? createTransport(smtpOptions(config))

  return {
    async send({ to, subject, text, html }) {
      try {
        await smtp.sendMail({ from: config.from, to, subject, text, html })
      } catch (error) {
        // nodemailer's message and the server's reply can quote the address,
        // so only the codes go into the error.
        const { code, responseCode } = /** @type {{ code?: string, responseCode?: number }} */ (error)
        throw new UpstreamError(`The email service failed: ${code ?? 'no code'}${responseCode ? `, SMTP ${responseCode}` : ''}`)
      }
    },
  }
}
