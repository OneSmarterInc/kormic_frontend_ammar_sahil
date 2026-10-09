import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import UniversityInformationPage from '../../src/pages/university/UniversityInformationPage';

const api = vi.hoisted(() => ({ listInformationEntities: vi.fn(), getInformationOverview: vi.fn(), updateUniversityInformation: vi.fn(), createUniversityInformation: vi.fn(), updateInformationOverview: vi.fn() }));
vi.mock('../../src/api/universityAdminApi', () => api);
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn() } }));
const overview = { revision: 'profile-r1', values: { name: 'Example University', location: 'Dayton', admissions_office_address: '', website_url: 'https://example.edu', contact_email: '', contact_phone: '', description: '' } };
const scholarship = { id: 1, topic: 'Merit award', content: 'GPA 3.0 required', category: 'scholarships', source_type: 'scraped', details: { name: 'Merit award', information_type: 'scholarships', minimum_gpa: 3, amount: '12000', duration: '4 years' }, revision: 'r1' };
beforeEach(() => {
  vi.clearAllMocks(); api.listInformationEntities.mockResolvedValue({ knowledge: [scholarship] });
  api.getInformationOverview.mockResolvedValue(overview);
});

test('edits labeled university details and saves using the current revision', async () => {
  const user = userEvent.setup();
  api.updateInformationOverview.mockResolvedValue({ ...overview, revision: 'r2' });
  render(<UniversityInformationPage />);
  await user.type(await screen.findByLabelText('Postal / admissions office address'), '3640 College Road');
  await user.click(screen.getByRole('button', { name: 'Save university details' }));
  await waitFor(() => expect(api.updateInformationOverview).toHaveBeenCalledWith(expect.objectContaining({ expected_revision: 'profile-r1', values: expect.objectContaining({ admissions_office_address: '3640 College Road' }) })));
});

test('scholarship fields preserve typed data and synchronize readable knowledge', async () => {
  const user = userEvent.setup();
  api.updateUniversityInformation.mockImplementation(async (id, payload) => ({ ...scholarship, ...payload, revision: 'r2', source_type: 'human_verified' }));
  render(<UniversityInformationPage />);
  await user.click(await screen.findByRole('button', { name: /Scholarships/ }));
  expect(screen.queryByRole('button', { name: 'Add scholarship' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Scholarships.*Manage individual/ }));
  await user.click(screen.getByRole('button', { name: /Merit award/ }));
  expect(screen.getByLabelText('Duration')).toHaveValue('4 years');
  await user.clear(screen.getByLabelText('Minimum GPA'));
  await user.type(screen.getByLabelText('Minimum GPA'), '3.8');
  await user.clear(screen.getByLabelText('Additional details'));
  await user.type(screen.getByLabelText('Eligibility criteria'), 'New students with a GPA of at least 3.8.');
  await user.click(screen.getByRole('button', { name: 'Save scholarship' }));
  await waitFor(() => expect(api.updateUniversityInformation).toHaveBeenCalledWith(1, expect.objectContaining({ expected_revision: 'r1', content: expect.stringContaining('Minimum GPA: 3.8'), details: expect.objectContaining({ minimum_gpa: '3.8', information_type: 'scholarships' }) })));
  expect(await screen.findByText(/University verified/)).toBeInTheDocument();
});

test('adds a housing record, preserves failed drafts and guards unsaved navigation', async () => {
  const user = userEvent.setup();
  api.createUniversityInformation.mockRejectedValue(new Error('Unable to save right now'));
  render(<UniversityInformationPage />);
  await user.click(await screen.findByRole('button', { name: /Hostel & housing/ }));
  await user.click(screen.getByRole('button', { name: /Hostel & housing.*Manage individual/ }));
  await user.click(screen.getByRole('button', { name: 'Add housing option' }));
  await user.type(screen.getByLabelText('Residence / hostel name'), 'Oak Hall');
  await user.type(screen.getByLabelText('Contract duration'), '9 months');
  await user.click(screen.getByRole('button', { name: 'Save housing option' }));
  expect(await screen.findByText('Unable to save right now')).toBeInTheDocument();
  expect(screen.getByLabelText('Contract duration')).toHaveValue('9 months');
  await user.click(screen.getByRole('button', { name: /University details/ }));
  expect(screen.getByText(/You have unsaved changes/)).toBeInTheDocument();
  expect(api.createUniversityInformation).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button', { name: 'Discard and continue' }));
  expect(screen.getByLabelText('University name')).toBeVisible();
});

 test('fixed degree collections stay visible without scraped records and prefill the selected level', async () => {
  api.listInformationEntities.mockResolvedValue({ knowledge: [{ id: 9, topic: 'Courses', category: 'academics', details: {} }] });
  const user = userEvent.setup(); render(<UniversityInformationPage />);
  await user.click(await screen.findByRole('button', { name: /Programs/ }));
  expect(screen.queryByRole('button', { name: 'Add course' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Undergraduate.*Bachelor/ }));
  await user.click(screen.getByRole('button', { name: 'Add course' }));
  expect(screen.getByLabelText('Program / qualification name')).toHaveValue('');
  expect(screen.getByLabelText('Duration')).toHaveValue('');
  expect(screen.getByLabelText('Degree level')).toHaveValue('Undergraduate');
});


