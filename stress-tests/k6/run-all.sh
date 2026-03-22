#!/bin/bash
# Run all k6 stress tests
# Usage: ./stress-tests/k6/run-all.sh [BASE_URL]

BASE_URL=${1:-http://localhost:4000}
WS_URL=${2:-ws://localhost:4000/ws}
RESULTS_DIR="stress-tests/results/$(date +%Y%m%d_%H%M%S)"

mkdir -p "$RESULTS_DIR"

echo "=== RISEx Stress Tests ==="
echo "API: $BASE_URL"
echo "WS:  $WS_URL"
echo "Results: $RESULTS_DIR"
echo ""

# Run API load test
echo "[1/3] Running API load test..."
k6 run \
  --env BASE_URL="$BASE_URL" \
  --out json="$RESULTS_DIR/api-load.json" \
  --summary-export="$RESULTS_DIR/api-load-summary.json" \
  stress-tests/k6/scenarios/api-load.js
echo ""

# Run WebSocket test
echo "[2/3] Running WebSocket load test..."
k6 run \
  --env WS_URL="$WS_URL" \
  --out json="$RESULTS_DIR/websocket.json" \
  --summary-export="$RESULTS_DIR/websocket-summary.json" \
  stress-tests/k6/scenarios/websocket-load.js
echo ""

# Run bot simulation
echo "[3/3] Running bot message simulation..."
k6 run \
  --env BASE_URL="$BASE_URL" \
  --out json="$RESULTS_DIR/bot-sim.json" \
  --summary-export="$RESULTS_DIR/bot-sim-summary.json" \
  stress-tests/k6/scenarios/bot-simulation.js

echo ""
echo "=== All tests complete. Results in $RESULTS_DIR ==="
