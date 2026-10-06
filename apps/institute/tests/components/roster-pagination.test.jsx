import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { expect, test, vi } from 'vitest';

import DashboardPage from '../../src/pages/institute/DashboardPage';
import ListsPage from '../../src/pages/institute/ListsPage';
import ListStudentsPage from '../../src/pages/institute/ListStudentsPage';
import {
  getInstituteListDetail,
  getInstituteListStudents,
  getInstituteListSummary,
  listInstituteLists,
} from '../../src/api/instituteApi';

vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Officer', institute_id: 'own' } }),
}));
vi.mock('../../src/api/instituteApi', () => ({
  getInstituteListDetail: vi.fn(),
  getInstituteListStudents: vi.fn(),
  getInstituteListSummary: vi.fn(),
  listInstituteLists: vi.fn(),
  downloadInstituteListFile: vi.fn(),
  sendInstituteListInvites: vi.fn(),
  sendInstituteListStudentInvite: vi.fn(),
}));

function renderRoute(path, element) {
  render(<MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/institute/dashboard" element={element} />
      <Route path="/institute/lists" element={element} />
      <Route path="/institute/lists/:listId" element={element} /></Routes>
  </MemoryRouter>);
}

test('dashboard uses totals and recent lists from the bounded summary', async () => {
  getInstituteListSummary.mockResolvedValue({
    list_count: 61, total_rows: 3000, claimed_count: 1000, unclaimed_count: 2000,
    recent_lists: [{ list_id: 61, contact_name: 'Office', row_count: 2,
      claimed_count: 1, unclaimed_count: 1 }],
  });
  renderRoute('/institute/dashboard', <DashboardPage />);
  expect(await screen.findByText('3000')).toBeInTheDocument();
  expect(screen.getByText('61 lists in total')).toBeInTheDocument();
  expect(screen.getByText('List #61')).toBeInTheDocument();
  expect(getInstituteListSummary).toHaveBeenCalledWith('own', expect.any(AbortSignal));
  expect(listInstituteLists).not.toHaveBeenCalled();
});

test('uploaded-list index fetches the next page instead of the full directory', async () => {
  listInstituteLists.mockImplementation((_institute, { page }) => Promise.resolve({
    lists: [{ list_id: page, row_count: 1, claimed_count: 0, unclaimed_count: 1,
      contact_name: `Contact ${page}`, contact_email: 'contact@example.edu' }],
    pagination: { page, page_size: 25, total: 26, has_next: page === 1 },
  }));
  renderRoute('/institute/lists', <ListsPage />);
  expect(await screen.findByText('List #1')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(await screen.findByText('List #2')).toBeInTheDocument();
  expect(listInstituteLists).toHaveBeenLastCalledWith('own', expect.objectContaining({ page: 2 }));
});

test('roster gets selected-list metadata directly and uses whole-list invite counts', async () => {
  getInstituteListDetail.mockResolvedValue({
    list: { list_id: 11, contact_name: 'Office', contact_email: 'office@example.edu',
      status: 'active', row_count: 31, claimed_count: 1, unclaimed_count: 30 },
    invite_counts: { send_eligible: 30, resend_eligible: 30, queued: 0 },
  });
  getInstituteListStudents.mockImplementation((_listId, { page }) => Promise.resolve({
    students: [{ id: page, full_name: `Student ${page}`, email: `student${page}@example.edu`, status: 'claimed' }],
    pagination: { page, page_size: 25, total: 31, has_next: page === 1 },
  }));
  renderRoute('/institute/lists/11', <ListStudentsPage />);
  expect(await screen.findByText('Student 1')).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Send invites', exact: true })).toBeEnabled();
  expect(getInstituteListDetail).toHaveBeenCalledWith('11', expect.any(AbortSignal));
  expect(listInstituteLists).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(await screen.findByText('Student 2')).toBeInTheDocument();
  expect(getInstituteListStudents).toHaveBeenLastCalledWith('11', expect.objectContaining({ page: 2 }));
});
