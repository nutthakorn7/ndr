const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const forge = require('node-forge');
const pino = require('pino');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { Kafka } = require('kafkajs');
const EventEmitter = require('events');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const logger = pino({ transport: { target: 'pino-pretty' } });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/security_analytics'
});

const SENSOR_COMMAND_SECRET = process.env.SENSOR_COMMAND_SECRET || 'ndr-demo-secret';
const OBJECT_STORAGE_BASE_URL = process.env.OBJECT_STORAGE_BASE_URL || 'https://storage.local';
const OBJECT_STORAGE_BUCKET = process.env.OBJECT_STORAGE_BUCKET || '';
const OBJECT_STORAGE_REGION = process.env.OBJECT_STORAGE_REGION || process.env.AWS_REGION || 'us-east-1';
const OBJECT_STORAGE_ENDPOINT = process.env.OBJECT_STORAGE_ENDPOINT;
const OBJECT_STORAGE_FORCE_PATH_STYLE = (process.env.OBJECT_STORAGE_FORCE_PATH_STYLE || 'true').toLowerCase() !== 'false';
const OBJECT_STORAGE_ACCESS_KEY_ID = process.env.OBJECT_STORAGE_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const OBJECT_STORAGE_SECRET_ACCESS_KEY = process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
const VERIFY_OBJECT_UPLOADS = (process.env.OBJECT_STORAGE_VERIFY_UPLOADS || 'true').toLowerCase() !== 'false';
const CERT_VALID_DAYS = Number(process.env.CERT_VALID_DAYS) > 0 ? Number(process.env.CERT_VALID_DAYS) : 90;
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || '').split(',').map((s) => s.trim()).filter(Boolean);
const KAFKA_TOPIC = process.env.KAFKA_SENSOR_EVENTS_TOPIC || 'ndr-sensor-events';
const SQS_QUEUE_URL = process.env.SQS_SENSOR_EVENTS_QUEUE_URL || '';
const eventBus = new EventEmitter();
eventBus.setMaxListeners(0);
const sseClients = new Set();

const buildDownloadUrl = (objectKey) => {
  const base = OBJECT_STORAGE_BASE_URL.replace(/\/$/, '');
  return `${base}/${objectKey}`;
};

const buildS3Client = () => {
  if (!OBJECT_STORAGE_BUCKET) {
    logger.warn('OBJECT_STORAGE_BUCKET not set; presigned uploads disabled');
    return null;
  }

  const options = {
    region: OBJECT_STORAGE_REGION
  };

  if (OBJECT_STORAGE_ENDPOINT) {
    options.endpoint = OBJECT_STORAGE_ENDPOINT;
  }

  if (OBJECT_STORAGE_FORCE_PATH_STYLE) {
    options.forcePathStyle = true;
  }

  if (OBJECT_STORAGE_ACCESS_KEY_ID && OBJECT_STORAGE_SECRET_ACCESS_KEY) {
    options.credentials = {
      accessKeyId: OBJECT_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: OBJECT_STORAGE_SECRET_ACCESS_KEY
    };
  }

  logger.info({ bucket: OBJECT_STORAGE_BUCKET, endpoint: OBJECT_STORAGE_ENDPOINT }, 'Initialized S3 client for object storage');
  return new S3Client(options);
};

const s3Client = buildS3Client();
const kafkaProducer = KAFKA_BROKERS.length ? new Kafka({ brokers: KAFKA_BROKERS }).producer() : null;
const sqsClient = SQS_QUEUE_URL ? new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' }) : null;

const buildStorageDescriptor = async (objectKey, expiresInSeconds) => {
  if (!s3Client) {
    return {
      uploadUrl: buildDownloadUrl(objectKey),
      downloadUrl: buildDownloadUrl(objectKey)
    };
  }

  const uploadCommand = new PutObjectCommand({
    Bucket: OBJECT_STORAGE_BUCKET,
    Key: objectKey,
    ContentType: 'application/gzip'
  });
  const maxExpires = 12 * 60 * 60; // AWS presign max is 7 days but limit to 12h for security
  const expiresIn = Math.min(Math.max(expiresInSeconds, 60), maxExpires);
  const uploadUrl = await getSignedUrl(s3Client, uploadCommand, { expiresIn });
  return {
    uploadUrl,
    downloadUrl: buildDownloadUrl(objectKey)
  };
};

