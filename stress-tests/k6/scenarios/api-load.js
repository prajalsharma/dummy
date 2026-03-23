/**
 * k6 Load Test — RISEx API Server
 *
 * Simulates 10,000 concurrent users hitting the API
 * Run: k6 run --env BASE_URL=http://localhost:4000 stress-tests/k6/scenarios/api-load.js
 */
import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const orderLatency = new Trend('order_latency_ms');
const wsMessageCount = new Counter('ws_messages_received');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:4000/ws';

export const options = {
  scenarios: {
    // Ramp up to 10k users
    api_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500 },
        { duration: '5m', target: 2000 },
        { duration: '10m', target: 10000 },
        { duration: '5m', target: 10000 }, // steady state
        { duration: '3m', target: 0 },     // cooldown
      ],
      gracefulRampDown: '30s',
    },

    // Constant 100 trades/sec
    trade_requests: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '20m',
      preAllocatedVUs: 200,
      maxVUs: 500,
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    error_rate: ['rate<0.05'],
    order_latency_ms: ['p(95)<800'],
  },
};

// Shared user pool
const USERS = Array.from({ length: 1000 }, (_, i) => ({
  userId: `user-${i}`,
  address: `0x${i.toString(16).padStart(40, '0')}`,
}));

function randomUser() {
  return USERS[Math.floor(Math.random() * USERS.length)];
}

function randomMarket() {
  const markets = ['BTC-USDC', 'ETH-USDC', 'SOL-USDC'];
  return markets[Math.floor(Math.random() * markets.length)];
}

export default function () {
  const user = randomUser();

  group('Markets API', () => {
    const res = http.get(`${BASE_URL}/api/v1/markets`, {
      headers: { 'Content-Type': 'application/json' },
    });
    const ok = check(res, {
      'markets status 200': (r) => r.status === 200,
      'markets has data': (r) => {
        try { return Array.isArray(JSON.parse(r.body)); } catch { return false; }
      },
    });
    errorRate.add(!ok);
  });

  sleep(0.1);

  group('Leaderboard API', () => {
    const res = http.get(`${BASE_URL}/api/v1/leaderboard?limit=20`);
    check(res, { 'leaderboard status 200': (r) => r.status === 200 });
  });

  sleep(0.1);

  group('User API', () => {
    const res = http.get(`${BASE_URL}/api/v1/user/by-wallet/${user.address}`);
    // 404 is valid (user not found)
    check(res, { 'user api responds': (r) => r.status < 500 });
  });

  sleep(0.2);
}

export function tradeScenario() {
  const user = randomUser();
  const market = randomMarket();
  const side = Math.random() > 0.5 ? 'long' : 'short';
  const margin = Math.floor(Math.random() * 900) + 100;
  const leverage = [1, 2, 5, 10, 20, 50][Math.floor(Math.random() * 6)];

  const start = Date.now();

  const res = http.post(
    `${BASE_URL}/api/v1/trades`,
    JSON.stringify({
      userId: user.userId,
      market,
      side,
      type: 'market',
      marginUSDC: margin,
      leverage,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  orderLatency.add(Date.now() - start);

  check(res, {
    'trade responded': (r) => r.status < 500,
  });

  sleep(0.01);
}
