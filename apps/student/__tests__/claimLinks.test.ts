import { getClaimTokenFromUrl } from '../src/utils/claimLinks';

describe('invitation deep links', () => {
  it.each([
    'https://app.kormic.ai/claim?token=invite%2B123',
    'https://app.kormic.ai/claim/?token=invite%2B123',
    'kormicstudent://claim?token=invite%2B123',
    'https://backend.kormic.ai/claim?token=invite%2B123',
    'https://app.kormic.ai/claim#token=invite%2B123',
  ])('preserves the token for %s', url => {
    expect(getClaimTokenFromUrl(url)).toBe('invite+123');
  });

  it.each([
    undefined, '', 'not a url',
    'https://evil.example/claim?token=secret',
    'https://app.kormic.ai.evil.example/claim?token=secret',
    'https://app.kormic.ai@evil.example/claim?token=secret',
    'https://user@app.kormic.ai/claim?token=secret',
    'http://app.kormic.ai/claim?token=secret',
    'https://app.kormic.ai:9999/claim?token=secret',
    'https://app.kormic.ai/claim-other?token=secret',
    'https://app.kormic.ai/other/claim?token=secret',
    'kormicstudent://claim-other?token=secret',
    'kormicstudent://claim/other?token=secret',
    'https://app.kormic.ai/claim?token=a&token=b',
    'https://app.kormic.ai/claim?token=',
    'https://app.kormic.ai/claim?token=a%00b',
    'https://app.kormic.ai/claim?token=%ZZ',
    `https://app.kormic.ai/claim?token=${'a'.repeat(2049)}`,
  ])('rejects invalid or unrelated links: %s', url => {
    expect(getClaimTokenFromUrl(url)).toBe('');
  });

  it('accepts local development links without adding unverifiable Android hosts', () => {
    expect(getClaimTokenFromUrl('http://127.0.0.1:8081/claim?token=local')).toBe('local');
  });

  it('does not depend on browser-only URL parsing for native custom schemes', () => {
    const urlSpy = jest.spyOn(globalThis, 'URL').mockImplementation(() => {
      throw new Error('Native URL parsing is unavailable');
    });
    try {
      expect(getClaimTokenFromUrl('kormicstudent://claim?token=abc%2B123%3D')).toBe('abc+123=');
      expect(getClaimTokenFromUrl('https://app.kormic.ai/claim?token=abc=123')).toBe('abc=123');
    } finally {
      urlSpy.mockRestore();
    }
  });
});
