import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';

import InstituteListStudentsPage from '../../src/pages/admin/InstituteListStudentsPage';
import { getInstituteListDetail, getInstituteListStudents, listInstituteLists } from '../../src/api/superuserApi';

vi.mock('../../src/api/superuserApi', () => ({
  getInstituteListDetail: vi.fn(),
  getInstituteListStudents: vi.fn(),
  listInstituteLists: vi.fn(),
  downloadInstituteListFile: vi.fn(),
  sendInstituteListInvites: vi.fn(),
  sendInstituteListStudentInvite: vi.fn(),
}));

afterEach(() => vi.resetAllMocks());

test('superuser roster reads one list and pages its student rows', async () => {
  getInstituteListDetail.mockResolvedValue({
    list: { list_id: 11, institute_name: 'Test Institute', contact_name: 'Office',
      contact_email: 'office@example.edu', status: 'active', row_count: 31,
      claimed_count: 1, unclaimed_count: 30 },
    invite_counts: { send_eligible: 30, resend_eligible: 30, queued: 0 },
  });
  getInstituteListStudents.mockImplementation((_id, { page }) => Promise.resolve({
    students: [{ id: page, full_name: `Student ${page}`, email: 'student@example.edu', status: 'claimed' }],
    pagination: { page, page_size: 25, total: 31, has_next: page === 1 },
  }));
  render(<MemoryRouter initialEntries={['/admin/institutes/own/lists/11']}>
    <Routes><Route path="/admin/institutes/:instituteId/lists/:listId" element={<InstituteListStudentsPage />} /></Routes>
  </MemoryRouter>);
  expect(await screen.findByText('Student 1')).toBeInTheDocument();
  expect(getInstituteListDetail).toHaveBeenCalledWith('11', undefined);
  expect(listInstituteLists).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(await screen.findByText('Student 2')).toBeInTheDocument();
  expect(getInstituteListStudents).toHaveBeenLastCalledWith('11', expect.objectContaining({ page: 2 }));
});
