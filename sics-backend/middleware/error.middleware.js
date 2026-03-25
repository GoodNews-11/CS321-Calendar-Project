const { NODE_ENV } = require('../config/env');

const errorMiddleware = (err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorMiddleware;