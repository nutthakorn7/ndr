# Error Handling Improvements

## Overview

Replaced generic `StatusCode::INTERNAL_SERVER_ERROR` responses with descriptive custom error types that provide detailed context, proper HTTP status codes, and structured JSON responses.

## What Changed

### 1. Custom Error Type (`AppError`)

Created a comprehensive error type with:
- **Descriptive messages** - Clear, user-friendly error descriptions
- **Context** - Additional details for debugging
- **Proper status codes** - 400, 401, 404, 500, etc.
- **Structured JSON** - Consistent error response format
- **Automatic logging** - All errors logged with full context

**Example Error Response:**
```json
{
  "error": "Failed to buffer event",
  "details": "SQLite error: database is locked",
  "status": 500
}
```

### 2. Edge Agent Improvements

**File**: `services/rust-edge-agent/src/error.rs` (NEW)

**Features**:
- Custom `AppError` type
- Automatic conversions from `sqlx::Error`, `serde_json::Error`, `anyhow::Error`
- Helper methods: `bad_request()`, `unauthorized()`, `not_found()`, `internal()`
- Implements `IntoResponse` for Axum integration

**Updated Endpoints**:

#### `/health` Endpoint
**Before**:
```rust
.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
```

**After**:
```rust
.map_err(|e| AppError::internal("Failed to get buffer count")
    .with_context(e.to_string()))?
```

#### `/ingest` Endpoint
**Before**:
```rust
.map_err(|_| StatusCode::BAD_REQUEST)?
```

**After**:
```rust
.map_err(|e| AppError::bad_request("Invalid event JSON")
    .with_context(e.to_string()))?
```

**Error Response Examples**:
```json
// Invalid JSON
{
  "error": "Invalid event JSON",
  "details": "expected value at line 1 column 10",
  "status": 400
}

// Buffer failure
{
  "error": "Failed to buffer event",
  "details": "disk full",
  "status": 500
}
```

---

### 3. Edge Coordinator Improvements

**File**: `services/rust-edge-coordinator/src/error.rs` (NEW)

**Enhanced Database Error Handling**:
```rust
impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        match &err {
            sqlx::Error::RowNotFound => {
                AppError::not_found("Resource not found")
                    .with_context("The requested resource does not exist in the database")
            }
            sqlx::Error::Database(db_err) => {
                AppError::internal(format!("Database error: {}", db_err.message()))
                    .with_context(format!("Code: {:?}", db_err.code()))
            }
            _ => AppError::internal("Database operation failed")
                .with_context(err.to_string())
        }
    }
}
```

**Updated Modules**:

#### `registration.rs`
- **Agent registration failures**: "Failed to register edge agent" with agent ID
- **Agent not found**: "Edge agent '{id}' not found" with helpful context
- **List failures**: "Failed to retrieve agent list"

#### `health_monitor.rs`
- **Heartbeat failures**: "Failed to update agent heartbeat" with agent ID
- **Unregistered agents**: "Agent must be registered before sending heartbeats"

#### `main.rs`
- **Config update failures**: "Failed to update agent configuration"
- **Agent not found**: "Edge agent '{id}' not found" with context

---

## Error Types & Status Codes

| Error Type | Status Code | Use Case | Example |
|------------|-------------|----------|---------|
| `bad_request()` | 400 | Invalid input | "Invalid JSON format" |
| `unauthorized()` | 401 | Auth failure | "Invalid API key" |
| `not_found()` | 404 | Resource missing | "Edge agent 'xyz' not found" |
| `internal()` | 500 | Server error | "Database connection failed" |

---

## Usage Examples

### Creating Errors

```rust
// Simple error
AppError::internal("Database failed")

// With context
AppError::internal("Database failed")
    .with_context("Connection pool exhausted")

// Different status
AppError::new("Custom error")
    .with_status(StatusCode::SERVICE_UNAVAILABLE)

// Using helpers
AppError::not_found("Agent not found")
    .with_context("Agent may have been removed")
```

