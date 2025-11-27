# API Integration Guide - Open NDR

## Overview
This guide explains how to connect the Open NDR UI to backend services to make all features fully functional.

## Architecture

```
UI (React) → API Client → Backend Services
  ↓              ↓              ↓
localhost:5173  api.js    dashboard-api:8081
                          asset-service:8088
                          soar:8089
                          auth:8087
```

## Step 1: Start Backend Services

```bash
cd /Users/pop7/Code/NDR/deploy
docker-compose up -d
```

**Services Started:**
- `dashboard-api` (8081) - Main API endpoint
- `auth-service` (8087) - Authentication
- `asset-service` (8088) - Asset management
- `soar-orchestrator` (8089) - Automation
- `opensearch` (9200) - Data storage
- `kafka` (9092) - Event streaming
- `postgres` (5432) - Metadata

**Verify Services:**
```bash
# Check dashboard API
curl http://localhost:8081/health

# Check OpenSearch
curl http://localhost:9200

# List running containers
docker-compose ps
```

## Step 2: Configure Environment

Create `.env` file in `/Users/pop7/Code/NDR/ui/`:

```bash
cp .env.example .env
```

**Default Configuration:**
```env
VITE_API_BASE_URL=http://localhost:8081
VITE_AUTH_URL=http://localhost:8087
VITE_ASSET_URL=http://localhost:8088
VITE_SOAR_URL=http://localhost:8089
VITE_AUTH_ENABLED=false
VITE_REALTIME_INTERVAL=30000
```

## Step 3: Using the API Client

The API client (`/ui/src/utils/api.js`) provides methods for all backend endpoints.

**Example - Fetch Dashboard Stats:**
```javascript
import api from '@/utils/api';

// Get dashboard statistics
const stats = await api.getDashboardStats();
// Returns: { totalAlerts, criticalAlerts, totalEvents, activeAssets }

// Get recent alerts
const alerts = await api.getAlerts({ limit: 10, severity: 'critical' });
// Returns: { alerts: [...], total: 123 }

// Get alert details
const alertDetail = await api.getAlertById('alert-123');
// Returns: { id, title, severity, timestamp, ... }
```

## Step 4: Using React Hooks

React hooks (`/ui/src/utils/hooks.js`) simplify data fetching with automatic loading states.

**Example - Component with Real Data:**
```javascript
import { useDashboardStats, useAlerts } from '@/utils/hooks';

function SecurityPostureView() {
  const { data: stats, loading, error } = useDashboardStats();
  const { data: alertsData } = useAlerts({ limit: 10 }, true); // true = real-time

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>{stats.totalAlerts} Total Alerts</h2>
      {alertsData?.alerts.map(alert => (
        <div key={alert.id}>{alert.title}</div>
      ))}
    </div>
  );
}
```

## Step 5: Available API Endpoints

### Dashboard API (Port 8081)

**Analytics:**
- `GET /analytics/dashboard` - Overall statistics
- `GET /stats/traffic?range=24h` - Traffic statistics
- `GET /stats/protocols` - Protocol distribution

**Alerts:**
- `GET /alerts?limit=10&severity=critical` - Get alerts
- `GET /alerts/:id` - Get alert details
- `GET /alerts/:id/chain` - Get correlated alerts
- `PUT /alerts/:id/status` - Update alert status
- `POST /alerts/:id/notes` - Add note to alert

**Events:**
- `POST /events` - Search events (with query body)

### Asset Service (Port 8088)

- `GET /assets?limit=100` - List assets
- `GET /assets/:id` - Get asset details
- `GET /assets/stats` - Asset statistics

### SOAR Orchestrator (Port 8089)

- `GET /playbooks` - List playbooks
- `POST /playbooks/:id/execute` - Execute playbook
- `GET /executions` - List execution history

### Auth Service (Port 8087)

- `POST /auth/login` - Login
- `GET /auth/me` - Get current user
- `POST /auth/refresh` - Refresh token

## Step 6: Making Features Interactive

### Example 1: Investigate Button

**Before (Static):**
```javascript
<button className="btn-investigate">Investigate →</button>
```

