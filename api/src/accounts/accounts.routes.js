import { errorBody } from '../http/schemas.js'

/** @typedef {ReturnType<typeof import('./accounts.controller.js').createAccountsController>} AccountsController */

// The response schema is also the allowlist of what leaves the server: fields
// not listed here are never serialized.
const meResponse = {
  type: 'object',
  required: ['user', 'family', 'familyFromText'],
  properties: {
    // Whether first run can start from the parent's own words (JUG-11).
    familyFromText: { type: 'boolean' },
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
  app.get('/me', { schema: { response: { 200: meResponse, 401: errorBody, 500: errorBody } } }, controller.me)
}

/**
 * Removing an account from the admin's Usuarios page (JUG-175). The admin has
 * no login yet, so this is public, and app.js registers it only when
 * ADMIN_ENABLED turns the admin on.
 * @param {import('fastify').FastifyInstance} app
 * @param {{ controller: AccountsController }} options
 */
export async function adminAccountsRoutes(app, { controller }) {
  app.delete(
    '/admin/users/:id',
    {
      config: { access: 'public' },
      schema: {
        params: { type: 'object', required: ['id'], properties: { id: { type: 'string', maxLength: 64 } } },
        // 404 for an account that is already gone.
        response: { 404: errorBody, 500: errorBody },
      },
    },
    controller.remove,
  )
}