### In Handlers

```rust
async fn my_handler() -> AppResult<Json<Response>> {
    let data = database_query().await
        .map_err(|e| AppError::internal("Query failed")
            .with_context(e.to_string()))?;
    
    Ok(Json(data))
}
```

### Automatic Conversions

```rust
// sqlx::Error automatically converts
let agent = sqlx::query_as!(Agent, "SELECT * FROM agents WHERE id = $1", id)
    .fetch_one(&pool)
    .await?;  // Automatically becomes AppError::not_found()

// serde_json::Error automatically converts
let json = serde_json::to_string(&data)?;  // Becomes AppError::bad_request()
```

---

## Logging

All errors are automatically logged with structured fields:

```
2024-12-01T21:10:00Z ERROR Request error status=404 message="Edge agent 'abc-123' not found" context=Some("The agent may have been removed")
```

**Log Fields**:
- `status` - HTTP status code
- `message` - Main error message
- `context` - Additional context (if provided)

---

## Testing Error Responses

### Test with curl

```bash
# 404 Not Found
curl http://localhost:8085/edge/agents/nonexistent
# Response:
# {
#   "error": "Edge agent 'nonexistent' not found",
#   "details": "The agent may have been removed",
#   "status": 404
# }

# 400 Bad Request
curl -X POST http://localhost:8086/ingest \
  -H "Content-Type: application/json" \
  -d "invalid json{"
# Response:
# {
#   "error": "Invalid event JSON",
#   "details": "expected value at line 1 column 13",
#   "status": 400
# }

# 500 Internal Server Error (simulated)
curl -X POST http://localhost:8086/ingest \
  -H "Authorization: Bearer key" \
  -d '{"event":"test"}'
# If buffer fails:
# {
#   "error": "Failed to buffer event",
#   "details": "SQLite error: database is locked",
#   "status": 500
# }
```

---

## Benefits

### Before (Generic Errors)
```rust
.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
```
- ❌ No context about what failed
- ❌ No logging
- ❌ Generic HTTP status only
- ❌ No structured response

**Response**: `500 Internal Server Error`

### After (Custom Errors)
```rust
.map_err(|e| AppError::internal("Failed to buffer event")
    .with_context(e.to_string()))?
```
- ✅ Clear message: "Failed to buffer event"
- ✅ Context: Original error details
- ✅ Automatic logging with structured fields
- ✅ Proper status code
- ✅ JSON response with details

**Response**:
```json
{
  "error": "Failed to buffer event",
  "details": "SQLite error: database is locked",
  "status": 500
}
```

---

## Files Modified

### Edge Agent
- [src/error.rs](file:///Users/pop7/Code/NDR/services/rust-edge-agent/src/error.rs) - NEW
- [src/main.rs](file:///Users/pop7/Code/NDR/services/rust-edge-agent/src/main.rs) - Updated error handling
- [src/lib.rs](file:///Users/pop7/Code/NDR/services/rust-edge-agent/src/lib.rs) - Exported error module

### Edge Coordinator
- [src/error.rs](file:///Users/pop7/Code/NDR/services/rust-edge-coordinator/src/error.rs) - NEW
- [src/main.rs](file:///Users/pop7/Code/NDR/services/rust-edge-coordinator/src/main.rs) - Updated error handling
- [src/registration.rs](file:///Users/pop7/Code/NDR/services/rust-edge-coordinator/src/registration.rs) - Updated all handlers
- [src/health_monitor.rs](file:///Users/pop7/Code/NDR/services/rust-edge-coordinator/src/health_monitor.rs) - Updated heartbeat errors

---

## Summary

✅ **Custom error type** with context and status codes  
✅ **Descriptive messages** for all error scenarios  
✅ **Automatic logging** with structured fields  
✅ **Consistent JSON responses** across all endpoints  
✅ **Better debugging** with detailed error context  
✅ **Production-ready** error handling

Error messages are now **clear**, **actionable**, and **easy to debug**!
