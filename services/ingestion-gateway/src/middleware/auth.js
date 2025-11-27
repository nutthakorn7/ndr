const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:8087';
const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true';

async function authenticate(req, res, next) {
  if (!AUTH_ENABLED) {
    return next(); // Skip auth if disabled
  }
  
  const token = req.headers.authorization?.replace('Bearer ', '');
  const apiKey = req.headers['x-api-key'];
  
  try {
    if (apiKey) {
      // Validate API key
      const response = await axios.post(`${AUTH_SERVICE_URL}/auth/validate-api-key`, {
        key: apiKey
      });
      
      if (response.data.valid) {
        req.auth = {
          type: 'api_key',
          permissions: response.data.permissions,
          tenant_id: response.data.tenant_id
        };
        return next();
      }
    }
    
    if (token) {
      // Validate JWT token
      const response = await axios.post(
        `${AUTH_SERVICE_URL}/auth/verify`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.valid) {
        req.user = response.data.user;
        return next();
      }
    }
    
    return res.status(401).json({ error: 'Authentication required' });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!AUTH_ENABLED) {
      return next();
    }
    
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}

function checkPermission(permission) {
  return (req, res, next) => {
    if (!AUTH_ENABLED) {
      return next();
    }
    
    // API key permission check
    if (req.auth?.permissions) {
      if (req.auth.permissions.includes(permission) || req.auth.permissions.includes('*')) {
        return next();
      }
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // User role-based permission check
    if (req.user) {
      const rolePermissions = {
        'Admin': ['*'],
        'Analyst': ['alerts:read', 'alerts:update', 'assets:read', 'events:read', 'pcap:request'],
        'Viewer': ['alerts:read', 'assets:read', 'events:read', 'dashboard:read'],
        'API': ['logs:create', 'events:create', 'alerts:read']
      };
      
      const userPerms = rolePermissions[req.user.role] || [];
      if (userPerms.includes(permission) || userPerms.includes('*')) {
        return next();
      }
    }
    
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

module.exports = { authenticate, authorize, checkPermission };