const verifyUploadedArtifact = async (objectKey, expectedSize) => {
  if (!VERIFY_OBJECT_UPLOADS || !s3Client || !OBJECT_STORAGE_BUCKET) {
    return { status: 'skipped', notes: 'verification disabled or unavailable' };
  }
  try {
    const head = await s3Client.send(new HeadObjectCommand({ Bucket: OBJECT_STORAGE_BUCKET, Key: objectKey }));
    const actualSize = head.ContentLength || null;
    if (typeof expectedSize === 'number' && expectedSize > 0 && actualSize !== null && actualSize !== expectedSize) {
      return { status: 'mismatch', notes: `expected ${expectedSize} bytes, got ${actualSize}` };
    }
    return { status: 'verified', notes: null };
  } catch (err) {
    logger.error({ err, objectKey }, 'Failed to verify uploaded artifact');
    return { status: 'error', notes: err.message };
  }
};

const broadcastEvent = (type, payload) => {
  eventBus.emit(type, payload);
  relayEvent(type, payload);
};

const relayEvent = async (type, payload) => {
  const enriched = {
    event_type: type,
    timestamp: new Date().toISOString(),
    ...payload
  };
  if (kafkaProducer) {
    try {
      await kafkaProducer.send({
        topic: KAFKA_TOPIC,
        messages: [{ value: JSON.stringify(enriched) }]
      });
    } catch (err) {
      logger.error({ err }, 'Failed to publish sensor event to Kafka');
    }
  }
  if (sqsClient && SQS_QUEUE_URL) {
    try {
      await sqsClient.send(new SendMessageCommand({
        QueueUrl: SQS_QUEUE_URL,
        MessageBody: JSON.stringify(enriched)
      }));
    } catch (err) {
      logger.error({ err }, 'Failed to publish sensor event to SQS');
    }
  }
};

const stableStringify = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return JSON.stringify(payload);
  }
  const ordered = {};
  Object.keys(payload)
    .sort()
    .forEach((key) => {
      ordered[key] = payload[key];
    });
  return JSON.stringify(ordered);
};

const signCommand = (payload) => {
  const json = stableStringify(payload);
  return crypto.createHmac('sha256', SENSOR_COMMAND_SECRET).update(json).digest('hex');
};

const generateSerialNumber = () => {
  const timestampHex = Date.now().toString(16);
  const randomHex = Math.floor(Math.random() * 1e12).toString(16);
  return (timestampHex + randomHex).slice(0, 32);
};

