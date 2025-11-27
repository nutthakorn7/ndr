const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { pool } = require('../db/client');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

class AuthService {
  async register(email, password, role = 'Viewer', tenantId = null) {
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, tenant_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, role, tenant_id, created_at`,
      [email, passwordHash, role, tenantId]
    );
    
    return result.rows[0];
  }
  
  async login(email, password) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }
    
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    
    if (!valid) {
      throw new Error('Invalid credentials');
    }
    
    // Update last login
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );
    
    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user.id);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id
      },
      accessToken,
      refreshToken
    };
  }
  
  generateAccessToken(user) {
    return jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }
  
  async generateRefreshToken(userId) {
    const token = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt]
    );
    
    return token;
  }
  
  async refresh(refreshToken) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    const result = await pool.query(
      `SELECT rt.user_id, u.* 
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 
         AND rt.expires_at > NOW()
         AND u.is_active = true`,
      [tokenHash]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Invalid refresh token');
    }
    
    const user = result.rows[0];
    
    // Delete old refresh token
    await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    
    // Generate new tokens
    const accessToken = this.generateAccessToken(user);
    const newRefreshToken = await this.generateRefreshToken(user.user_id);
    
    return {
      accessToken,
      refreshToken: newRefreshToken
    };
  }
  
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
  
  async createAPIKey(name, permissions, tenantId, createdBy) {
    const key = `ndr_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const keyPrefix = key.substring(0, 12);
    
    const result = await pool.query(
      `INSERT INTO api_keys (key_hash, key_prefix, name, permissions, tenant_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, key_prefix, name, permissions, tenant_id, created_at`,
      [keyHash, keyPrefix, name, permissions, tenantId, createdBy]
    );
    
    return {
      ...result.rows[0],
      key // Only returned once
    };
  }
  
  async validateAPIKey(key) {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    
    const result = await pool.query(
      `SELECT * FROM api_keys 
       WHERE key_hash = $1 
         AND is_active = true
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [keyHash]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    // Update last used
    await pool.query(
      'UPDATE api_keys SET last_used = NOW() WHERE id = $1',
      [result.rows[0].id]
    );
    
    return result.rows[0];
  }
  
  async listAPIKeys(userId) {
    const result = await pool.query(
      `SELECT id, key_prefix, name, permissions, tenant_id, created_at, last_used, expires_at
       FROM api_keys
       WHERE created_by = $1 AND is_active = true
       ORDER BY created_at DESC`,
      [userId]
    );
    
    return result.rows;
  }
  
  async revokeAPIKey(keyId, userId) {
    await pool.query(
      'UPDATE api_keys SET is_active = false WHERE id = $1 AND created_by = $2',
      [keyId, userId]
    );
  }
}

module.exports = new AuthService();