**After (Functional):**
```javascript
const handleInvestigate = async (alertId) => {
  try {
    const details = await api.getAlertById(alertId);
    const chain = await api.getCorrelatedAlerts(alertId);
    
    // Show modal or navigate
    setSelectedAlert({ ...details, chain });
    setShowModal(true);
  } catch (error) {
    console.error('Investigation failed:', error);
  }
};

<button 
  className="btn-investigate"
  onClick={() => handleInvestigate(alert.id)}
>
  Investigate →
</button>
```

### Example 2: Search Functionality

```javascript
const handleSearch = async (searchTerm) => {
  const results = await api.searchEvents({
    query: searchTerm,
    size: 100,
    sort: [{ timestamp: 'desc' }]
  });
  
  setSearchResults(results.hits);
};

<input 
  placeholder="Search events..." 
  onChange={(e) => handleSearch(e.target.value)}
/>
```

### Example 3: Update Alert Status

```javascript
const handleStatusChange = async (alertId, newStatus) => {
  await api.updateAlertStatus(alertId, newStatus);
  
  // Refresh alerts list
  const updatedAlerts = await api.getAlerts();
  setAlerts(updatedAlerts.alerts);
};

<select onChange={(e) => handleStatusChange(alert.id, e.target.value)}>
  <option value="open">Open</option>
  <option value="investigating">Investigating</option>
  <option value="resolved">Resolved</option>
</select>
```

## Step 7: Real-Time Updates

Use `useRealTime` hook for auto-refreshing data:

```javascript
import { useRealTime } from '@/utils/hooks';

function LiveAlerts() {
  const { data, lastUpdate } = useRealTime(
    () => api.getAlerts({ severity: 'critical' }),
    10000  // Refresh every 10 seconds
  );

  return (
    <div>
      <p>Last updated: {lastUpdate.toLocaleTimeString()}</p>
      {data?.alerts.map(alert => <AlertCard key={alert.id} alert={alert} />)}
    </div>
  );
}
```

## Step 8: Error Handling

Always handle API errors gracefully:

```javascript
function MyComponent() {
  const { data, loading, error } = useDashboardStats();

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>Failed to load data: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return <div>{/* Render data */}</div>;
}
```

## Step 9: Testing the Integration

1. **Start backend services:**
   ```bash
   cd deploy && docker-compose up -d
   ```

2. **Wait for services to be ready:**
   ```bash
   # Check OpenSearch
   curl http://localhost:9200/_cluster/health
   
   # Check dashboard API
   curl http://localhost:8081/analytics/dashboard
   ```

3. **Start UI:**
   ```bash
   cd ui && npm run dev
   ```

4. **Test in browser:**
   - Open http://localhost:5173
   - Check browser console for API calls
   - Verify data loads from backend

## Step 10: Troubleshooting

**Problem: UI shows "Loading..." indefinitely**
- Check if backend services are running: `docker-compose ps`
- Check API endpoint: `curl http://localhost:8081/analytics/dashboard`
- Check browser console for CORS errors

**Problem: CORS errors**
- Dashboard API has CORS enabled by default
- If issues persist, check `services/dashboard-api/src/app.js`

**Problem: No data in OpenSearch**
- Run parser-normalizer to index sample data
- Check OpenSearch: `curl http://localhost:9200/security-*/_count`

**Problem: 401 Unauthorized**
- Auth is disabled by default (`VITE_AUTH_ENABLED=false`)
- If enabled, login first: `api.login('admin@ndr.local', 'changeme')`

## Next Steps

1. ✅ Connect all 10 feature tabs to real APIs
2. ✅ Add modals for alert investigation
3. ✅ Implement search with filters
4. ✅ Add export functionality
5. ✅ Create detailed alert/asset views
6. ✅ Add charts with real data (use Chart.js or Recharts)

## Summary

**What You Have Now:**
- ✅ API client with all endpoints
- ✅ React hooks for easy data fetching
- ✅ Real-time updates
- ✅ Error handling
- ✅ Loading states

**What to Do:**
1. Start backend: `docker-compose up -d`
2. Configure .env
3. Use hooks in components: `const { data } = useDashboardStats();`
4. Replace static data with `data` from hooks
5. Add button handlers with API calls

**Your UI is now ready to connect to production data!** 🚀
