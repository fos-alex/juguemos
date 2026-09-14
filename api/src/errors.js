/**
 * Errors a service raises when a request can't be done as asked. Each carries
 * the HTTP status the error handler in app.js answers with, so services never
 * touch replies.
 */
export class AppError extends Error {
  /** @param {string} message @param {number} statusCode */
  constructor(message, statusCode) {
    super(message)
    this.name = new.target.name
    this.statusCode = statusCode
  }
}

export class ValidationError extends AppError {
  /** @param {string} message */
  constructor(message) {
    super(message, 400)
  }
}

export class NotFoundError extends AppError {
  /** @param {string} message */
  constructor(message) {
    super(message, 404)
  }
}

export class ConflictError extends AppError {
  /** @param {string} message */
  constructor(message) {
    super(message, 409)
  }
}
