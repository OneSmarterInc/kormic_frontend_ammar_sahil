import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { expect, test, vi } from 'vitest';

import DashboardPage from '../../src/pages/university/DashboardPage';
import { getUniversityDashboardSummary } from '../../src/api/universityApi';

vi.mock('../../src/api/universityApi', () => ({
  getUniversityDashboardSummary: vi.fn(),
}));

test('uses the scoped summary total instead of counting the first profile page', async () => {
  getUniversityDashboardSummary.mockResolvedValue({
    knowledge_facts: 2,
    pending_tasks: 4,
    student_profiles: 61,
  });
  const profile = {
    name: 'Dashboard University', agent_name: 'Advisor',
    setup_status: {}, updated_at: '2026-01-01T00:00:00Z',
  };
  render(
    <MemoryRouter initialEntries={['/university/own/dashboard']}>
      <Routes>
        <Route path="/university/:universityId" element={<Outlet context={{ data: profile, loading: false, error: null }} />}>
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

  expect(await screen.findByText('61')).toBeInTheDocument();
  expect(screen.getByText('4')).toBeInTheDocument();
  expect(screen.getByText('2')).toBeInTheDocument();
  expect(getUniversityDashboardSummary).toHaveBeenCalledTimes(1);
  expect(getUniversityDashboardSummary).toHaveBeenCalledWith('own', expect.any(AbortSignal));
});
