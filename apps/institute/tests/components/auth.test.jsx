import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from '../../src/pages/auth/LoginPage';
import { RequireAuth, RequireRole } from '../../src/components/auth/guards';
const { auth } = vi.hoisted(() => ({ auth: {} }));
vi.mock('../../src/context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }));
beforeEach(() => Object.assign(auth, { status: 'guest', user: { role: 'institute', university_id: 7 }, loginWithPassword: vi.fn(), completeTotpLogin: vi.fn() }));
function login() {
  render(<MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<Login />} /><Route path="/totp/enroll" element={<p>Enrollment required</p>} /><Route path="*" element={<p>Signed in</p>} /></Routes></MemoryRouter>);
  return userEvent.setup();
}
async function password(user) {
  await user.type(screen.getByLabelText(/email/i), 'operator@example.test');
  await user.type(screen.getByLabelText(/^Password/i), 'Test-password-123!');
  await user.click(screen.getByRole('button', { name: 'Continue' }));
}
test('invalid password never advances to TOTP', async () => {
  auth.loginWithPassword.mockRejectedValue(new Error('Invalid credentials'));
  await password(login());
  expect(await screen.findByText('Invalid credentials')).toBeVisible();
  expect(screen.queryByLabelText(/^Code/)).not.toBeInTheDocument();
  expect(auth.completeTotpLogin).not.toHaveBeenCalled();
});
test('password challenge, invalid TOTP, then successful verification', async () => {
  auth.loginWithPassword.mockResolvedValue({ mfaToken: 'challenge' });
  auth.completeTotpLogin.mockRejectedValueOnce(new Error('Invalid code')).mockResolvedValueOnce({ role: 'institute', university_id: 7, name: 'Operator' });
  const user = login(); await password(user);
  expect(auth.loginWithPassword).toHaveBeenCalledWith('operator@example.test', 'Test-password-123!');
  await user.type(await screen.findByLabelText(/^Code/), '000000');
  await user.click(screen.getByRole('button', { name: 'Verify' }));
  expect(await screen.findByText('Invalid code')).toBeVisible();
  await user.clear(screen.getByLabelText(/^Code/)); await user.type(screen.getByLabelText(/^Code/), '123456');
  await user.click(screen.getByRole('button', { name: 'Verify' }));
  expect(auth.completeTotpLogin).toHaveBeenLastCalledWith('challenge', '123456');
  expect(await screen.findByText('Signed in')).toBeVisible();
});
test('new operator is directed to enrollment', async () => {
  auth.loginWithPassword.mockResolvedValue({ mustEnrollTotp: true });
  await password(login());
  expect(await screen.findByText('Enrollment required')).toBeVisible();
});
function guard() {
  render(<MemoryRouter initialEntries={['/private']}><Routes><Route element={<RequireAuth />}><Route element={<RequireRole role="institute" />}><Route path="/private" element={<p>Protected content</p>} /></Route></Route><Route path="*" element={<p>Access redirected</p>} /></Routes></MemoryRouter>);
}
test.each(['guest', 'must_enroll_totp', 'initializing'])('guard hides content while %s', (status) => {
  auth.status = status; guard(); expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  expect(screen.getByText(status === 'initializing' ? 'Loading...' : 'Access redirected')).toBeVisible();
});
test('guard admits the correct role', () => {
  auth.status = 'authenticated'; guard(); expect(screen.getByText('Protected content')).toBeVisible();
});
test('guard rejects an authenticated account with another role', () => {
  auth.status = 'authenticated'; auth.user.role = 'student'; guard(); expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
});
