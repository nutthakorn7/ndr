const { Pool } = require('pg');
const { logger } = require('../utils/logger');
const fs = require('fs');
const path = require('path');

class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/security_analytics'
    });
  }

  async initialize() {
    try {
      // Create assets table if it doesn't exist
      const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      await this.pool.query(schema);
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async upsertAsset(asset) {
    const query = `
      INSERT INTO assets (ip_address, mac_address, hostname, os_type, os_version, device_type, criticality, first_seen, last_seen, tags, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8, $9)
      ON CONFLICT (ip_address) 
      DO UPDATE SET
        mac_address = COALESCE(EXCLUDED.mac_address, assets.mac_address),
        hostname = COALESCE(EXCLUDED.hostname, assets.hostname),
        os_type = COALESCE(EXCLUDED.os_type, assets.os_type),
        os_version = COALESCE(EXCLUDED.os_version, assets.os_version),
        device_type = COALESCE(EXCLUDED.device_type, assets.device_type),
        last_seen = NOW(),
        tags = EXCLUDED.tags,
        metadata = assets.metadata || EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      asset.ip_address,
      asset.mac_address || null,
      asset.hostname || null,
      asset.os_type || null,
      asset.os_version || null,
      asset.device_type || null,
      asset.criticality || 'unknown',
      asset.tags || [],
      asset.metadata || {}
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to upsert asset:', error);
      throw error;
    }
  }

  async getAssets(filters = {}) {
    let query = 'SELECT * FROM assets WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (filters.ip_address) {
      query += ` AND ip_address = $${paramIndex++}`;
      values.push(filters.ip_address);
    }

    if (filters.hostname) {
      query += ` AND hostname ILIKE $${paramIndex++}`;
      values.push(`%${filters.hostname}%`);
    }

    if (filters.criticality) {
      query += ` AND criticality = $${paramIndex++}`;
      values.push(filters.criticality);
    }

    if (filters.device_type) {
      query += ` AND device_type = $${paramIndex++}`;
      values.push(filters.device_type);
    }

    query += ' ORDER BY last_seen DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(parseInt(filters.limit));
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex++}`;
      values.push(parseInt(filters.offset));
    }

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async getAssetById(id) {
    const result = await this.pool.query('SELECT * FROM assets WHERE id = $1', [id]);
    return result.rows[0];
  }

  async getStats() {
    const totalQuery = 'SELECT COUNT(*) as total FROM assets';
    const typeQuery = 'SELECT device_type, COUNT(*) as count FROM assets WHERE device_type IS NOT NULL GROUP BY device_type';
    const criticalityQuery = 'SELECT criticality, COUNT(*) as count FROM assets GROUP BY criticality';

    const [total, types, criticality] = await Promise.all([
      this.pool.query(totalQuery),
      this.pool.query(typeQuery),
      this.pool.query(criticalityQuery)
    ]);

    return {
      total: parseInt(total.rows[0].total),
      by_type: types.rows,
      by_criticality: criticality.rows
    };
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = { Database };
