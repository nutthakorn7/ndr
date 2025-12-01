# Backend Services Testing Guide

## 🎯 Objective

Test the NDR dashboard with all backend services running to verify:
- ✅ Real API data flows correctly
- ✅ Error handling works as expected  
- ✅ Retry logic functions properly
- ✅ Fallback to mock data when services are down

---

## 📋 Available Backend Services

### Core Services

| Service | Port | Directory | Purpose |
|---------|------|-----------|---------|
| **dashboard-api** | 8081 | `services/dashboard-api` | Events, alerts, analytics, sensors |
| **asset-service** | 8088 | `services/asset-service` | Asset inventory and discovery |
| **auth-service** | 8087 | `services/auth-service` | Authentication and user management |
| **SOAR Orchestrator** | Dynamic | `services/soar-orchestrator` | Playbook automation |

### Supporting Services

| Service | Port | Purpose |
|---------|------|---------|
| **OpenSearch** | 9200 | Event storage and search |
| **PostgreSQL** | 5432 | Alert and playbook metadata |
| **Kafka** | 9092 | Event streaming |

---

## 🚀 Step-by-Step Testing

### 1. Start Core Backend Services

#### Option A: Start All Services (Recommended)

```bash
# Terminal 1: Dashboard API
cd /Users/pop7/Code/NDR/services/dashboard-api
npm install
npm start

# Terminal 2: Asset Service
cd /Users/pop7/Code/NDR/services/asset-service
npm install
npm start

# Terminal 3: Auth Service  
cd /Users/pop7/Code/NDR/services/auth-service
npm install
npm start

# Terminal 4: UI
cd /Users/pop7/Code/NDR/ui
npm run dev
```

#### Option B: Start Individual Services (For Testing)

```bash
# Start only Dashboard API (tests most components)
cd /Users/pop7/Code/NDR/services/dashboard-api
npm start

# Then start UI
cd /Users/pop7/Code/NDR/ui
npm run dev
```

### 2. Verify Services Are Running

```bash
# Check Dashboard API
curl http://localhost:8081/health
# Expected: {"status":"ok"}

# Check Asset Service
curl http://localhost:8088/health  
# Expected: {"status":"healthy"}

# Check Auth Service
curl http://localhost:8087/health
# Expected: {"status":"ok"}
```

### 3. Open the Dashboard

```bash
# UI should be running at:
http://localhost:5173
```

---

## ✅ What to Test

### Component-by-Component Checklist

#### Dashboard (Main Page)
- [ ] **KPI Stats** update with real data
- [ ] **Auto-refresh** works (30s interval)
- [ ] **Console** shows successful API calls
- [ ] **Numbers** differ from mock data

**Expected Console:**
```
✓ Fetched dashboard stats from API
```

#### EventSearch
- [ ] **Search** returns real events from OpenSearch
- [ ] **Time range** filtering works (1h, 24h, 7d, 30d)
- [ ] **Results** show actual event data
- [ ] **IP addresses** are real network IPs

**Expected Console:**
```
✓ Search completed: 123 events found
```

#### NetworkAnalytics
- [ ] **Traffic charts** show real data
- [ ] **Protocol distribution** reflects actual traffic
- [ ] **Top talkers** list real IPs
- [ ] **MB values** are realistic

**Expected Console:**
```
✓ Loaded traffic stats from API
✓ Loaded protocol stats from API
```

#### SensorManagement
- [ ] **Sensor list** shows configured sensors
- [ ] **Metrics** (CPU, RAM, Disk) are live
- [ ] **Status** indicators are accurate
- [ ] **Uptime** calculates from heartbeat

**Expected Console:**
```
✓ Loaded 5 sensors from API
```

#### AssetDiscovery
- [ ] **Asset inventory** loads from asset-service
- [ ] **Stats cards** show accurate counts
- [ ] **Risk scores** are calculated
- [ ] **Asset types** are categorized

**Expected Console:**
```
✓ Assets loaded: 1,245 discovered
```

#### RealTimeFeed
- [ ] **Alerts stream** every 5 seconds
- [ ] **New alerts** appear at top
- [ ] **EPS counter** updates
- [ ] **Severity badges** are accurate

**Expected Console:**
```
✓ Fetched 20 alerts from API
✓ Real-time feed updated
```

