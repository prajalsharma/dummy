/**
 * k6 WebSocket Load Test
 *
 * Simulates 500 concurrent WebSocket connections sending 500 msgs/sec
 * Run: k6 run --env WS_URL=ws://localhost:4000/ws stress-tests/k6/scenarios/websocket-load.js
 */
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const wsMessages = new Counter('ws_messages');
const wsErrors = new Rate('ws_errors');

const WS_URL = __ENV.WS_URL || 'ws://localhost:4000/ws';

export const options = {
  scenarios: {
    websocket_connections: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 500 },
        { duration: '5m', target: 500 }, // hold
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    ws_errors: ['rate<0.05'],
    ws_session_duration: ['p(95)<10000'],
  },
};

export default function () {
  const userId = `user-${__VU}`;
  const url = `${WS_URL}?userId=${userId}`;

  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      socket.setInterval(() => {
        socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        wsMessages.add(1);
      }, 2000); // ping every 2s → ~250 VUs × 0.5/s = 125 msgs/s per iteration
    });

    socket.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        check(msg, { 'received valid message': (m) => !!m.type });
        wsMessages.add(1);
      } catch {
        wsErrors.add(1);
      }
    });

    socket.on('error', () => {
      wsErrors.add(1);
    });

    // Keep connection for 30 seconds
    socket.setTimeout(() => {
      socket.close();
    }, 30000);
  });

  check(res, { 'websocket connected': (r) => r && r.status === 101 });

  sleep(1);
}
