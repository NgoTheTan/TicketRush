import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 120,
  iterations: 120,
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8080';
const EVENT_ID = __ENV.EVENT_ID || '1';

export default function () {
  const id = __VU;
  const email = `queueuser${id}@ticketrush.io`;

  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      email,
      password: 'password123',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  check(loginRes, {
    'login ok': (r) => r.status === 200,
  });

  if (loginRes.status !== 200 || !loginRes.body) {
    console.error(`Login failed: ${email}, status=${loginRes.status}, body=${loginRes.body}`);
    return;
  }

  const token = loginRes.json('data.token');

  const joinRes = http.post(
    `${BASE_URL}/api/v1/queue/${EVENT_ID}/join`,
    null,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  check(joinRes, {
    'join queue created': (r) => r.status === 201,
  });

  if (joinRes.status !== 201) {
    console.error(`Join failed: ${email}, status=${joinRes.status}, body=${joinRes.body}`);
  }

  sleep(0.2);
}