#### ThreatIntelligence
- [ ] **IOC statistics** load
- [ ] **Stats cards** show real numbers
- [ ] **Feed list** (currently mock - OK)
- [ ] **Match data** (currently mock - OK)

**Expected Console:**
```
✓ Loaded threat stats from API
⚠️ Using mock data for feeds and matches
```

#### AdvancedDetection
- [ ] **Detection rules** load by type
- [ ] **Rule filtering** works (Suricata/YARA/Sigma)
- [ ] **Stats** show total/active rules
- [ ] **Hit counts** are accurate

**Expected Console:**
```
✓ Loaded 145 detection rules
✓ Loaded detection stats
```

#### SSLAnalysis
- [ ] **SSL stats** load
- [ ] **Certificates** from sensors display
- [ ] **Expiry dates** are formatted
- [ ] **Status badges** (expired/valid) are correct

**Expected Console:**
```
✓ Loaded SSL stats
✓ Loaded certificates from sensor
⚠️ Using mock data for TLS versions/ciphers
```

#### SocDashboard
- [ ] **SOC metrics** load
- [ ] **Critical incidents** count
- [ ] **MTTR** displays
- [ ] **SLA compliance** shows

**Expected Console:**
```
✓ Loaded SOC metrics from API
⚠️ Using mock data for charts
```

#### FileAnalysis
- [ ] **File stats** load
- [ ] **Malicious count** is accurate
- [ ] **Suspicious/clean** counts display
- [ ] **Pending queue** shows

**Expected Console:**
```
✓ Loaded file analysis stats
⚠️ Using mock data for file list
```

#### DNSIntelligence
- [ ] **DNS stats** load
- [ ] **Query volume** displays
- [ ] **Blocked domains** count
- [ ] **DGA/tunneling** stats show

**Expected Console:**
```
✓ Loaded DNS stats
⚠️ Using mock data for queries/tunneling
```

#### SoarIntegration  
- [ ] **Playbooks** load from orchestrator
- [ ] **Execution history** displays
- [ ] **Success rates** are accurate
- [ ] **Last run** times are formatted

**Expected Console:**
```
✓ Loaded 5 playbooks from API
✓ Loaded 10 executions from API
⚠️ Using mock data for connectors
```

---

## 🔍 Testing Scenarios

### Scenario 1: All Services Running ✅

**Setup:**
- Start all backend services
- Open dashboard

**Expected:**
- All components show real data
- Console shows "✓ Loaded from API"
- No fallback warnings
- Data updates regularly

**Verification:**
```bash
# Check browser DevTools Console
# Look for: ✓ Success messages
# Should NOT see: ⚠️ "using mock data" warnings
```

### Scenario 2: Partial Services Running ⚠️

**Setup:**
- Start ONLY dashboard-api
- Stop asset-service and auth-service
- Open dashboard

**Expected:**
- Dashboard/Events/Sensors show real data
- AssetDiscovery falls back to mock
- Console shows mixed success/warnings

**Verification:**
```bash
# Console should show:
✓ Loaded dashboard stats from API
⚠️ Failed to load assets from API, using mock data
```

### Scenario 3: All Services Down ❌

**Setup:**
- Stop ALL backend services
- Open dashboard

**Expected:**
- All components show mock data
- Console shows fallback warnings
- UI remains fully functional
- No crashes or errors

**Verification:**
```bash
# Console should show:
⚠️ API unavailable, using mock data
⚠️ Failed to load sensors from API, using mock data
⚠️ ...
```

### Scenario 4: Network Instability 🔄

**Setup:**
- Start services
- Stop a service mid-session
- Watch retry logic

**Expected:**
- Retry attempts with exponential backoff
- Console shows retry messages
- Eventually falls back to mock
- UI remains stable

**Verification:**
```bash
# Console should show:
⚠️ Request failed (attempt 1). Retrying in 1000ms...
⚠️ Request failed (attempt 2). Retrying in 2000ms...
⚠️ API Request failed after retries: Error...
⚠️ Using mock data...
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Services Won't Start

**Symptoms:**
```
Error: Port 8081 is already in use
```

**Solution:**
```bash
# Find and kill process using the port
lsof -ti:8081 | xargs kill -9
lsof -ti:8088 | xargs kill -9
lsof -ti:8087 | xargs kill -9

