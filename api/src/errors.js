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
