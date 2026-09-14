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
 * @typedef {object} SttConfig
 * @property {string | null} url an OpenAI-compatible transcriptions API, up to its /v1; without it voice notes are off
 * @property {string} model as the service names it
 * @property {string | null} apiKey for a hosted service; the self-hosted one needs none
 */

/**
 * @typedef {object} Config
 * @property {number} port
 * @property {string} databaseUrl
 * @property {AuthConfig} auth
 * @property {LlmConfig} llm
 * @property {SttConfig} stt speech to text, for voice notes
 * @property {{ enabled: boolean }} admin the catalog admin, which has no login yet
 */

/** Whisper large-v3-turbo, as the self-hosted speaches server names it. */
export const DEFAULT_STT_MODEL = 'deepdml/faster-whisper-large-v3-turbo-ct2'

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
    stt: loadStt(env),
    admin: { enabled: flag(env, 'ADMIN_ENABLED') },
  }
}

/**
 * The speech-to-text service for voice notes. Compose points STT_URL at its
 * own Whisper server; a hosted service needs its URL, model, and key instead.
 * @param {NodeJS.ProcessEnv} env
 * @returns {SttConfig}
 */
function loadStt(env) {
  const url = env.STT_URL?.trim() || null
  if (url && !URL.canParse(url)) throw new ConfigError(`STT_URL must be a URL, not "${env.STT_URL}"`)
  return { url, model: env.STT_MODEL?.trim() || DEFAULT_STT_MODEL, apiKey: env.STT_API_KEY?.trim() || null }
}

/** A true or false setting, false when unset. @param {NodeJS.ProcessEnv} env @param {string} name */
function flag(env, name) {
  const value = env[name]?.trim().toLowerCase() || 'false'
  if (value !== 'true' && value !== 'false') throw new ConfigError(`${name} must be true or false, not "${env[name]}"`)
  return value === 'true'
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
