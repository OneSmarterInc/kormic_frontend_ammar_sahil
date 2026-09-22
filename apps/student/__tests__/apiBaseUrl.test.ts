import { resolveApiBaseUrl } from '../src/services/apiBaseUrl';

test.each([
  ['http://127.0.0.1:8000/api', 'localhost', 'http://localhost:8000/api'],
  ['http://localhost:8000/api', '127.0.0.1', 'http://127.0.0.1:8000/api'],
  ['http://localhost:8000/api', 'localhost', 'http://localhost:8000/api'],
  ['https://127.0.0.1:8443/api', 'localhost', 'https://localhost:8443/api'],
])('keeps loopback browser cookies same-site: %s on %s', (configured, hostname, expected) => {
  expect(resolveApiBaseUrl(configured, hostname)).toBe(expected);
});

test.each([
  ['http://127.0.0.1:8000/api', undefined],
  ['http://10.0.2.2:8000/api', undefined],
  ['https://backend.kormic.ai/api', 'localhost'],
  ['http://127.0.0.1:8000/api', 'app.kormic.ai'],
  ['http://192.168.1.2:8000/api', 'localhost'],
  ['/api', 'localhost'],
])('preserves native, remote, and relative configuration: %s on %s', (configured, hostname) => {
  expect(resolveApiBaseUrl(configured, hostname)).toBe(configured);
});
