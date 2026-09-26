import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, test, expect } from 'vitest';
import AgentPreviewPage from '../../src/pages/university/AgentPreviewPage';
import { chatWithUniversityAgent } from '../../src/api/universityApi';
vi.mock('../../src/api/agentJobs', () => ({ resumeAgentJob: vi.fn().mockResolvedValue(null) }));

vi.mock('../../src/api/universityApi', () => ({
  getUniversityChatHistory: vi.fn().mockResolvedValue({ messages: [] }),
  deleteUniversityChatHistory: vi.fn().mockResolvedValue({}),
  chatWithUniversityAgent: vi.fn(),
}));
vi.mock('../../src/api/universityAdminApi', () => ({
  getAgentName: vi.fn().mockResolvedValue({ agent_name: 'University Advisor' }),
}));
vi.mock('../../src/components/common/ChatThread', () => ({
  default: ({ onSend, messages }) => <div>
    <button onClick={() => onSend('What is tuition?')}>Ask tuition</button>
    {messages.map((message, index) => <p key={index}>{message.content}</p>)}
  </div>,
}));

test('sends to the selected university and shows retrieved source links', async () => {
  chatWithUniversityAgent.mockResolvedValue({
    reply: 'Tuition is $12000.', agent_name: 'University Advisor',
    sources: [{ id: 1, topic: 'Tuition fees', source_url: 'https://example.edu/fees' }],
  });
  render(<MemoryRouter initialEntries={['/university/own/chat']}>
    <Routes><Route path="/university/:universityId/chat" element={<AgentPreviewPage />} /></Routes>
  </MemoryRouter>);
  await userEvent.click(await screen.findByRole('button', { name: 'Ask tuition' }));
  await waitFor(() => expect(chatWithUniversityAgent).toHaveBeenCalledWith('own', 'What is tuition?'));
  expect(await screen.findByText('Tuition is $12000.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Tuition fees' })).toHaveAttribute('href', 'https://example.edu/fees');
});
