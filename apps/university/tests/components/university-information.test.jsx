import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import UniversityInformationPage from '../../src/pages/university/SourceInformationCategories';

const { list, update } = vi.hoisted(() => ({ list: vi.fn(), update: vi.fn() }));
vi.mock('../../src/api/universityAdminApi', () => ({ listUniversityInformation: list, updateUniversityInformation: update }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }));
const fact = { id: 1, topic: 'Merit scholarship', content: 'GPA 3.0 required', category: 'scholarships', source_type: 'scraped', details: { minimum_gpa: 3 }, revision: 'r1' };
beforeEach(() => { vi.clearAllMocks(); list.mockResolvedValue({ knowledge: [fact, { id: 2, topic: 'Unusual fact', content: 'Additional information', category: 'other' }] }); });

test('expands categories, edits criteria, saves to canonical API, and shows Other', async () => {
  const user = userEvent.setup();
  update.mockResolvedValue({ ...fact, content: 'GPA 3.8 required', details: { minimum_gpa: 3.8 }, source_type: 'human_verified', revision: 'r2' });
  render(<UniversityInformationPage />);
  await screen.findByText('Scholarships & financial aid');
  await user.click(screen.getByText('Scholarships & financial aid'));
  await user.click(screen.getByRole('button', { name: 'Edit Merit scholarship' }));
  await user.clear(screen.getByLabelText('Information'));
  await user.type(screen.getByLabelText('Information'), 'GPA 3.8 required');
  await user.clear(screen.getByLabelText(/Minimum gpa/));
  await user.type(screen.getByLabelText(/Minimum gpa/), '3.8');
  await user.click(screen.getByRole('button', { name: 'Save information' }));
  await waitFor(() => expect(update).toHaveBeenCalledWith(1, expect.objectContaining({ content: 'GPA 3.8 required', details: { minimum_gpa: 3.8 }, expected_revision: 'r1' })));
  expect(await screen.findByText('University verified')).toBeInTheDocument();
  await user.click(screen.getByRole('tab', { name: 'Other (1)' }));
  expect(screen.getByText('Unusual fact')).toBeVisible();
});

test('failed save retains the draft and cancel never writes', async () => {
  const user = userEvent.setup();
  update.mockRejectedValue(new Error('This information changed since you opened it. Reload before saving.'));
  render(<UniversityInformationPage />);
  await user.click(await screen.findByText('Scholarships & financial aid'));
  await user.click(screen.getByRole('button', { name: 'Edit Merit scholarship' }));
  await user.type(screen.getByLabelText('Information'), ' Updated');
  await user.click(screen.getByRole('button', { name: 'Save information' }));
  expect(await screen.findByText(/changed since you opened/)).toBeInTheDocument();
  expect(screen.getByLabelText('Information')).toHaveValue('GPA 3.0 required Updated');
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(update).toHaveBeenCalledTimes(1);
});
