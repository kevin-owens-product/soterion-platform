import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 1000 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<100'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const payload = JSON.stringify({
    sensor_id: 'uuid-here',
    facility_id: 'uuid-here',
    timestamp: new Date().toISOString(),
    points: Array.from({length: 100}, (_, i) => ({x: Math.random()*50, y: Math.random()*50, z: Math.random()*3})),
    track_objects: [{
      track_id: `track-${__VU}-${__ITER}`,
      centroid: {x: Math.random()*50, y: Math.random()*50, z: 1.7},
      classification: 'PERSON',
      velocity_ms: Math.random() * 2,
      behavior_score: Math.random() * 100,
      dwell_secs: Math.floor(Math.random() * 300),
    }],
  });

  const res = http.post('http://localhost:3001/api/v1/lidar/ingest', payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'dev-api-key',
    },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has receipt_id': (r) => JSON.parse(r.body).receipt_id !== undefined,
  });
}
