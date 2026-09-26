import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, test, expect } from 'vitest';
import AgentMessageDetails, { latestChanges } from '../../src/components/common/AgentMessageDetails';

const universityId = '11111111-1111-4111-8111-111111111111';
const studentId = '22222222-2222-4222-8222-222222222222';
const change = { id: 'change-1', operation: 'update', status: 'pending', before: { tagline: 'Before' }, after: { tagline: 'After' } };

test('shows scoped student card linking to the existing profile route', () => {
  render(<MemoryRouter><AgentMessageDetails universityId={universityId} meta={{ student_cards: [
    { university_id: universityId, student_id: studentId, name: 'Asha', program: 'MS CS', profile_path: 'https://untrusted.example' },
    { university_id: 'other', student_id: studentId, name: 'Private student' },
  ] }} /></MemoryRouter>);
  expect(screen.getByRole('link', { name: /Asha/ })).toHaveAttribute('href', `/university/${universityId}/profiles/${studentId}`);
  expect(screen.queryByText('Private student')).not.toBeInTheDocument();
});

test('shows exact current and proposed values and sends explicit decision', async () => {
  const onSend = vi.fn();
  render(<AgentMessageDetails universityId={universityId} meta={{ change_proposals: [change] }} onSend={onSend} />);
  expect(screen.getByText('Current: Before')).toBeInTheDocument();
  expect(screen.getByText('Proposed: After')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Yes, save' }));
  expect(onSend).toHaveBeenCalledWith('Yes, approve change change-1 exactly as shown.');
  await userEvent.click(screen.getByRole('button', { name: 'No, discard' }));
  expect(onSend).toHaveBeenLastCalledWith('No, reject change change-1.');
});

test('restored history uses latest status and removes obsolete approval buttons', () => {
  const messages = [{ meta: { change_proposals: [change] } }, { meta: { change_proposals: [{ ...change, status: 'applied' }] } }];
  render(<AgentMessageDetails meta={messages[0].meta} changes={latestChanges(messages)} universityId={universityId} />);
  expect(screen.getByText('applied')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Yes, save' })).not.toBeInTheDocument();
});
