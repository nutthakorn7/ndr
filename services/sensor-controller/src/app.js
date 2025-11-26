const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const pino = require('pino');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const logger = pino({ transport: { target: 'pino-pretty' } });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/security_analytics'
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sensors (
      id TEXT PRIMARY KEY,
      name TEXT,
      location TEXT,
      tenant_id TEXT DEFAULT 'default',
      status TEXT DEFAULT 'new',
      last_heartbeat TIMESTAMPTZ,
      last_metrics JSONB,
      config JSONB,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
}

initSchema().then(() => logger.info('Sensor table ensured')).catch((err) => {
  logger.error({ err }, 'Failed to initialize schema');
  process.exit(1);
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

app.get('/sensors', async (req, res) => {
  const result = await pool.query('SELECT * FROM sensors ORDER BY updated_at DESC');
  res.json({ sensors: result.rows });
});

app.post('/sensors/register', async (req, res) => {
  const { id, name, location, tenant_id, metadata, config } = req.body;

  const sensorId = id || uuidv4();
  const now = new Date();

  await pool.query(
    `INSERT INTO sensors (id, name, location, tenant_id, metadata, config, status, last_heartbeat, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, 'registered', $7, $7)
     ON CONFLICT (id) DO UPDATE SET
       name = COALESCE(EXCLUDED.name, sensors.name),
       location = COALESCE(EXCLUDED.location, sensors.location),
       tenant_id = COALESCE(EXCLUDED.tenant_id, sensors.tenant_id),
       metadata = COALESCE(EXCLUDED.metadata, sensors.metadata),
       config = COALESCE(EXCLUDED.config, sensors.config),
       status = 'registered',
       updated_at = EXCLUDED.updated_at`,
    [sensorId, name, location, tenant_id || 'default', JSON.stringify(metadata || {}), JSON.stringify(config || {}), now]
  );

  const { rows } = await pool.query('SELECT * FROM sensors WHERE id = $1', [sensorId]);
  res.status(201).json({ sensor: rows[0] });
});

app.post('/sensors/:id/heartbeat', async (req, res) => {
  const sensorId = req.params.id;
  const { status, metrics } = req.body;
  const now = new Date();

  const result = await pool.query(
    `UPDATE sensors SET last_heartbeat = $2, status = $3, last_metrics = $4::jsonb, updated_at = $2 WHERE id = $1 RETURNING *`,
    [sensorId, now, status || 'online', JSON.stringify(metrics || {})]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'sensor not found' });
  }

  res.json({ sensor: result.rows[0] });
});

app.get('/sensors/:id/config', async (req, res) => {
  const sensorId = req.params.id;
  const result = await pool.query('SELECT id, config, tenant_id FROM sensors WHERE id = $1', [sensorId]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'sensor not found' });
  }

  const sensor = result.rows[0];
  res.json({
    id: sensor.id,
    tenant_id: sensor.tenant_id,
    config: sensor.config || {}
  });
});

const PORT = process.env.PORT || 8084;
app.listen(PORT, () => {
  logger.info(`Sensor Controller listening on port ${PORT}`);
});
