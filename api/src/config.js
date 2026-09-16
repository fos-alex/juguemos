/**
 * The API's configuration, read from the environment once at startup.
 * Anything missing or malformed stops the process with a message saying what
 * to set, instead of failing later on a request.
 */

const LOCAL_DATABASE_URL = 'postgres://ludi:ludi@localhost:5432/ludi'

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
 * @property {string[]} trustedOrigins other origins the app is also opened from, such as Tailscale's for a phone
 * @property {string} secret signs sessions; at least 32 characters
 * @property {Set<string>} signupEmails who may create an account, lowercased: emails, or `@domain` for every email there; empty means nobody
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
 * @typedef {object} StoriesConfig
 * @property {number} episodesPerSeries how many episodes one story series may hold (JUG-59)
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
 * @property {StoriesConfig} stories
 * @property {SttConfig} stt speech to text, for voice notes
 * @property {{ enabled: boolean }} admin the catalog admin, which has no login yet
 * @property {{ transcripts: boolean }} audit whether parents' own words are kept in audit_transcripts (JUG-116)
 */

/** How many episodes a story series holds before it is finished (JUG-59). */
export const DEFAULT_SERIES_EPISODES = 10

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

  return {
    port,
    databaseUrl: loadDatabaseUrl(env),
    auth: { url, trustedOrigins: originList(env.TRUSTED_ORIGINS), secret, signupEmails: emailSet(env.SIGNUP_EMAILS) },
    llm: loadLlm(env, url),
    stories: { episodesPerSeries: whole(env, 'STORY_SERIES_EPISODES', DEFAULT_SERIES_EPISODES, 2) },
    stt: loadStt(env),
    admin: { enabled: flag(env, 'ADMIN_ENABLED') },
    // Off unless set: the texts hold the family's names.
    audit: { transcripts: flag(env, 'AUDIT_TRANSCRIPTS') },
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

/**
 * A whole-number setting, with the value it keeps when nobody sets it.
 * @param {NodeJS.ProcessEnv} env
 * @param {string} name
 * @param {number} fallback
 * @param {number} least the smallest value that still makes sense
 */
function whole(env, name, fallback, least) {
  const raw = env[name]?.trim()
  if (!raw) return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < least) {
    throw new ConfigError(`${name} must be a whole number of at least ${least}, not "${env[name]}"`)
  }
  return value
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

/**
 * Origins Better Auth accepts besides BETTER_AUTH_URL's. It refuses sign-in
 * and sign-up from any other with "Invalid origin".
 * @param {string} [list] comma-separated URLs; only their origins are kept
 */
function originList(list = '') {
  return list
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (!URL.canParse(entry)) throw new ConfigError(`TRUSTED_ORIGINS must be comma-separated URLs, and "${entry}" isn't one`)
      return new URL(entry).origin
    })
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