const loadCertificateAuthority = () => {
  const caKeyPem = process.env.CA_PRIVATE_KEY_PEM;
  const caCertPem = process.env.CA_CERT_PEM;

  if (caKeyPem && caCertPem) {
    try {
      const key = forge.pki.privateKeyFromPem(caKeyPem);
      const cert = forge.pki.certificateFromPem(caCertPem);
      logger.info('Loaded CA material from environment');
      return {
        key,
        cert,
        certPem: caCertPem
      };
    } catch (err) {
      logger.error({ err }, 'Failed to parse CA material from environment; generating new CA');
    }
  }

  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.serialNumber = generateSerialNumber();
  const notBefore = new Date();
  const notAfter = new Date(notBefore.getTime());
  notAfter.setFullYear(notBefore.getFullYear() + 5);
  cert.validity.notBefore = notBefore;
  cert.validity.notAfter = notAfter;
  const attrs = [{ name: 'commonName', value: 'NDR Sensor CA' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.publicKey = keys.publicKey;
  cert.setExtensions([
    { name: 'basicConstraints', cA: true },
    { name: 'keyUsage', keyCertSign: true, digitalSignature: true, cRLSign: true },
    { name: 'subjectKeyIdentifier' }
  ]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const certPem = forge.pki.certificateToPem(cert);
  logger.warn('Generated ephemeral CA material (set CA_PRIVATE_KEY_PEM / CA_CERT_PEM for persistence)');
  return {
    key: keys.privateKey,
    cert,
    certPem
  };
};

const CA = loadCertificateAuthority();
logger.info('Sensor controller CA subject:', CA.cert.subject.attributes.map((attr) => `${attr.name}=${attr.value}`).join(', '));

const issueCertificateFromCSR = (csrPem) => {
  let csr;
  try {
    csr = forge.pki.certificationRequestFromPem(csrPem);
  } catch (err) {
    throw new Error('invalid CSR: unable to parse PEM');
  }

  if (!csr.verify()) {
    throw new Error('invalid CSR: signature verification failed');
  }

  const cert = forge.pki.createCertificate();
  cert.serialNumber = generateSerialNumber();

  const notBefore = new Date();
  const notAfter = new Date(notBefore.getTime() + CERT_VALID_DAYS * 24 * 60 * 60 * 1000);
  cert.validity.notBefore = notBefore;
  cert.validity.notAfter = notAfter;

  cert.setSubject(csr.subject.attributes);
  cert.setIssuer(CA.cert.subject.attributes);
  cert.publicKey = csr.publicKey;

  const extensions = [];
  const extRequest = csr.getAttribute({ name: 'extensionRequest' });
  if (extRequest && Array.isArray(extRequest.extensions)) {
    extRequest.extensions.forEach((ext) => extensions.push(ext));
  }

  if (!extensions.some((ext) => ext.name === 'basicConstraints')) {
    extensions.push({ name: 'basicConstraints', cA: false });
  }

  if (!extensions.some((ext) => ext.name === 'keyUsage')) {
    extensions.push({ name: 'keyUsage', digitalSignature: true, keyEncipherment: true });
  }

  cert.setExtensions(extensions);
  cert.sign(CA.key, forge.md.sha256.create());

  const certPem = forge.pki.certificateToPem(cert);
  return {
    cert,
    pem: certPem
  };
};

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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pcap_requests (
      id TEXT PRIMARY KEY,
      sensor_id TEXT REFERENCES sensors(id) ON DELETE CASCADE,
      duration_seconds INTEGER,
      upload_url TEXT,
      object_key TEXT,
      download_url TEXT,
      status TEXT DEFAULT 'pending',
      command_payload JSONB,
      signature TEXT,
      start_time TIMESTAMPTZ,
      end_time TIMESTAMPTZ,
      size_bytes BIGINT,
      notes TEXT,
      expires_at TIMESTAMPTZ,
      checksum_sha256 TEXT,
      upload_attempts INTEGER,
      completed_at TIMESTAMPTZ,
      verification_status TEXT,
      verification_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await pool.query('ALTER TABLE pcap_requests ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ');
  await pool.query('ALTER TABLE pcap_requests ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ');
  await pool.query('ALTER TABLE pcap_requests ADD COLUMN IF NOT EXISTS size_bytes BIGINT');
  await pool.query('ALTER TABLE pcap_requests ADD COLUMN IF NOT EXISTS notes TEXT');
  await pool.query('ALTER TABLE pcap_requests ADD COLUMN IF NOT EXISTS upload_url TEXT');
  await pool.query('ALTER TABLE pcap_requests ADD COLUMN IF NOT EXISTS checksum_sha256 TEXT');
  await pool.query('ALTER TABLE pcap_requests ADD COLUMN IF NOT EXISTS upload_attempts INTEGER');
  await pool.query('ALTER TABLE pcap_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ');
  await pool.query('ALTER TABLE pcap_requests ADD COLUMN IF NOT EXISTS verification_status TEXT');
  await pool.query('ALTER TABLE pcap_requests ADD COLUMN IF NOT EXISTS verification_notes TEXT');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sensor_enrollment_tokens (
      token TEXT PRIMARY KEY,
      sensor_id TEXT,
      expires_at TIMESTAMPTZ,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT now(),
      used_at TIMESTAMPTZ
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS issued_certificates (
      id TEXT PRIMARY KEY,
      sensor_id TEXT,
      token TEXT,
      serial TEXT,
      certificate_pem TEXT,
      issued_at TIMESTAMPTZ DEFAULT now(),
      expires_at TIMESTAMPTZ
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

const sseEvents = ['pcap_update', 'sensor_health', 'sensor_alert'];

const registerSseStream = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  } else {
    res.writeHead(200);
  }
  const client = { res, filter: (req.query.sensor_id || '').trim() };
  sseClients.add(client);
  res.write(`event: stream_status\ndata: ${JSON.stringify({ status: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  const sendEvent = (type, payload) => {
    if (client.res.writable) {
      const matchSensor = !client.filter || payload.sensor_id === client.filter;
      if (matchSensor) {
        client.res.write(`event: ${type}\n`);
        client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    }
  };

  const handlers = sseEvents.map((eventName) => {
    const handler = (payload) => sendEvent(eventName, payload);
    eventBus.on(eventName, handler);
    return { eventName, handler };
  });

  req.on('close', () => {
    handlers.forEach(({ eventName, handler }) => eventBus.removeListener(eventName, handler));
    sseClients.delete(client);
  });
};

app.get('/events/stream', registerSseStream);
app.get('/pcap/events', registerSseStream);

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
  const sensor = result.rows[0];
  const heartbeatPayload = {
    sensor_id: sensorId,
    status: sensor.status,
    last_heartbeat: sensor.last_heartbeat,
    metrics: sensor.last_metrics || {},
    updated_at: sensor.updated_at
  };
  broadcastEvent('sensor_health', heartbeatPayload);
  if ((sensor.status || '').toLowerCase() !== 'online') {
    broadcastEvent('sensor_alert', {
      sensor_id: sensorId,
      status: sensor.status,
      last_heartbeat: sensor.last_heartbeat,
      message: `Sensor ${sensorId} reported ${sensor.status || 'unknown'}`
    });
  }

  res.json({ sensor });
});

app.post('/certificates/request', async (req, res) => {
  const { token, csr_pem: csrPem } = req.body || {};

  if (!token || !csrPem) {
    return res.status(400).json({ error: 'token and csr_pem are required' });
  }

  const tokenResult = await pool.query('SELECT * FROM sensor_enrollment_tokens WHERE token = $1', [token]);
  if (tokenResult.rowCount === 0) {
    return res.status(403).json({ error: 'invalid enrollment token' });
  }

  const tokenRow = tokenResult.rows[0];
  if (tokenRow.used) {
    return res.status(400).json({ error: 'token already used' });
  }

  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return res.status(400).json({ error: 'token expired' });
  }

  const sensorId = tokenRow.sensor_id;
  if (!sensorId) {
    return res.status(400).json({ error: 'token is not associated with a sensor_id' });
  }

  try {
    const issued = issueCertificateFromCSR(csrPem);
    const expiresAtIso = issued.cert.validity.notAfter.toISOString();
    const serial = issued.cert.serialNumber;
    const certId = uuidv4();

    await pool.query(
      `INSERT INTO issued_certificates (id, sensor_id, token, serial, certificate_pem, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [certId, sensorId, token, serial, issued.pem, issued.cert.validity.notAfter]
    );

    await pool.query(
      `UPDATE sensor_enrollment_tokens SET used = true, used_at = now() WHERE token = $1`,
      [token]
    );

    await pool.query(
      `INSERT INTO sensors (id, status, updated_at)
       VALUES ($1, 'registered', now())
       ON CONFLICT (id) DO UPDATE SET status = sensors.status`,
      [sensorId]
    );

    res.json({
      sensor_id: sensorId,
      certificate: issued.pem,
      ca_certificate: CA.certPem,
      expires_at: expiresAtIso,
      serial
    });
  } catch (error) {
    logger.error({ error }, 'certificate enrollment failed');
    res.status(400).json({ error: error.message });
  }
});

app.post('/sensors/:id/pcap', async (req, res) => {
  const sensorId = req.params.id;
  const { duration_seconds = 300, expires_in = 3600, object_key: requestedKey } = req.body || {};

  const sensorResult = await pool.query('SELECT id FROM sensors WHERE id = $1', [sensorId]);
  if (sensorResult.rowCount === 0) {
    return res.status(404).json({ error: 'sensor not found' });
  }

  const durationSeconds = Number(duration_seconds) > 0 ? Number(duration_seconds) : 300;
  const expiresIn = Number(expires_in) > 0 ? Number(expires_in) : 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  const requestId = uuidv4();
  const objectKey = requestedKey || `pcap/${sensorId}/${requestId}.tar.gz`;
  const { uploadUrl, downloadUrl } = await buildStorageDescriptor(objectKey, expiresIn);

  const commandPayload = {
    action: 'pcap_snapshot',
    request_id: requestId,
    sensor_id: sensorId,
    duration_seconds: durationSeconds,
    upload_url: uploadUrl,
    object_key: objectKey,
    download_url: downloadUrl,
    expires_at: expiresAt.toISOString()
  };

  const signature = signCommand(commandPayload);

  await pool.query(
    `INSERT INTO pcap_requests (id, sensor_id, duration_seconds, object_key, upload_url, download_url, status, command_payload, signature, expires_at, verification_status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7::jsonb, $8, $9, 'pending')`,
    [requestId, sensorId, durationSeconds, objectKey, uploadUrl, downloadUrl, JSON.stringify(commandPayload), signature, expiresAt]
  );

  broadcastEvent('pcap_update', {
    sensor_id: sensorId,
    request_id: requestId,
    status: 'pending'
  });

  logger.info({ sensor_id: sensorId, request_id: requestId }, 'pcap snapshot command enqueued');

  res.status(202).json({
    request_id: requestId,
    sensor_id: sensorId,
    upload_url: uploadUrl,
    download_url: downloadUrl,
    expires_at: expiresAt.toISOString(),
    status: 'pending',
    command: {
      ...commandPayload,
      signature
    }
  });
});

app.get('/sensors/:id/pcap/pending', async (req, res) => {
  const sensorId = req.params.id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 50);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const pending = await client.query(
      `SELECT id FROM pcap_requests
       WHERE sensor_id = $1 AND status = 'pending'
       ORDER BY created_at ASC
       LIMIT $2
       FOR UPDATE`,
      [sensorId, limit]
    );

    if (pending.rowCount === 0) {
      await client.query('COMMIT');
      return res.json({ sensor_id: sensorId, requests: [] });
    }

    const ids = pending.rows.map((row) => row.id);
    const updated = await client.query(
      `UPDATE pcap_requests
       SET status = 'in_progress', updated_at = now()
       WHERE id = ANY($1::text[])
       RETURNING *`,
      [ids]
    );

    await client.query('COMMIT');
    res.json({ sensor_id: sensorId, requests: updated.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ error, sensor_id: sensorId }, 'Failed to fetch pending pcap requests');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

app.get('/sensors/:id/pcap', async (req, res) => {
  const sensorId = req.params.id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const offset = parseInt(req.query.offset, 10) || 0;
  const statusFilter = (req.query.status || '').toLowerCase();
  const search = req.query.search ? req.query.search.trim() : '';
  const createdAfter = req.query.created_after ? new Date(req.query.created_after) : null;
  const createdBefore = req.query.created_before ? new Date(req.query.created_before) : null;

  const sensorResult = await pool.query('SELECT id FROM sensors WHERE id = $1', [sensorId]);
  if (sensorResult.rowCount === 0) {
    return res.status(404).json({ error: 'sensor not found' });
  }

  const clauses = ['sensor_id = $1'];
  const params = [sensorId];
  let paramIndex = 2;
  if (statusFilter && ['pending', 'in_progress', 'ready', 'error'].includes(statusFilter)) {
    clauses.push(`status = $${paramIndex}`);
    params.push(statusFilter);
    paramIndex += 1;
  }
  if (search) {
    clauses.push(`(object_key ILIKE $${paramIndex} OR download_url ILIKE $${paramIndex} OR id ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex += 1;
  }
  if (createdAfter && !Number.isNaN(createdAfter.getTime())) {
    clauses.push(`created_at >= $${paramIndex}`);
    params.push(createdAfter);
    paramIndex += 1;
  }
  if (createdBefore && !Number.isNaN(createdBefore.getTime())) {
    clauses.push(`created_at <= $${paramIndex}`);
    params.push(createdBefore);
    paramIndex += 1;
  }

  params.push(limit);
  params.push(offset);

  const requests = await pool.query(
    `SELECT * FROM pcap_requests
     WHERE ${clauses.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  res.json({ sensor_id: sensorId, requests: requests.rows });
});

app.post('/sensors/:id/pcap/:requestId/complete', async (req, res) => {
  const sensorId = req.params.id;
  const requestId = req.params.requestId;
  const {
    status = 'ready',
    start_time,
    end_time,
    size_bytes,
    download_url,
    notes,
    checksum_sha256,
    upload_attempts
  } = req.body || {};

  const startTime = start_time ? new Date(start_time) : null;
  const endTime = end_time ? new Date(end_time) : null;
  let sizeBytes = null;
  if (size_bytes !== undefined && size_bytes !== null && size_bytes !== '') {
    const parsed = parseInt(size_bytes, 10);
    if (!Number.isNaN(parsed)) {
      sizeBytes = parsed;
    }
  }

  const existing = await pool.query(
    'SELECT * FROM pcap_requests WHERE sensor_id = $1 AND id = $2',
    [sensorId, requestId]
  );

  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'pcap request not found' });
  }

  const nextStatus = status || existing.rows[0].status;

  const result = await pool.query(
    `UPDATE pcap_requests
     SET status = $3,
         start_time = COALESCE($4, start_time),
         end_time = COALESCE($5, end_time),
         size_bytes = COALESCE($6, size_bytes),
         download_url = COALESCE($7, download_url),
         notes = COALESCE($8, notes),
         checksum_sha256 = COALESCE($9, checksum_sha256),
         upload_attempts = COALESCE($10, upload_attempts),
         completed_at = CASE WHEN $3 = 'ready' THEN now() ELSE completed_at END,
         updated_at = now()
     WHERE sensor_id = $1 AND id = $2
     RETURNING *`,
    [sensorId, requestId, nextStatus, startTime, endTime, sizeBytes, download_url, notes, checksum_sha256, upload_attempts]
  );

  let row = result.rows[0];

  if (row.status === 'ready' && existing.rows[0].object_key) {
    const verification = await verifyUploadedArtifact(existing.rows[0].object_key, row.size_bytes);
    const verificationUpdate = await pool.query(
      `UPDATE pcap_requests
       SET verification_status = $3,
           verification_notes = $4,
           updated_at = now()
       WHERE sensor_id = $1 AND id = $2
       RETURNING *`,
      [sensorId, requestId, verification.status, verification.notes]
    );
    row = verificationUpdate.rows[0];
  }

  broadcastEvent('pcap_update', {
    sensor_id: sensorId,
    request_id: requestId,
    status: row.status,
    download_url: row.download_url,
    verification_status: row.verification_status
  });

  res.json({ request: row });
});

app.get('/sensors/:id/certificates', async (req, res) => {
  const sensorId = req.params.id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const offset = parseInt(req.query.offset, 10) || 0;

  const sensorResult = await pool.query('SELECT id FROM sensors WHERE id = $1', [sensorId]);
  if (sensorResult.rowCount === 0) {
    return res.status(404).json({ error: 'sensor not found' });
  }

  const certs = await pool.query(
    `SELECT id, token, serial, issued_at, expires_at, certificate_pem
     FROM issued_certificates
     WHERE sensor_id = $1
     ORDER BY issued_at DESC
     LIMIT $2 OFFSET $3`,
    [sensorId, limit, offset]
  );

  res.json({ sensor_id: sensorId, certificates: certs.rows });
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
  if (kafkaProducer) {
    kafkaProducer.connect().then(() => logger.info('Kafka producer connected')).catch((err) => {
      logger.error({ err }, 'Kafka producer connection failed');
    });
  }
});
