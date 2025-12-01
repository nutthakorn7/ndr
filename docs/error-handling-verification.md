# Error Handling Verification Guide

## 🎯 Objective

Verify that the application gracefully handles errors at all levels:
1. **Component Crashes**: Caught by Error Boundaries
2. **API Failures**: Caught by Fallback Logic
3. **Network Issues**: Handled by Retry Logic

---

## 🛠️ Verification Tools

We have added a **Debug Tab** to the Settings Panel to help with verification.

**To Access:**
1. Click the **Settings** (gear icon) in the top right
2. Select the **Debug** tab in the sidebar

---

## 🧪 Test Scenarios

### 1. Verify Global Error Boundary

**Goal**: Ensure the app doesn't white-screen when a component crashes.

**Steps:**
1. Open **Settings > Debug**
2. Click the red **"Trigger Crash"** button
3. **Expected Result**: 
   - The Settings modal (or the entire app) is replaced by the Error Boundary UI
   - You see "Something went wrong"
   - You see a "Try Again" button

**Recovery:**
- Click **"Try Again"** to reset the error boundary and restore the UI.

### 2. Verify API Fallback (Mock Data)

**Goal**: Ensure the app works when the backend is down.

**Steps:**
1. Stop all backend services (if running)
2. Reload the page
3. **Expected Result**:
   - Dashboard loads successfully
   - Console shows warnings: `⚠️ API unavailable, using mock data`
   - All charts and stats are populated with mock data
   - No error popups or broken layouts

### 3. Verify Retry Logic

**Goal**: Ensure the app retries failed requests before giving up.

**Steps:**
1. Open Browser DevTools > Network tab
2. Set Network throttling to "Offline" briefly, then back to "No throttling"
3. **Expected Result**:
   - Console shows: `⚠️ Request failed (attempt 1). Retrying in 1000ms...`
   - If network returns, the request succeeds
   - If network stays down, it eventually falls back to mock data

### 4. Verify 404/500 Handling

**Goal**: Ensure specific HTTP errors are handled.

**Steps:**
1. (Optional) Modify `api.js` temporarily to request a non-existent endpoint
2. **Expected Result**:
   - Console shows 404/500 error
   - Component falls back to mock data
   - User sees no disruption

---

## ✅ Checklist

- [ ] **Global Crash**: "Trigger Crash" button shows Error Boundary UI
- [ ] **Recovery**: "Try Again" button restores the application
- [ ] **Offline Mode**: App loads with mock data when backend is down
- [ ] **Retry**: Transient network errors trigger retries (check console)
- [ ] **Console Logs**: Warnings are logged instead of uncaught exceptions

---

## 🐛 Troubleshooting

**If Error Boundary doesn't appear:**
- Ensure you are in the correct component hierarchy. The global boundary wraps the entire `Dashboard`.

**If Mock Data doesn't load:**
- Check console for "Uncaught Error". This means the fallback logic failed.
- Verify `api.js` catch blocks are correctly implemented.

**If Retries don't happen:**
- Retries are only for `fetch` errors (network) and 5xx/429 status codes.
- 400/401/403 errors do NOT retry (as they are likely permanent).
