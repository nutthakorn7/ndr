const express = require('express');
const cors = require('cors');
const { initDB } = require('./db/client');
const authService = require('./services/auth');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Register
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, role, tenant_id } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const user = await authService.register(email, password, role, tenant_id);
    res.status(201).json(user);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'User already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Refresh token
app.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }
    
    const result = await authService.refresh(refreshToken);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Verify token
app.post('/auth/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }
    
    const decoded = authService.verifyToken(token);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false, error: error.message });
  }
});

// Create API key
app.post('/auth/api-keys', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = authService.verifyToken(token);
    
    const { name, permissions, tenant_id } = req.body;
    
    const apiKey = await authService.createAPIKey(
      name,
      permissions || ['logs:create', 'events:create', 'alerts:read'],
      tenant_id || decoded.tenant_id,
      decoded.sub
    );
    
    res.status(201).json(apiKey);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// List API keys
app.get('/auth/api-keys', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = authService.verifyToken(token);
    
    const keys = await authService.listAPIKeys(decoded.sub);
    res.json(keys);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Revoke API key
app.delete('/auth/api-keys/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = authService.verifyToken(token);
    
    await authService.revokeAPIKey(req.params.id, decoded.sub);
    res.status(204).send();
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Validate API key (for other services)
app.post('/auth/validate-api-key', async (req, res) => {
  try {
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'API key required' });
    }
    
    const apiKey = await authService.validateAPIKey(key);
    
    if (!apiKey) {
      return res.status(401).json({ valid: false });
    }
    
    res.json({
      valid: true,
      permissions: apiKey.permissions,
      tenant_id: apiKey.tenant_id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize database and start server
const PORT = process.env.PORT || 8087;

initDB().then(() => {
  // Create default admin if specified
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    authService.register(
      process.env.ADMIN_EMAIL,
      process.env.ADMIN_PASSWORD,
      'Admin'
    ).then(() => {
      console.log('Default admin user created');
    }).catch(err => {
      if (err.code !== '23505') { // Ignore if already exists
        console.error('Failed to create admin:', err.message);
      }
    });
  }
  
  app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});

module.exports = app;
