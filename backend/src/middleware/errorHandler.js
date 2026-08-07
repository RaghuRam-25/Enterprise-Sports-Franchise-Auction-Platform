export const errorHandler = (err, req, res, next) => {
  console.error('[Global Error Handler]:', err);

  // Zod validation failures are CLIENT errors → 400, never 500. The thrown
  // ZodError does not set res.statusCode, which previously defaulted to 500
  // and mis-labelled every malformed create/update payload.
  if (err?.name === 'ZodError') {
    const issue = err.errors?.[0];
    const path = issue?.path?.length ? String(issue.path[issue.path.length - 1]) : 'request';
    const message = issue
      ? `Invalid ${path}: ${issue.message}`
      : 'Validation failed';
    return res.status(400).json({ success: false, message });
  }

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
