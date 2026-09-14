/**
 * The API's configuration, read from the environment once at startup.
 * Anything missing or malformed stops the process with a message saying what
 * to set, instead of failing later on a request.
 */

const LOCAL_DATABASE_URL = 'postgres://juguemos:juguemos@localhost:5432/juguemos'

/**
 * @typedef {object} AuthConfig
 * @property {string} url the public origin the app is served from
 * @property {string} secret signs sessions; at least 32 characters
 * @property {Set<string>} signupEmails who may create an account, lowercased; empty means nobody
 */

/**
 * @typedef {object} LlmConfig
 * @property {string | null} apiKey the opencode gateway's key; without it stories come from templates
 * @property {string} baseUrl
 * @property {string} model
 */

/**
 * @typedef {object} Config
 * @property {number} port
 * @property {string} databaseUrl
 * @property {AuthConfig} auth
 * @property {LlmConfig} llm
 */

export class ConfigError extends Error {}

/** The one setting the migrations need. @param {NodeJS.ProcessEnv} [env] */
export function loadDatabaseUrl(env = process.env) {
  return env.DATABASE_URL?.trim() || LOCAL_DATABASE_URL
}

/** @param {NodeJS.ProcessEnv} [env] @returns {Config} */
export function loadConfig(env = process.env) {
  const port = Number(env.PORT ?? 3000)
  if (!Number.isInteger(port) || port <= 0) throw new ConfigError(`PORT must be a port number, not "${env.PORT}"`)

  const url = required(env, 'BETTER_AUTH_URL')
  if (!URL.canParse(url)) throw new ConfigError(`BETTER_AUTH_URL must be a URL, not "${url}"`)

  const secret = required(env, 'BETTER_AUTH_SECRET')
  if (secret.length < 32) {
    throw new ConfigError('BETTER_AUTH_SECRET must be at least 32 characters (openssl rand -base64 32)')
  }

  const baseUrl = (env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/go/v1').trim()
  if (!baseUrl) throw new ConfigError(`OPENCODE_BASE_URL must be a URL, not "${env.OPENCODE_BASE_URL}"`)

  return {
    port,
    databaseUrl: loadDatabaseUrl(env),
    auth: { url, secret, signupEmails: emailSet(env.SIGNUP_EMAILS) },
    llm: {
      apiKey: env.OPENCODE_API_KEY?.trim() || null,
      baseUrl,
      model: (env.OPENCODE_MODEL || 'glm-5.3-flash').trim() || 'glm-5.3-flash',
    },
  }
}

/** @param {NodeJS.ProcessEnv} env @param {string} name */
function required(env, name) {
  const value = env[name]?.trim()
  if (!value) throw new ConfigError(`${name} is not set`)
  return value
}

/** @param {string} [list] comma-separated */
function emailSet(list = '') {
  return new Set(
    list
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}