test('groups qualifications and combines missing-field filtering with search', async () => {
  const course = (id, name, level, duration = '') => ({ id, topic: name, content: name, revision: 'r1', details: { information_type: 'academics', name, level, duration } });
  api.listInformationEntities.mockResolvedValue({ knowledge: [
    course(10, 'Computer Science, BSCS', 'Undergraduate', '4 years'),
    course(11, 'Computer Science, MS', 'Graduate'),
    course(12, 'Computer Science, PhD', 'Graduate', '5 years'),
    course(13, 'Cyber Security Graduate Certificate', 'Graduate'),
  ] });
  const user = userEvent.setup(); render(<UniversityInformationPage />);
  await user.click(await screen.findByRole('button', { name: /Programs/ }));
  expect(screen.getByRole('button', { name: /Undergraduate.*Bachelor/ })).toBeVisible();
  expect(screen.getByRole('button', { name: /PhD & doctoral/ })).toBeVisible();
  await user.selectOptions(screen.getByLabelText('Filter by missing fields'), 'duration');
  expect(screen.getByText(/Showing 2 of 4 entries/)).toBeVisible();
  await user.click(screen.getByRole('button', { name: /Master’s.*Master’s degrees/ }));
  expect(screen.getByRole('button', { name: /Computer Science, MS/ })).toBeVisible();
  expect(screen.queryByRole('button', { name: /Computer Science, PhD/ })).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('Search Programs'), 'cyber');
  expect(screen.getByText(/Showing 1 of 4 entries/)).toBeVisible();
  await user.click(screen.getByRole('button', { name: /Other.*Certificates/ }));
  const entry = screen.getByRole('button', { name: /Cyber Security Graduate Certificate/ });
  expect(within(entry).getByText(/missing fields/)).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByText(/Showing 4 of 4 entries/)).toBeVisible();
});

test('saving a missing field updates its filter count without hiding the saved form', async () => {
  const user = userEvent.setup();
  const record = { ...scholarship, details: { ...scholarship.details, duration: '' } };
  api.listInformationEntities.mockResolvedValue({ knowledge: [record] });
  api.updateUniversityInformation.mockImplementation(async (id, payload) => ({ ...record, ...payload, revision: 'r2', source_type: 'human_verified' }));
  render(<UniversityInformationPage />);
  await user.click(await screen.findByRole('button', { name: /Scholarships/ }));
  await user.selectOptions(screen.getByLabelText('Filter by missing fields'), 'duration');
  await user.click(screen.getByRole('button', { name: /Scholarships.*Manage individual/ }));
  await user.click(screen.getByRole('button', { name: /Merit award/ }));
  await user.type(screen.getByLabelText('Duration'), '4 years');
  expect(screen.getByLabelText('Filter by missing fields')).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Save scholarship' }));
  await waitFor(() => expect(screen.getByLabelText('Filter by missing fields')).toHaveValue('all'));
  expect(screen.getByLabelText('Duration')).toHaveValue('4 years');
  expect(screen.getByRole('option', { name: 'Duration (0)' })).toBeInTheDocument();
});


test('shows owned rates inside programs and only shared charges in university-wide fees', async () => {
  const course = { id: 10, topic: 'Computing, MS', content: 'Computing', details: { information_type: 'academics', name: 'Computing, MS', level: 'Master’s' }, revision: 'r1' };
  const tuition = { id: 11, topic: 'Computing nonresident tuition', content: '$500 per credit', details: { information_type: 'fees', name: 'Computing nonresident tuition', amount: '$500', billing_period: 'Per credit' }, cost_placement: { scope: 'academics', target_id: 10 }, revision: 'r1' };
  const general = { id: 12, topic: 'Application fee', content: '$40', details: { information_type: 'fees', name: 'Application fee', amount: '$40' }, cost_placement: { scope: 'university', target_id: null }, revision: 'r1' };
  const unclear = { id: 13, topic: 'Unassigned resident tuition', content: '$400', details: { information_type: 'fees', name: 'Unassigned resident tuition', amount: '$400' }, cost_placement: { scope: 'review', target_id: null }, revision: 'r1' };
  api.listInformationEntities.mockResolvedValue({ knowledge: [course, tuition, general, unclear] });
  const user = userEvent.setup(); render(<UniversityInformationPage />);
  await user.click(await screen.findByRole('button', { name: /University-wide fees/ }));
  expect(screen.getByText(/Showing 1 of 1 entries/)).toBeVisible();
  await user.click(screen.getByRole('button', { name: /University-wide fees.*Manage individual/ }));
  expect(screen.getByRole('button', { name: /Application fee/ })).toBeVisible();
  expect(screen.queryByText('Computing nonresident tuition')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Programs/ }));
  await user.click(screen.getByRole('button', { name: /Master’s.*Master’s degrees/ }));
  await user.click(screen.getByRole('button', { name: /Computing, MS/ }));
  expect(screen.getByRole('region', { name: 'Related costs' })).toHaveTextContent('Computing nonresident tuition');
  await user.click(screen.getByRole('button', { name: /Other information/ }));
  await user.click(screen.getByRole('button', { name: /Other information.*Manage individual/ }));
  await user.click(screen.getByRole('button', { name: /Unassigned resident tuition/ }));
  expect(screen.getByLabelText('Cost belongs to')).toHaveValue('review');
  expect(screen.getByLabelText('Amount / range')).toHaveValue('$400');
  api.updateUniversityInformation.mockImplementation(async (id, payload) => ({ ...unclear, ...payload, revision: 'r2' }));
  api.listInformationEntities.mockResolvedValue({ knowledge: [course, tuition, general, { ...unclear, cost_placement: { scope: 'academics', target_id: 10 } }] });
  await user.selectOptions(screen.getByLabelText('Cost belongs to'), 'academics:10');
  await user.click(screen.getByRole('button', { name: 'Save fee', exact: true }));
  await waitFor(() => expect(api.updateUniversityInformation).toHaveBeenCalledWith(13, expect.objectContaining({ details: expect.objectContaining({ cost_owner: 'academics:10', information_type: 'fees', amount: '$400' }) })));
  await waitFor(() => expect(screen.queryByLabelText('Cost belongs to')).not.toBeInTheDocument());
});
