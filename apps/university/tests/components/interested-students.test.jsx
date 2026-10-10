import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import ProfilesListPage from '../../src/pages/university/ProfilesListPage';
vi.mock('../../src/api/universityApi', () => ({ listUniversityProfiles: vi.fn() }));

vi.mock('../../src/hooks/useAsync', () => ({ useAsync: () => ({
  data: { profiles: [
    { profile_id: '1', name: 'Meets requirements', qualification_status: 'qualified', match_tier: 'unassessed' },
    { profile_id: '2', name: 'Below requirements', qualification_status: 'not_qualified', qualified: true },
    { profile_id: '3', name: 'Missing evidence', qualification_status: 'unassessed' },
    { profile_id: '4', name: 'Legacy eligible', qualified: true },
  ] }, loading: false,
}) }));

test('two tabs partition interested students by eligibility and retain unconfirmed students', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><ProfilesListPage /></MemoryRouter>);
  expect(screen.getAllByRole('button')).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Qualified (2)' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText('Meets requirements')).toBeVisible();
  expect(screen.getByText('Legacy eligible')).toBeVisible();
  expect(screen.queryByText('Below requirements')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Not qualified (2)' }));
  expect(screen.getByText('Below requirements')).toBeVisible();
  expect(screen.getByText('Missing evidence')).toBeVisible();
  expect(screen.getByText('Qualification not yet confirmed')).toBeVisible();
  expect(screen.queryByText('Meets requirements')).toBeNull();
  await user.type(screen.getByRole('textbox', { name: 'Search students' }), 'Missing');
  expect(screen.getByText('Missing evidence')).toBeVisible();
  expect(screen.queryByText('Below requirements')).toBeNull();
});
