const { logger } = require('../utils/logger');

const validateLog = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { 
      allowUnknown: true,
      stripUnknown: false 
    });

    if (error) {
      logger.warn('Log validation failed:', { 
        error: error.details,
        body: req.body 
      });
      
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    req.body = value;
    next();
  };
};

module.exports = { validateLog };