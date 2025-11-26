const client = require('prom-client');

const register = new client.Registry();

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const logsIngestedTotal = new client.Counter({
  name: 'logs_ingested_total',
  help: 'Total number of logs ingested',
  labelNames: ['tenant_id', 'event_type']
});

const kafkaMessagesProduced = new client.Counter({
  name: 'kafka_messages_produced_total',
  help: 'Total number of messages produced to Kafka',
  labelNames: ['topic']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(logsIngestedTotal);
register.registerMetric(kafkaMessagesProduced);

client.collectDefaultMetrics({ register });

const createPrometheusMetrics = () => {
  return (req, res, next) => {
    if (req.path === '/metrics') {
      res.set('Content-Type', register.contentType);
      return res.end(register.metrics());
    }

    const start = Date.now();
    
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route ? req.route.path : req.path;
      
      httpRequestDuration
        .labels(req.method, route, res.statusCode)
        .observe(duration);
      
      httpRequestsTotal
        .labels(req.method, route, res.statusCode)
        .inc();
    });

    next();
  };
};

module.exports = { 
  createPrometheusMetrics,
  logsIngestedTotal,
  kafkaMessagesProduced
};