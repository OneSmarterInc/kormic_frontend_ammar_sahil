import { test as base, expect } from '@playwright/test';
export { expect };
export const portal = 'university';
export const home = '/university/7/dashboard';
export const management = '/university/7/settings/knowledge-base';
export const test = base.extend({
  api: [async ({ page }, use) => {
    const state = {
      authenticated: false, user: { id: 1, name: 'Test Operator', email: 'operator@example.test', role: portal, totp_enrolled: true, university_id: 7, institute_id: 7 },
      calls: [], unexpected: [], facts: [], institutes: [], students: [], lists: [], deleteConflict: false,
    };
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', async route => {
      const request = route.request(); const method = request.method();
      const path = new URL(request.url()).pathname.replace(/^\/api/, '');
      const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (method === 'OPTIONS') return route.fulfill({ status: 204 });
      const body = request.headers()['content-type']?.includes('application/json') ? request.postDataJSON() : request.postData();
      state.calls.push({ method, path, body });
      if (path === '/auth/web/csrf/' && method === 'GET') return json({ csrfToken: 'test-csrf' });
      if (path.startsWith('/auth/web/') && method === 'POST') {
        expect(request.headers()['x-csrftoken']).toBe('test-csrf'); expect(body.portal).toBe(portal);
        if (path === '/auth/web/refresh/') return state.authenticated ? json({ access: 'test-access' }) : json({ detail: 'No session' }, 401);
        if (path === '/auth/web/login/') {
          expect(body.email).toBe('operator@example.test');
          return body.password === 'Test-password-123!' ? json({ totp_required: true, mfa_token: 'challenge' }) : json({ detail: 'Invalid credentials' }, 401);
        }
        if (path === '/auth/web/verify-totp/') {
          expect(body.mfa_token).toBe('challenge');
          if (body.code !== '123456') return json({ detail: 'Invalid code' }, 400);
          state.authenticated = true; return json({ access: 'test-access', user: state.user });
        }
        if (path === '/auth/web/logout/') { state.authenticated = false; return json({}); }
      }
      expect(request.headers().authorization).toBe('Bearer test-access');
      if (path === '/auth/me/' && method === 'GET') return json(state.user);
      if (method === 'GET') {
        const data = {
          '/superuser/students/': { students: [] }, '/superuser/universities/': { universities: [] }, '/superuser/users/': { users: [] },
          '/superuser/institutes/': { institutes: state.institutes },
          '/institute-lists/lists/': { lists: state.lists }, '/institute-lists/lists/11/students/': { students: state.students },
          '/university-admin/profile/': { id: 7, name: 'Test University', setup_status: {} },
          '/university/7/profiles/': { profiles: [] }, '/university/7/queries/active/': { queries: [] },
          '/university-admin/knowledge/': { knowledge: state.facts },
          '/university-admin/knowledge/sections/': { sections: [{ section: 'manual', count: state.facts.length }] },
          '/university-admin/knowledge/urls/': { urls: [] },
        };
        if (path in data) return json(data[path]);
        if (path === '/superuser/institutes/11/') return json(state.institutes.find(i => i.id === 11));
      }
      if (path === '/superuser/institutes/' && method === 'POST') {
        expect(body).toMatchObject({ institution_name: 'Test Institute', email: 'admin@example.test', password: 'Test-password-123!' });
        const institute = { id: 11, name: body.institution_name, admin_email: body.email, admin_is_active: true, admin_totp_enrolled: false, contact_email: '', contact_phone: '', address: '' };
        state.institutes.push(institute); return json(institute, 201);
      }
      if (path === '/superuser/institutes/11/' && method === 'PATCH') {
        Object.assign(state.institutes[0], body); return json(state.institutes[0]);
      }
      if (path === '/superuser/institutes/11/' && method === 'DELETE') {
        if (state.deleteConflict) return json({ detail: 'Institute still has an admin account' }, 409);
        state.institutes = []; return route.fulfill({ status: 204 });
      }
      if (path === '/university-admin/knowledge/' && method === 'POST') {
        const fact = { ...body, id: 11, source_type: 'manual', times_used: 0 }; state.facts.push(fact); return json(fact, 201);
      }
      if (path === '/university-admin/knowledge/11/' && method === 'PATCH') { Object.assign(state.facts[0], body); return json(state.facts[0]); }
      if (path === '/university-admin/knowledge/11/' && method === 'DELETE') {
        if (state.deleteConflict) return json({ detail: 'Please retry deletion' }, 409);
        state.facts = []; return route.fulfill({ status: 204 });
      }
      if (path === '/institute-lists/upload/' && method === 'POST') {
        expect(body).toContain('roster.csv'); expect(body).toContain('Ada Student'); expect(body).toContain('name="institute_id"');
        state.lists = [{ list_id: 11, row_count: 1, claimed_count: 0, unclaimed_count: 1, status: 'active', contact_name: 'Roster Admin', contact_email: 'roster@example.test' }];
        state.students = [{ id: 21, full_name: 'Ada Student', email: 'ada@example.test', status: 'unclaimed', invited_at: null }];
        return json({ list_id: 11, accepted: 1, rejected: [{ row: 3, reason: 'Invalid email' }], skipped_claimed: [] }, 201);
      }
      if (path === '/institute-lists/lists/11/send-invites/' && method === 'POST') {
        state.students[0].invited_at = '2026-01-01T00:00:00Z'; state.students[0].status = 'invited'; return json({ invites_sent: 1 });
      }
      state.unexpected.push(`${method} ${path}`); return json({ detail: `Unexpected test request: ${method} ${path}` }, 500);
    });
    await use(state);
    expect(state.unexpected, 'Every API request must have an explicit fixture').toEqual([]);
    expect(errors, 'Uncaught browser errors').toEqual([]);
  }, { auto: true }],
});
