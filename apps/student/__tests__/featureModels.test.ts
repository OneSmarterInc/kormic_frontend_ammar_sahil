import {
  buildAriaThreads,
  cacheAriaMessages,
  getCachedAriaMessages,
  getWelcomeMessage,
  normalizeAriaHistory,
} from '../src/features/chat/chatHistory';
import { ChatMessage } from '../src/features/chat/types';
import { normalizeLinkedinHistory } from '../src/features/linkedin/linkedinData';
import { getFirstMissingOnboardingRoute, getNextRouteAfterStep } from '../src/features/onboarding/navigation';
import { normalizeStudentProfile } from '../src/features/profile/normalizeProfile';
import { createProfileDraft } from '../src/features/profile/profileDraft';
import { AuthSession } from '../src/models/onboarding';

const session: AuthSession = {
  access: 'test',
  mustEnrollTotp: false,
  user: { id: 1, email: 'first@example.test', role: 'student', student_id: 'first', totp_enrolled: true },
};

describe('feature data contracts', () => {
  it('preserves nested profile evidence and explicit zero values', () => {
    const profile = normalizeStudentProfile({
      profile: { name: 'Ada', gpa: 0, budget: 0, english_score: 0 },
      evidence: {
        resume: { name: 'Old name', gpa: 9, projects: [{ title: 'Compiler', technologies: ['Rust'] }] },
      },
      test_scores: { gre_quant: 165 },
      skills: { technical_skills: ['Rust'] },
      financials: { budget: 50000 },
    });
    expect(profile).toMatchObject({
      name: 'Ada',
      gpa: 0,
      budget: 0,
      english_score: 0,
      gre_quant: 165,
      technical_skills: ['Rust'],
    });
    expect(profile.projects[0]).toMatchObject({ title: 'Compiler', technologies: ['Rust'] });
    expect(createProfileDraft(profile)).toMatchObject({ gpa: '0', budget: '0', english_score_text: '0' });
  });

  it('normalizes LinkedIn analysis images without losing their analysis identity', () => {
    const records = normalizeLinkedinHistory({
      analyses: [{ id: 9, extracted: { name: 'Ada' }, images: [{ index: 2, image_url: '/image.jpg' }] }],
    });
    expect(records).toEqual([
      expect.objectContaining({
        id: '9-2',
        analysis_id: 9,
        image_url: '/image.jpg',
        extracted_data: { name: 'Ada' },
      }),
    ]);
    expect(normalizeLinkedinHistory(null)).toEqual([]);
  });

  it('preserves university escalation metadata and attachment-only chat messages', () => {
    const messages = normalizeAriaHistory([
      {
        id: 1,
        sender: 'agent',
        content: 'Answer',
        escalation: { query_id: 7, status: 'resolved' },
        meta: { question: 'Deadline?', answer: 'July', confidence: 0 },
      },
      {
        id: 2,
        sender: 'user',
        content: '',
        attachments: [{ id: 3, filename: 'resume.pdf', url: '/resume.pdf', content_type: 'application/pdf' }],
      },
    ]);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      role: 'aria',
      queryId: 7,
      escalationStatus: 'resolved',
      question: 'Deadline?',
      answer: 'July',
      confidence: 0,
    });
    expect(messages[1]?.attachments).toHaveLength(1);
  });

  it('groups replies with their question and isolates cached students', () => {
    const messages: ChatMessage[] = [
      { id: 'q1', role: 'user', text: 'First', createdAt: '2026-01-01T10:00:00Z' },
      { id: 'a1', role: 'aria', text: 'Reply' },
      { id: 'q2', role: 'user', text: 'Second', createdAt: '2026-01-02T10:00:00Z' },
    ];
    expect(buildAriaThreads(messages).map((thread) => thread.messages.map((message) => message.id))).toEqual([
      ['q2'],
      ['q1', 'a1'],
    ]);
    cacheAriaMessages(session, [getWelcomeMessage('Aria'), ...messages]);
    expect(getCachedAriaMessages(session)).toEqual(messages);
    expect(getCachedAriaMessages({ ...session, user: { ...session.user!, student_id: 'other' } })).toEqual(
      [],
    );
  });

  it('keeps onboarding routing decisions independent of rendering', () => {
    const incomplete: AuthSession = {
      ...session,
      user: {
        ...session.user!,
        onboarding: {
          profile_exists: true,
          basic_info_complete: true,
          github_connected: true,
          linkedin_connected: false,
          resume_uploaded: false,
          setup_complete: false,
        },
      },
    };
    expect(getFirstMissingOnboardingRoute(incomplete)).toBe('LinkedIn');
    expect(getNextRouteAfterStep('GitHub', incomplete)).toBe('LinkedIn');
    expect(getNextRouteAfterStep('LinkedIn', incomplete)).toBe('CV');
  });
});