# Or restart with different ports
PORT=8082 npm start
```

### Issue 2: Database Connection Errors

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Start PostgreSQL
brew services start postgresql@14

# Or with Docker
docker-compose up -d postgres
```

### Issue 3: OpenSearch Not Available

**Symptoms:**
```
Error: OpenSearch cluster is not available
```

**Solution:**
```bash
# Start OpenSearch
docker-compose up -d opensearch

# Verify it's running
curl http://localhost:9200
```

### Issue 4: CORS Errors

**Symptoms:**
```
Access to fetch at 'http://localhost:8081' blocked by CORS
```

**Solution:**
- Backend services should already have CORS enabled
- Check `services/dashboard-api/src/app.js` has CORS middleware
- Ensure UI dev server proxy is configured

### Issue 5: Mock Data Still Showing

**Symptoms:**
- Services running but UI shows mock data

**Solution:**
```bash
# Clear browser cache
# Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# Check API URLs in browser DevTools Network tab
# Should call: http://localhost:8081/analytics/dashboard

# Verify services respond
curl http://localhost:8081/analytics/dashboard
```

---

## 📊 Verification Checklist

### Pre-Test Setup
- [ ] All services have dependencies installed (`npm install`)
- [ ] Database (PostgreSQL) is running
- [ ] OpenSearch is running (optional but recommended)
- [ ] Port 8081, 8087, 8088 are available

### During Testing
- [ ] Browser DevTools Console is open
- [ ] Network tab is recording
- [ ] Monitor console for API calls
- [ ] Check response times in Network tab

### Success Criteria
- [ ] ✅ At least 10/14 components load real data
- [ ] ✅ No JavaScript errors in console  
- [ ] ✅ Fallback works when services stop
- [ ] ✅ Retry logic attempts 3 times
- [ ] ✅ UI remains responsive throughout

---

## 📝 Test Results Template

Copy this template to record your test results:

```markdown
## Test Results - [Date]

### Environment
- UI: http://localhost:5173
- Dashboard API: [RUNNING/STOPPED]
- Asset Service: [RUNNING/STOPPED]
- Auth Service: [RUNNING/STOPPED]

### Component Test Results

| Component | Real Data | Fallback | Notes |
|-----------|-----------|----------|-------|
| Dashboard | ✅/❌ | ✅/❌ | |
| EventSearch | ✅/❌ | ✅/❌ | |
| NetworkAnalytics | ✅/❌ | ✅/❌ | |
| RealTimeFeed | ✅/❌ | ✅/❌ | |
| SensorManagement | ✅/❌ | ✅/❌ | |
| AssetDiscovery | ✅/❌ | ✅/❌ | |
| ThreatIntelligence | ✅/❌ | ✅/❌ | |
| AdvancedDetection | ✅/❌ | ✅/❌ | |
| SSLAnalysis | ✅/❌ | ✅/❌ | |
| SocDashboard | ✅/❌ | ✅/❌ | |
| FileAnalysis | ✅/❌ | ✅/❌ | |
| DNSIntelligence | ✅/❌ | ✅/❌ | |
| SoarIntegration | ✅/❌ | ✅/❌ | |

### Issues Found
- [ ] Issue 1: Description
- [ ] Issue 2: Description

### Overall Result
- [ ] PASS - All critical components work
- [ ] PARTIAL - Some components have issues
- [ ] FAIL - Major issues found

### Notes
[Add any observations or recommendations]
```

---

## 🎯 Next Steps After Testing

1. **Document Issues**: Record any bugs or unexpected behavior
2. **Performance Check**: Monitor response times and optimize slow endpoints
3. **Error Handling**: Verify all error scenarios are handled gracefully
4. **User Experience**: Ensure loading states and transitions are smooth
5. **Production Readiness**: Confirm all critical paths work with real data

---

## 📚 Quick Reference

### Service Health Endpoints
```bash
curl http://localhost:8081/health  # Dashboard API
curl http://localhost:8088/health  # Asset Service
curl http://localhost:8087/health  # Auth Service
```

### View Logs
```bash
# Dashboard API logs
tail -f services/dashboard-api/logs/*.log

# Or check console output in terminal
```

### Stop All Services
```bash
# Press Ctrl+C in each terminal
# Or kill all Node processes
pkill -f "node.*services"
```

---

**Ready to test! Start your backend services and open http://localhost:5173** 🚀
