/**
 * The account form's logic, with no React: what each field needs before the
 * API is asked, and handing the browser the credentials to save.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * The form's own checks, worded under each field. Creating an account needs a
 * name and at least 8 characters; signing in needs only some password.
 * @param {{ signingIn: boolean, name: string, email: string, password: string }} form
 * @returns {Record<string, string>} each failing field's words, in the form's order
 */
export function checkAccount({ signingIn, name, email, password }) {
  /** @type {Record<string, string>} */
  const found = {}
  if (!signingIn && !name.trim()) found.name = 'Contanos cómo te llamás.'
  if (!EMAIL.test(email.trim())) found.email = 'Revisá el email: parece que le falta algo.'
  if (signingIn && !password) found.password = 'Escribí tu contraseña.'
  if (!signingIn && password.length < 8) found.password = 'Tiene que tener al menos 8 caracteres.'
  return found
}

/**
 * Hands the browser the email and password that just worked, so it offers to
 * save them. The form never reloads the page, which some browsers don't read
 * as a sign-in; where the Credential Management API exists (Chrome, Edge,
 * Android) this asks for the save prompt directly. Elsewhere the browser
 * relies on the fields' autocomplete hints and the form leaving the page.
 * @param {{ email: string, password: string, name: string }} credentials
 */
export function offerToSave({ email, password, name }) {
  if (!('PasswordCredential' in window)) return
  const credential = new window.PasswordCredential({ id: email, password, name })
  navigator.credentials.store(credential).catch(() => {})
}
