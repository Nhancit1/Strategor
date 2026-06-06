// Typed error + a global handler that mirrors the Spring GlobalExceptionHandler shape.
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Wrap async route handlers so thrown errors hit the error middleware.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500);
  if (status >= 500) console.error('[error]', err);
  const isProd = process.env.NODE_ENV === 'production';
  // Client errors (4xx) carry safe messages; server errors are masked in prod.
  const leakServerError = status >= 500 && isProd;
  res.status(status).json({
    error: leakServerError ? 'InternalError' : err.name || 'Error',
    message: leakServerError ? 'Erreur interne du serveur' : err.message || 'Erreur interne',
    status,
  });
}
