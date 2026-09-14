/** @typedef {ReturnType<typeof import('./accounts.controller.js').createAccountsController>} AccountsController */

// The response schema is also the allowlist of what leaves the server: fields
// not listed here are never serialized.
const meResponse = {
  type: 'object',
  required: ['user', 'family'],
  properties: {
    user: {
      type: 'object',
      required: ['id', 'name', 'email', 'emailVerified'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        emailVerified: { type: 'boolean' },
      },
    },
    family: {
      type: ['object', 'null'],
      required: ['id', 'name'],
      properties: {
        id: { type: 'string' },
        name: { type: ['string', 'null'] },
      },
    },
  },
}

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ controller: AccountsController }} options
 */
export async function accountsRoutes(app, { controller }) {
  app.get('/me', { schema: { response: { 200: meResponse } } }, controller.me)
}
