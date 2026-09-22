import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AriaBotScreen } from '../src/features/chat/AriaBotScreen';
import { ProfileOverview } from '../src/features/profile/components/ProfileOverview';
import { normalizeStudentProfile } from '../src/features/profile/normalizeProfile';
import * as api from '../src/services/api';

jest.mock('../src/services/api', () => ({
  API_BASE_URL: 'https://example.test/api',
  getAgentName: jest.fn(),
  getAriaHistory: jest.fn(),
  chatWithAria: jest.fn(),
  clearAriaChat: jest.fn(),
  updateAgentName: jest.fn(),
  editAriaMessage: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(api.getAgentName).mockResolvedValue({ agent_name: 'Aria' });
  jest.mocked(api.getAriaHistory).mockResolvedValue({ messages: [] });
});

it('renders reusable overview sections from a normalized API profile', () => {
  const profile = normalizeStudentProfile({
    name: 'Ada Student',
    email: 'ada@example.test',
    institution: 'Test College',
    technical_skills: ['Rust'],
    notes: 'Research interests',
  });
  const screen = render(
    <ProfileOverview
      profile={profile}
      skills={profile.technical_skills}
      profileImageUrl=""
      profileImageLoading={false}
    />,
  );
  expect(screen.getByText('Ada Student')).toBeTruthy();
  expect(screen.getByText('Test College')).toBeTruthy();
  expect(screen.getByText('Rust')).toBeTruthy();
  expect(screen.getByText('Research interests')).toBeTruthy();
});

it('loads history and sends a message through the extracted chat controller and composer', async () => {
  jest.mocked(api.chatWithAria).mockImplementation(async () => {
    jest.mocked(api.getAriaHistory).mockResolvedValue({
      messages: [
        { id: 1, sender: 'user', content: 'What should I improve?' },
        { id: 2, sender: 'agent', content: 'Build a research portfolio.' },
      ],
    });
    return { reply: 'Build a research portfolio.' };
  });
  const session = { access: 'chat-test', mustEnrollTotp: false };
  const screen = render(<AriaBotScreen session={session} />);
  await waitFor(() => expect(api.getAriaHistory).toHaveBeenCalled());
  await act(async () => {
    await Promise.resolve();
  });
  fireEvent.changeText(screen.getByLabelText('Message Aria'), 'What should I improve?');
  fireEvent.press(screen.getByText('Send'));
  await waitFor(() => expect(screen.getByText('Build a research portfolio.')).toBeTruthy());
  expect(api.chatWithAria).toHaveBeenCalledWith(session, 'What should I improve?', []);
  expect(screen.getByLabelText('Message Aria').props.value).toBe('');
});

it('surfaces chat request failure and allows another send', async () => {
  jest.mocked(api.chatWithAria).mockRejectedValue(new Error('Try again later'));
  const screen = render(<AriaBotScreen session={{ access: 'failure-test', mustEnrollTotp: false }} />);
  await waitFor(() => expect(api.getAriaHistory).toHaveBeenCalled());
  await act(async () => {
    await Promise.resolve();
  });
  fireEvent.changeText(screen.getByLabelText('Message Aria'), 'Help');
  fireEvent.press(screen.getByText('Send'));
  await waitFor(() => expect(screen.getByText('Try again later')).toBeTruthy());
  fireEvent.changeText(screen.getByLabelText('Message Aria'), 'Retry');
  fireEvent.press(screen.getByText('Send'));
  await waitFor(() => expect(api.chatWithAria).toHaveBeenCalledTimes(2));
});
