import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import InstitutesListPage from '../../src/pages/admin/InstitutesListPage';
import RosterStudentsPage from '../../src/pages/admin/RosterStudentsPage';
import { listInstitutes, listRosterStudents } from '../../src/api/superuserApi';

vi.mock('../../src/api/superuserApi', () => ({
  listInstitutes: vi.fn(),
  listRosterStudents: vi.fn(),
  deleteInstitute: vi.fn(),
}));

afterEach(() => { cleanup(); vi.resetAllMocks(); });

test('superuser institute directory requests and displays successive server pages', async () => {
  listInstitutes.mockImplementation(({ page }) => Promise.resolve({
    institutes: [{ id: String(page), name: page === 1 ? 'Alpha Institute' : 'Beta Institute' }],
    pagination: { page, page_size: 25, total: 26, has_next: page === 1 },
  }));

  render(<MemoryRouter><InstitutesListPage /></MemoryRouter>);
  expect(await screen.findByText('Alpha Institute')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(await screen.findByText('Beta Institute')).toBeInTheDocument();
  expect(listInstitutes).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, pageSize: 25 }));
  expect(screen.getByText('Showing 26–26 of 26 institutes')).toBeInTheDocument();
});

test('roster filter searches a bounded institute page and retains the selected institute', async () => {
  listInstitutes.mockImplementation(({ search }) => Promise.resolve({
    institutes: search ? [{ id: 'selected', name: 'Found Institute' }] : [],
    pagination: { page: 1, page_size: 25, total: search ? 1 : 0, has_next: false },
  }));
  listRosterStudents.mockResolvedValue({
    results: [], summary: {}, pagination: { page: 1, page_size: 25, total: 0, has_next: false },
  });

  render(<MemoryRouter><RosterStudentsPage /></MemoryRouter>);
  await userEvent.type(screen.getByRole('textbox', { name: 'Find institute' }), 'Found');
  await waitFor(() => expect(listInstitutes).toHaveBeenLastCalledWith(
    expect.objectContaining({ search: 'Found', pageSize: 25 })
  ));
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Filter by institute' }), 'selected');
  await waitFor(() => expect(listRosterStudents).toHaveBeenLastCalledWith(
    expect.objectContaining({ instituteId: 'selected' })
  ));
});
