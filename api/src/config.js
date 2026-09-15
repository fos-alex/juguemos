/**
 * The API's configuration, read from the environment once at startup.
 * Anything missing or malformed stops the process with a message saying what
 * to set, instead of failing later on a request.
 */

const LOCAL_DATABASE_URL = 'postgres://juguemos:juguemos@localhost:5432/juguemos'

/**
 * The LLM providers stories can use: the setting that holds each one's key,
 * its API, and its default model. OpenRouter has no default, since its model
 * ids name the upstream lab and change often.
 */
const LLM_PROVIDERS = {
  opencode: { keyVar: 'OPENCODE_API_KEY', baseUrl: 'https://opencode.ai/zen/go/v1', model: 'glm-5.3-flash' },
  openrouter: { keyVar: 'OPENROUTER_API_KEY', baseUrl: 'https://openrouter.ai/api/v1', model: '' },
}

/**
 * @typedef {object} AuthConfig
 * @property {string} url the public origin the app is served from
 * @property {string} secret signs sessions; at least 32 characters
 * @property {Set<string>} signupEmails who may create an account, lowercased; empty means nobody
 */

/**
 * @typedef {object} LlmConfig
 * @property {'opencode' | 'openrouter'} provider which LLM writes the stories
 * @property {string | null} apiKey the chosen provider's key; without it stories come from templates
 * @property {string} baseUrl
 * @property {string} model as the provider names it
 * @property {string} appUrl the public origin, which OpenRouter records as the app's URL
 */

/**
 * @typedef {object} Config
 * @property {number} port
 * @property {string} databaseUrl
 * @property {AuthConfig} auth
 * @property {LlmConfig} llm
 * @property {{ enabled: boolean }} admin the catalog admin, which has no login yet
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

  return {
    port,
    databaseUrl: loadDatabaseUrl(env),
    auth: { url, secret, signupEmails: emailSet(env.SIGNUP_EMAILS) },
    llm: loadLlm(env, url),
    admin: { enabled: flag(env, 'ADMIN_ENABLED') },
  }
}

/**
 * Which provider writes the stories, with which key and model. LLM_PROVIDER
 * defaults to OpenCode. The model comes from LLM_MODEL; OPENCODE_MODEL is its
 * old name and is still read for OpenCode.
 * @param {NodeJS.ProcessEnv} env
 * @param {string} appUrl
 * @returns {LlmConfig}
 */
function loadLlm(env, appUrl) {
  const name = env.LLM_PROVIDER?.trim().toLowerCase() || 'opencode'
  if (!Object.hasOwn(LLM_PROVIDERS, name)) {
    throw new ConfigError(`LLM_PROVIDER must be opencode or openrouter, not "${env.LLM_PROVIDER}"`)
  }
  const provider = /** @type {keyof typeof LLM_PROVIDERS} */ (name)
  const { keyVar, baseUrl, model: defaultModel } = LLM_PROVIDERS[provider]
  const apiKey = env[keyVar]?.trim() || null
  const oldModel = provider === 'opencode' ? env.OPENCODE_MODEL?.trim() : ''
  const model = env.LLM_MODEL?.trim() || oldModel || defaultModel
  if (apiKey && !model) {
    throw new ConfigError(`LLM_MODEL is not set, and ${provider} has no default model. Set it to a model id from openrouter.ai/models`)
  }
  return { provider, apiKey, baseUrl, model, appUrl }
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
