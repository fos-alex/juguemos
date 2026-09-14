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
 * @param {{ controller: AccountsController, requireSession: import('fastify').preHandlerAsyncHookHandler }} options
 */
export async function accountsRoutes(app, { controller, requireSession }) {
  app.get('/me', { preHandler: requireSession, schema: { response: { 200: meResponse } } }, controller.me)
}
