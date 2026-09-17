import { errorBody } from '../http/schemas.js'

/** @typedef {ReturnType<typeof import('./invitations.controller.js').createInvitationsController>} InvitationsController */

const email = { type: 'string', format: 'email', maxLength: 254 }

// The link's token and email, sent in a body so neither lands in a request log.
const link = {
  type: 'object',
  additionalProperties: false,
  required: ['token', 'email'],
  properties: { token: { type: 'string', minLength: 1, maxLength: 128 }, email: { type: 'string', minLength: 1, maxLength: 254 } },
}

const checked = {
  type: 'object',
  required: ['email', 'registered'],
  properties: { email: { type: 'string' }, registered: { type: 'boolean' } },
}

const invitation = {
  type: 'object',
  required: ['id', 'email', 'status', 'sentAt', 'expiresAt'],
  properties: {
    id: { type: 'string' },
    email: { type: 'string' },
    status: { type: 'string', enum: ['pending', 'expired', 'accepted'] },
    sentAt: { type: 'string', format: 'date-time' },
    expiresAt: { type: 'string', format: 'date-time' },
  },
}

const usersPage = {
  type: 'object',
  required: ['users', 'invitations'],
  properties: {
    users: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'name', 'email', 'createdAt'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    invitations: { type: 'array', items: invitation },
  },
}

/**
 * The landing screen's check of an invitation link. Public: whoever opens the
 * link has no account yet.
 * @param {import('fastify').FastifyInstance} app
 * @param {{ controller: InvitationsController }} options
 */
export async function invitationsRoutes(app, { controller }) {
  app.post(
    '/invitations/check',
    {
      config: { access: 'public' },
      schema: { body: link, response: { 200: checked, 400: errorBody, 404: errorBody, 500: errorBody } },
    },
    controller.check,
  )
}

/**
 * The admin's Usuarios page. The admin has no login yet, so these routes are
 * public, and app.js registers them only when ADMIN_ENABLED turns the admin on.
 * @param {import('fastify').FastifyInstance} app
 * @param {{ controller: InvitationsController }} options
 */
export async function adminUsersRoutes(app, { controller }) {
  const config = { access: 'public' }
  app.get('/admin/users', { config, schema: { response: { 200: usersPage, 500: errorBody } } }, controller.users)
  // 409 for an email that already has an account, 503 when email is off.
  app.post(
    '/admin/invitations',
    {
      config,
      schema: {
        body: { type: 'object', additionalProperties: false, required: ['email'], properties: { email } },
        response: { 201: invitation, 400: errorBody, 409: errorBody, 500: errorBody, 503: errorBody },
      },
    },
    controller.invite,
  )
}
