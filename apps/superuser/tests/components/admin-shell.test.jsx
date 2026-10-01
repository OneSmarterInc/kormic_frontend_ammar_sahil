import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from '../../src/layouts/AdminLayout';
import UpdateInformationPage from '../../src/pages/admin/UpdateInformationPage';
import ErrorBanner from '../../src/components/common/ErrorBanner';
import client from '../../src/api/client';
vi.mock('../../src/api/client', () => ({default:{get:vi.fn()}}));
vi.mock('../../src/context/AuthContext', () => ({useAuth:()=>({user:{name:'Admin',role:'superuser'},logout:vi.fn()})}));
vi.mock('@kormic/portal-core/components/notifications/NotificationBell.jsx', () => ({default:()=>null}));
beforeEach(() => {localStorage.clear(); vi.clearAllMocks();});
function shell(desktop) {
  window.matchMedia = vi.fn(() => ({matches:desktop,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
  render(<MemoryRouter initialEntries={['/admin/dashboard']}><Routes><Route path="/admin" element={<AdminLayout/>}><Route path="dashboard" element={<p>Dashboard content</p>}/><Route path="settings" element={<p>Settings content</p>}/></Route></Routes></MemoryRouter>);
  return userEvent.setup();
}
test('desktop navigation closes, reopens and persists the preference', async () => {
  const user = shell(true);
  await user.click(screen.getByRole('button',{name:'Close navigation'}));
  expect(screen.getByRole('button',{name:'Open navigation'})).toHaveAttribute('aria-expanded','false');
  expect(localStorage.getItem('kormic.admin.sidebar.collapsed')).toBe('true');
  expect(screen.getByRole('main')).not.toHaveClass('ml-72');
  await user.click(screen.getByRole('button',{name:'Open navigation'}));
  expect(screen.getByRole('main')).toHaveClass('ml-72');
});
test('mobile drawer includes settings, supports Escape and restores focus', async () => {
  const user = shell(false);
  const toggle = screen.getByRole('button',{name:'Open navigation'});
  await user.click(toggle);
  const drawer = screen.getByRole('dialog',{name:'Admin navigation'});
  expect(within(drawer).getByRole('link',{name:'Settings'})).toBeVisible();
  expect(document.body.style.overflow).toBe('hidden');
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(toggle).toHaveFocus();
  expect(document.body.style.overflow).toBe('');
});
test('retry is separate from dismissal', async () => {
  const retry=vi.fn(), dismiss=vi.fn();
  render(<ErrorBanner error="Failed" onRetry={retry} onDismiss={dismiss}/>);
  const user=userEvent.setup(); await user.click(screen.getByRole('button',{name:'Retry'}));
  expect(retry).toHaveBeenCalledTimes(1); expect(dismiss).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button',{name:'Dismiss'})); expect(dismiss).toHaveBeenCalledTimes(1);
});
test('research paging preserves an edited freshness policy', async () => {
  client.get.mockImplementation(async url => ({data:url.endsWith('/universities/') ? {results:[],count:30,total_pages:2} : {refresh_days:30}}));
  render(<UpdateInformationPage/>);
  const user=userEvent.setup();
  const input=screen.getByRole('spinbutton');
  await screen.findByText('No public university research yet.');
  await user.clear(input); await user.type(input,'45');
  await user.click(screen.getByRole('button',{name:'Next'}));
  await screen.findByText('Page 2 of 2');
  expect(input).toHaveValue(45);
  expect(client.get.mock.calls.filter(([url])=>url==='/superuser/update-information/')).toHaveLength(1);
});
