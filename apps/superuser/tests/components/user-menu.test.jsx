import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import UserDetailPage from '../../src/pages/admin/UserDetailPage';
import * as api from '../../src/api/superuserApi';

vi.mock('../../src/api/superuserApi', () => ({ getUser: vi.fn(), updateUser: vi.fn(), deleteUser: vi.fn(), deleteStudent: vi.fn(), resetUserPassword: vi.fn(), removeUserTotp: vi.fn(), revokeUserSessions: vi.fn(), setUserActive: vi.fn() }));
vi.mock('../../src/context/AuthContext', () => ({ useAuth: () => ({user: {id: 1}}) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
const account = {user_id: 7, name: 'Test Student', email: 'student@example.test', role: 'student', student_id: 'student-uuid', is_active: true, totp_enrolled: true};
beforeEach(() => { api.getUser.mockResolvedValue({...account}); });
async function open() {
  render(<MemoryRouter initialEntries={['/admin/users/7']}><Routes><Route path='/admin/users/:userId' element={<UserDetailPage />} /><Route path='/admin/users' element={<p>User list</p>} /></Routes></MemoryRouter>);
  await screen.findByRole('button', {name:'Edit details'});
  return userEvent.setup();
}
test('edits details and renders the saved account', async () => {
  api.updateUser.mockResolvedValue({...account, name:'Updated Student'});
  const user = await open(); await user.click(screen.getByRole('button', {name:'Edit details'}));
  const dialog = within(screen.getByRole('dialog'));
  await user.clear(dialog.getByLabelText(/Full name/)); await user.type(dialog.getByLabelText(/Full name/), 'Updated Student');
  await user.click(dialog.getByRole('button', {name:'Save changes'}));
  expect(api.updateUser).toHaveBeenCalledWith(7, {name:'Updated Student', email:account.email});
  expect(await screen.findByRole('heading', {name:'Updated Student'})).toBeVisible();
});
test('password reset submits a valid password and displays backend errors', async () => {
  api.resetUserPassword.mockRejectedValueOnce({message:'This password is too common.'}).mockResolvedValueOnce(account);
  const user = await open(); await user.click(screen.getByRole('button', {name:'Reset password'}));
  const dialog = within(screen.getByRole('dialog'));
  await user.type(dialog.getByLabelText(/New password/), 'Updated-password-93!');
  await user.click(dialog.getByRole('button', {name:'Reset password'}));
  expect(await screen.findByText('This password is too common.')).toBeVisible();
  await user.click(dialog.getByRole('button', {name:'Reset password'}));
  expect(api.resetUserPassword).toHaveBeenCalledWith(7, 'Updated-password-93!');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
test('TOTP removal updates the enrollment badge', async () => {
  api.removeUserTotp.mockResolvedValue({...account, totp_enrolled:false});
  const user = await open(); await user.click(screen.getByRole('button', {name:'Remove 2FA'}));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', {name:'Remove 2FA'}));
  expect(api.removeUserTotp).toHaveBeenCalledWith(7);
  expect(await screen.findByText('2FA not enrolled')).toBeVisible();
});
test.each([['Delete account', 'Delete permanently', 'deleteUser', 7], ['Delete profile', 'Delete profile permanently', 'deleteStudent', 'student-uuid']])('%s requires confirmation and calls the correct endpoint', async (button, confirm, method, id) => {
  api[method].mockResolvedValue({});
  const user = await open(); await user.click(screen.getByRole('button', {name:button, exact:true}));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', {name:'Cancel'}));
  expect(api[method]).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', {name:button, exact:true}));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', {name:confirm}));
  expect(api[method]).toHaveBeenCalledWith(id);
  expect(await screen.findByText('User list')).toBeVisible();
});
