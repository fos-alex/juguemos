/**
 * Errors a service raises when a request can't be done as asked. Each carries
 * the HTTP status the error handler in app.js answers with, so services never
 * touch replies, and optionally a code for clients that need to tell one
 * such answer from another.
 */
export class AppError extends Error {
  /** @param {string} message @param {number} statusCode @param {string} [code] */
  constructor(message, statusCode, code) {
    super(message)
    this.name = new.target.name
    this.statusCode = statusCode
    this.code = code
  }
}

export class ValidationError extends AppError {
  /** @param {string} message @param {string} [code] */
  constructor(message, code) {
    super(message, 400, code)
  }
}

export class NotFoundError extends AppError {
  /** @param {string} message @param {string} [code] */
  constructor(message, code) {
    super(message, 404, code)
  }
}

export class ConflictError extends AppError {
  /** @param {string} message @param {string} [code] */
  constructor(message, code) {
    super(message, 409, code)
  }
}

/** A service the API depends on failed, in a way the parent can only retry. */
export class UpstreamError extends AppError {
  /** @param {string} message */
  constructor(message) {
    super(message, 502)
  }
}

/**
 * A feature this server wasn't configured for, such as stories without an LLM
 * or voice notes without a speech-to-text service. Unlike the other 5xx, its
 * message and code are sent to the client, so the web can say the feature is
 * off instead of failing like a bug.
 */
export class UnavailableError extends AppError {
  /** @param {string} message @param {string} [code] */
  constructor(message, code) {
    super(message, 503, code)
  }
}
