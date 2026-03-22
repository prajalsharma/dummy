/**
 * k6 Bot Message Simulation
 *
 * Simulates Telegram bot receiving 500+ messages/sec
 * This hits the internal bot endpoints / Redis queues
 * Run: k6 run stress-tests/k6/scenarios/bot-simulation.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const messagesSent = new Counter('bot_messages');
const messageErrors = new Rate('bot_message_errors');
const processingTime = new Trend('bot_processing_ms');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export const options = {
  scenarios: {
    bot_messages: {
      executor: 'constant-arrival-rate',
      rate: 500,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 100,
      maxVUs: 300,
    },
  },
  thresholds: {
    bot_message_errors: ['rate<0.02'],
    bot_processing_ms: ['p(95)<200', 'p(99)<500'],
    http_req_duration: ['p(95)<300'],
  },
};

const COMMANDS = [
  { cmd: 'markets', weight: 30 },
  { cmd: 'balance', weight: 20 },
  { cmd: 'positions', weight: 20 },
  { cmd: 'leaderboard', weight: 15 },
  { cmd: 'long BTC 100 10', weight: 8 },
  { cmd: 'short ETH 50 5', weight: 7 },
];

function weightedCommand() {
  const total = COMMANDS.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of COMMANDS) {
    r -= c.weight;
    if (r <= 0) return c.cmd;
  }
  return 'markets';
}

export default function () {
  const userId = Math.floor(Math.random() * 10000);
  const cmd = weightedCommand();
  const start = Date.now();

  // Simulate bot webhook-style call to API
  const path = cmd.startsWith('markets') ? '/api/v1/markets'
    : cmd.startsWith('leaderboard') ? '/api/v1/leaderboard?limit=10'
    : `/api/v1/user/by-wallet/0x${userId.toString(16).padStart(40, '0')}`;

  const res = http.get(`${BASE_URL}${path}`);

  processingTime.add(Date.now() - start);
  messagesSent.add(1);

  const ok = check(res, { 'bot cmd responded': (r) => r.status < 500 });
  messageErrors.add(!ok);
}
