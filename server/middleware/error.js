export function notFound(req, res) {
  res.status(404).json({ message: 'Route not found' });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  if (res.headersSent) return next(err);
  if (err?.name === 'ZodError') {
    const message = err.issues?.map((i) => `${i.path?.join('.') || 'field'}: ${i.message}`).join('; ') || 'Invalid request';
    return res.status(400).json({ message });
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern ?? err.keyValue ?? {})[0] ?? 'value';
    return res.status(409).json({ message: `${field} already exists` });
  }
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  if (err?.name === 'CastError') return res.status(400).json({ message: `Invalid ${err.path || 'identifier'}` });
  res.status(err.status ?? 500).json({ message: err.expose ? err.message : (process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message) });
}
