import { act, renderHook } from '@testing-library/react-native';
import { useClaimFlow } from '../src/features/claim/useClaimFlow';
import { useLinkedinProfile } from '../src/features/linkedin/useLinkedinProfile';
import { normalizeStudentProfile } from '../src/features/profile/normalizeProfile';
import { useProfileEditor } from '../src/features/profile/useProfileEditor';
import { AuthSession } from '../src/models/onboarding';
import * as api from '../src/services/api';
import { saveTokens } from '../src/services/tokenStorage';

jest.mock('../src/services/api', () => ({
  startStudentClaim: jest.fn(),
  verifyStudentClaim: jest.fn(),
  confirmStudentClaim: jest.fn(),
  registerStudent: jest.fn(),
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  updateProfileFields: jest.fn(),
  listLinkedInHistory: jest.fn(),
  uploadLinkedIn: jest.fn(),
}));
jest.mock('../src/services/tokenStorage', () => ({ saveTokens: jest.fn() }));

const session: AuthSession = { access: 'test-access', mustEnrollTotp: false };
const profile = normalizeStudentProfile({
  name: 'Ada',
  email: 'ada@example.test',
  country: 'India',
  institution: 'Test College',
  major: 'CS',
  graduation_year: 2027,
});
beforeEach(() => jest.clearAllMocks());

it('claims an invitation through verification, review and account enrollment', async () => {
  jest
    .mocked(api.startStudentClaim)
    .mockResolvedValue({ sent: true } as Awaited<
      ReturnType<typeof api.startStudentClaim>
    >);
  jest.mocked(api.verifyStudentClaim).mockResolvedValue({
    claim_session: 'verified-claim',
    prefill: { full_name: 'Ada', email: 'ada@example.test' },
  } as Awaited<ReturnType<typeof api.verifyStudentClaim>>);
  jest
    .mocked(api.confirmStudentClaim)
    .mockResolvedValue({} as Awaited<ReturnType<typeof api.confirmStudentClaim>>);
  jest
    .mocked(api.registerStudent)
    .mockResolvedValue({ must_enroll_totp: true } as Awaited<ReturnType<typeof api.registerStudent>>);
  jest.mocked(api.getAccessToken).mockReturnValue('claim-access');
  const navigate = jest.fn();
  const dispatch = jest.fn();
  const { result } = renderHook(() => useClaimFlow(navigate, dispatch));
  await act(async () => {
    await result.current.requestClaimCode();
  });
  expect(api.startStudentClaim).not.toHaveBeenCalled();
  act(() => {
    result.current.openClaimFromUrl('kormicstudent://claim?token=invitation');
  });
  await act(async () => {
    await result.current.requestClaimCode();
  });
  expect(navigate).toHaveBeenLastCalledWith('ClaimCode');
  await act(async () => {
    await result.current.verifyClaimCode('123456');
  });
  expect(api.verifyStudentClaim).toHaveBeenCalledWith({ token: 'invitation', code: '123456' });
  act(() => {
    result.current.updateClaimPrefill('full_name', 'Ada Student');
  });
  await act(async () => {
    await result.current.confirmClaimProfile();
  });
  expect(api.confirmStudentClaim).toHaveBeenCalledWith(
    expect.objectContaining({
      claimSession: 'verified-claim',
      fields: expect.objectContaining({ full_name: 'Ada Student' }),
    }),
  );
  await act(async () => {
    await result.current.createClaimAccount('test-password');
  });
  expect(saveTokens).toHaveBeenCalledWith(
    expect.objectContaining({ access: 'claim-access', mustEnrollTotp: true }),
  );
  expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_AUTH_SESSION' }));
  expect(navigate).toHaveBeenLastCalledWith('SecuritySetup');
});

it('claim verification failure preserves the invitation and clears loading', async () => {
  jest.mocked(api.verifyStudentClaim).mockRejectedValue(new Error('Invalid code'));
  const navigate = jest.fn();
  const dispatch = jest.fn();
  const { result } = renderHook(() => useClaimFlow(navigate, dispatch));
  act(() => {
    result.current.setClaimToken('invite');
  });
  await act(async () => {
    await result.current.verifyClaimCode('wrong');
  });
  expect(result.current.claimError).toBe('Invalid code');
  expect(result.current.claimLoading).toBe(false);
  expect(result.current.claimToken).toBe('invite');
  expect(navigate).not.toHaveBeenCalled();
});

it('profile validation prevents a request, then saves normalized changes', async () => {
  const changed = jest.fn();
  const selectSection = jest.fn();
  const setSectionError = jest.fn();
  const setActionLoading = jest.fn();
  jest
    .mocked(api.updateProfileFields)
    .mockResolvedValue({ profile: { name: 'Ada' } } as Awaited<ReturnType<typeof api.updateProfileFields>>);
  const { result } = renderHook(() =>
    useProfileEditor({
      session,
      profile,
      onProfileChanged: changed,
      selectSection,
      setSectionError,
      setActionLoading,
    }),
  );
  act(() => {
    result.current.setProfileDraft((current) => ({ ...current, email: 'invalid' }));
  });
  await act(async () => {
    await result.current.saveProfileDetails();
  });
  expect(api.updateProfileFields).not.toHaveBeenCalled();
  expect(result.current.profileFieldErrors.email).toBe('Enter a valid email address.');
  act(() => {
    result.current.setProfileDraft((current) => ({
      ...current,
      email: 'ada@example.test',
      english_score_text: ' 0 ',
    }));
  });
  await act(async () => {
    await result.current.saveProfileDetails();
  });
  expect(api.updateProfileFields).toHaveBeenCalledWith(
    session,
    expect.objectContaining({ english_score: 0, english_score_text: '0', graduation_year: 2027 }),
  );
  expect(changed).toHaveBeenCalledWith(expect.objectContaining({ english_score: '0' }));
  expect(selectSection).toHaveBeenCalledWith('overview');
  expect(setActionLoading).toHaveBeenLastCalledWith(false);
});

it.each([true, false])('LinkedIn URL save releases its loading state (success=%s)', async (success) => {
  const setActionLoading = jest.fn();
  const setSectionError = jest.fn();
  if (success)
    jest
      .mocked(api.updateProfileFields)
      .mockResolvedValue({} as Awaited<ReturnType<typeof api.updateProfileFields>>);
  else jest.mocked(api.updateProfileFields).mockRejectedValue(new Error('Save failed'));
  const { result } = renderHook(() =>
    useLinkedinProfile({ session, profile, section: 'overview', setActionLoading, setSectionError }),
  );
  await act(async () => {
    await result.current.savePlainUrl('linkedin_url', ' https://linkedin.com/in/ada ');
  });
  expect(api.updateProfileFields).toHaveBeenCalledWith(session, {
    linkedin_url: 'https://linkedin.com/in/ada',
  });
  expect(setActionLoading.mock.calls).toEqual([[true], [false]]);
  if (!success) expect(setSectionError).toHaveBeenLastCalledWith('Save failed');
});
