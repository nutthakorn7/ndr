const express = require('express');
const Joi = require('joi');
const { logger } = require('../utils/logger');
const kafkaProducer = require('../services/kafka');
const { validateLog } = require('../middleware/validation');
const { rateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const MAX_LOG_SIZE_BYTES = parseInt(process.env.MAX_LOG_SIZE_BYTES || (1024 * 1024), 10);
const validationOptions = {
  allowUnknown: true,
  stripUnknown: false
};

const logSchema = Joi.object({
  timestamp: Joi.string().isoDate().required(),
  source: Joi.object({
    ip: Joi.string().ip(),
    hostname: Joi.string(),
    port: Joi.number().port()
  }),
  destination: Joi.object({
    ip: Joi.string().ip(),
    hostname: Joi.string(),
    port: Joi.number().port()
  }),
  event: Joi.object({
    type: Joi.string().required(),
    category: Joi.string(),
    action: Joi.string(),
    outcome: Joi.string()
  }),
  zeek_log_type: Joi.string(),
  zeek: Joi.object().unknown(true),
  suricata_event_type: Joi.string(),
  suricata: Joi.object().unknown(true),
  message: Joi.string(),
  raw_log: Joi.string(),
  tenant_id: Joi.string().default('default')
}).or('event', 'zeek_log_type', 'suricata_event_type');

router.post('/logs', rateLimiter, validateLog(logSchema), async (req, res) => {
  try {
    const logData = req.body;
    
    const enrichedLog = {
      ...logData,
      '@timestamp': new Date().toISOString(),
      ingestion_timestamp: new Date().toISOString(),
      source_service: 'ingestion-gateway'
    };

    await kafkaProducer.send({
      topic: 'raw-logs',
      messages: [{
        key: logData.tenant_id || 'default',
        value: JSON.stringify(enrichedLog),
        headers: {
          'content-type': 'application/json',
          'source': 'ingestion-gateway'
        }
      }]
    });

    logger.info('Log ingested successfully', { 
      tenant_id: logData.tenant_id,
      event_type: logData.event?.type || logData.zeek_log_type || logData.suricata_event_type
    });

    res.status(202).json({ 
      status: 'accepted',
      message: 'Log queued for processing' 
    });

  } catch (error) {
    logger.error('Log ingestion failed:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to process log data' 
    });
  }
});

router.post('/logs/batch', rateLimiter, async (req, res) => {
  try {
    const { logs } = req.body;
    
    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'logs must be a non-empty array' 
      });
    }

    if (logs.length > 1000) {
      return res.status(400).json({ 
        error: 'Batch too large',
        message: 'Maximum 1000 logs per batch' 
      });
    }

    const validatedLogs = [];
    for (let i = 0; i < logs.length; i++) {
      const { error, value } = logSchema.validate(logs[i], validationOptions);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          index: i,
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }

      const logSize = Buffer.byteLength(JSON.stringify(value), 'utf8');
      if (logSize > MAX_LOG_SIZE_BYTES) {
        return res.status(413).json({
          error: 'Log too large',
          index: i,
          message: `Each log must be <= ${MAX_LOG_SIZE_BYTES} bytes`
        });
      }

      validatedLogs.push(value);
    }

    const messages = validatedLogs.map(log => ({
      key: log.tenant_id || 'default',
      value: JSON.stringify({
        ...log,
        '@timestamp': new Date().toISOString(),
        ingestion_timestamp: new Date().toISOString(),
        source_service: 'ingestion-gateway'
      }),
      headers: {
        'content-type': 'application/json',
        'source': 'ingestion-gateway'
      }
    }));

    await kafkaProducer.send({
      topic: 'raw-logs',
      messages
    });

    logger.info('Batch logs ingested successfully', { 
      count: logs.length 
    });

    res.status(202).json({ 
      status: 'accepted',
      message: `${logs.length} logs queued for processing` 
    });

  } catch (error) {
    logger.error('Batch log ingestion failed:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to process batch logs' 
    });
  }
});

module.exports = router;
