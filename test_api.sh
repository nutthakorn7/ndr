#!/bin/bash

BASE_URL="http://localhost:8081"
AUTH_HEADER="Authorization: Bearer mock-token" # Assuming mock auth or we need to login first

echo "Starting Backend API Test..."

test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo "---------------------------------------------------"
    echo "Testing: $description ($method $endpoint)"
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH_HEADER" "$BASE_URL$endpoint")
    elif [ "$method" == "POST" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH_HEADER" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    fi

    if [ "$response" == "200" ] || [ "$response" == "201" ]; then
        echo "✅ PASS (Status: $response)"
    else
        echo "❌ FAIL (Status: $response)"
        # Print body for debugging if failed
        if [ "$method" == "GET" ]; then
            curl -s -H "$AUTH_HEADER" "$BASE_URL$endpoint"
        elif [ "$method" == "POST" ]; then
            curl -s -H "$AUTH_HEADER" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint"
        fi
        echo ""
    fi
}

# Health Check
test_endpoint "GET" "/health" "" "Health Check"

# Events
test_endpoint "POST" "/events" '{"limit": 10}' "Get Events"

# Alerts
test_endpoint "GET" "/alerts" "" "Get Alerts"
test_endpoint "GET" "/alerts/alert-001" "" "Get Specific Alert"
test_endpoint "GET" "/alerts/stats/summary" "" "Get Alert Stats"

# Assets
test_endpoint "GET" "/assets" "" "Get Assets"

# Analytics
test_endpoint "GET" "/analytics/dashboard" "" "Dashboard Analytics"
test_endpoint "GET" "/stats/traffic" "" "Traffic Stats"
test_endpoint "GET" "/stats/protocols" "" "Protocol Stats"

# Sensors
test_endpoint "GET" "/sensors" "" "Get Sensors"

# Saved Searches
test_endpoint "GET" "/searches" "" "Get Saved Searches"
test_endpoint "POST" "/searches" '{"name": "Test Search", "query": {"q": "test"}, "visualization_type": "table"}' "Save Search"

# AI Proxy (Might fail if AI service is down, but testing the proxy route)
test_endpoint "POST" "/ai/triage" '{"alertId": "alert-001"}' "AI Triage"

echo "---------------------------------------------------"
echo "Test Complete."
