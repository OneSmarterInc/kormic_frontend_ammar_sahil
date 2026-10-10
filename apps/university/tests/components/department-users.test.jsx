import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import DepartmentUsers from '../../src/components/university/DepartmentUsers';
import { validationMessage } from '@kormic/portal-core/apiErrors.js';
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../src/api/client', () => ({ default: api }));

test('serializer errors are readable, including nested and non-field errors', () => {
  expect(validationMessage({ password: ['This password is too common.'], email: ['Already exists.'] })).toBe('password: This password is too common. email: Already exists.');
  expect(validationMessage({ departments: { 0: ['Invalid choice.'] } })).toBe('departments: 0: Invalid choice.');
  expect(validationMessage({ non_field_errors: ['Please retry.'] })).toBe('Please retry.');
});

test('shows password validation, preserves the draft and allows a corrected retry', async () => {
  api.get.mockResolvedValue({ data: { users: [] } });
  api.post.mockRejectedValueOnce({ status: 400, message: 'password: This password is too common.', data: { password: ['This password is too common.'] } }).mockResolvedValueOnce({ data: { id: 1 } });
  const user = userEvent.setup();
  render(<DepartmentUsers groups={[{ slug: 'admissions', label: 'Admissions' }]} />);
  await user.click(screen.getByRole('button', { name: 'Create user' }));
  await user.type(screen.getByLabelText('Full name'), 'Test officer');
  await user.type(screen.getByLabelText('Email'), 'officer@example.com');
  await user.type(screen.getByLabelText('Password'), 'password123');
  await user.click(screen.getByRole('checkbox', { name: 'Admissions' }));
  await user.click(screen.getByRole('button', { name: 'Create department user' }));
  expect(await screen.findByText('This password is too common.')).toBeVisible();
  expect(screen.getByLabelText('Email')).toHaveValue('officer@example.com');
  expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
  await user.clear(screen.getByLabelText('Password'));
  await user.type(screen.getByLabelText('Password'), 'Corrected-uncommon-pass!42');
  await user.click(screen.getByRole('button', { name: 'Create department user' }));
  await waitFor(() => expect(screen.queryByLabelText('Password')).not.toBeInTheDocument());
  expect(api.post).toHaveBeenLastCalledWith('/university-admin/department-users/', expect.objectContaining({ departments: ['admissions'], password: 'Corrected-uncommon-pass!42' }));
});
