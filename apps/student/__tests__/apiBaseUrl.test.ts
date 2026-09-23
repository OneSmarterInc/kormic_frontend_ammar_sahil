import { resolveApiBaseUrl } from '../src/services/apiBaseUrl';

test.each([
  ['http://127.0.0.1:8000/api', 'localhost', 'http://localhost:8000/api'],
  ['http://localhost:8000/api', '127.0.0.1', 'http://127.0.0.1:8000/api'],
  ['https://backend.kormic.ai/api', 'localhost', 'http://localhost:8000/api'],
  ['https://backend.kormic.ai/api', '127.0.0.1', 'http://127.0.0.1:8000/api'],
])('keeps loopback browser cookies same-site: %s on %s', (configured, hostname, expected) => {
  expect(resolveApiBaseUrl(configured, hostname)).toBe(expected);
});

test.each([
  ['http://127.0.0.1:8000/api', undefined],
  ['http://10.0.2.2:8000/api', undefined],
  ['http://127.0.0.1:8000/api', 'app.kormic.ai'],
  ['/api', 'app.kormic.ai'],
])('preserves non-browser configuration: %s on %s', (configured, hostname) => {
  expect(resolveApiBaseUrl(configured, hostname)).toBe(configured);
});
