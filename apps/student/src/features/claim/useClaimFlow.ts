import { Dispatch, useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { AuthSession, OnboardingRoute } from '../../models/onboarding';
import {
  confirmStudentClaim,
  getAccessToken,
  getRefreshToken,
  registerStudent,
  startStudentClaim,
  verifyStudentClaim,
} from '../../services/api';
import { saveTokens } from '../../services/tokenStorage';
import { OnboardingAction } from '../../state/onboardingReducer';
import { getClaimTokenFromUrl } from '../../utils/claimLinks';
import { getErrorMessage } from '../auth/authErrors';
import { ClaimEditableField, ClaimPrefill } from './types';
const emptyClaimPrefill: ClaimPrefill = {
  full_name: '',
  email: '',
  field_of_study: '',
  degree_level: '',
  expected_graduation: '',
  phone: '',
  year_in_college: '',
  program_name: '',
  city: '',
  state: '',
};
export function useClaimFlow(
  navigate: (route: OnboardingRoute) => void,
  dispatch: Dispatch<OnboardingAction>,
) {
  const [claimToken, setClaimToken] = useState('');

  const [claimMaskedEmail, setClaimMaskedEmail] = useState('');

  const [claimSession, setClaimSession] = useState('');

  const [claimPrefill, setClaimPrefill] = useState<ClaimPrefill>(emptyClaimPrefill);

  const [claimError, setClaimError] = useState('');

  const [claimLoading, setClaimLoading] = useState(false);

  const [claimResending, setClaimResending] = useState(false);

  const claimLinkHandledRef = useRef(false);

  const resetClaimState = useCallback(() => {
    setClaimToken('');
    setClaimMaskedEmail('');
    setClaimSession('');
    setClaimPrefill(emptyClaimPrefill);
    setClaimError('');
    setClaimLoading(false);
    setClaimResending(false);
  }, []);

  const openClaimFromUrl = useCallback(
    (url?: string | null) => {
      const token = getClaimTokenFromUrl(url);
      if (!token) {
        return false;
      }

      claimLinkHandledRef.current = true;
      resetClaimState();
      setClaimToken(token);
      setClaimError('');
      navigate('ClaimLanding');
      return true;
    },
    [navigate, resetClaimState],
  );

  const requestClaimCode = useCallback(async () => {
    const token = claimToken.trim();
    if (!token) {
      setClaimError('Paste the invitation token before continuing.');
      return;
    }

    setClaimLoading(true);
    setClaimError('');
    try {
      const data = await startStudentClaim(token);
      setClaimMaskedEmail(data.masked_email);
      navigate('ClaimCode');
    } catch (error) {
      setClaimError(getErrorMessage(error, 'Unable to start invitation claim'));
    } finally {
      setClaimLoading(false);
    }
  }, [claimToken, navigate]);

  const resendClaimCode = useCallback(async () => {
    const token = claimToken.trim();
    if (!token) {
      setClaimError('Paste the invitation token before resending.');
      return;
    }

    setClaimResending(true);
    setClaimError('');
    try {
      const data = await startStudentClaim(token);
      setClaimMaskedEmail(data.masked_email);
    } catch (error) {
      setClaimError(getErrorMessage(error, 'Unable to resend invitation code'));
    } finally {
      setClaimResending(false);
    }
  }, [claimToken]);

  const verifyClaimCode = useCallback(
    async (code: string) => {
      const token = claimToken.trim();
      if (!token) {
        setClaimError('Invitation token is missing. Go back and paste the invite token again.');
        return;
      }

      setClaimLoading(true);
      setClaimError('');
      try {
        const data = await verifyStudentClaim({ token, code });
        setClaimSession(data.claim_session);
        setClaimPrefill({
          ...emptyClaimPrefill,
          ...data.prefill,
        });
        navigate('ClaimReview');
      } catch (error) {
        setClaimError(getErrorMessage(error, 'Unable to verify invitation code'));
      } finally {
        setClaimLoading(false);
      }
    },
    [claimToken, navigate],
  );

  const updateClaimPrefill = useCallback((field: ClaimEditableField, value: string) => {
    setClaimPrefill((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const confirmClaimProfile = useCallback(async () => {
    if (!claimSession) {
      setClaimError('Claim session is missing. Request a fresh code and try again.');
      navigate('ClaimCode');
      return;
    }

    setClaimLoading(true);
    setClaimError('');
    try {
      await confirmStudentClaim({
        claimSession,
        fields: {
          full_name: claimPrefill.full_name,
          field_of_study: claimPrefill.field_of_study,
          degree_level: claimPrefill.degree_level,
          expected_graduation: claimPrefill.expected_graduation,
          phone: claimPrefill.phone,
          year_in_college: claimPrefill.year_in_college,
          program_name: claimPrefill.program_name,
          city: claimPrefill.city,
          state: claimPrefill.state,
        },
      });
      navigate('ClaimPassword');
    } catch (error) {
      setClaimError(getErrorMessage(error, 'Unable to confirm invitation claim'));
    } finally {
      setClaimLoading(false);
    }
  }, [claimPrefill, claimSession, navigate]);

  const createClaimAccount = useCallback(
    async (password: string) => {
      if (!claimPrefill.email) {
        setClaimError('Claim email is missing. Verify your invitation code again.');
        navigate('ClaimCode');
        return;
      }

      setClaimLoading(true);
      setClaimError('');
      try {
        const data = await registerStudent({
          email: claimPrefill.email,
          password,
          name: claimPrefill.full_name || claimPrefill.email,
        });
        const access = getAccessToken(data);
        const refresh = getRefreshToken(data);
        if (!access) {
          throw new Error('Account was created, but no access token was returned.');
        }

        const session: AuthSession = {
          access,
          refresh,
          user: data.user,
          mustEnrollTotp: Boolean(data.must_enroll_totp),
          totpRequired: false,
          profileCreated: true,
        };

        await saveTokens(session);
        dispatch({ type: 'SET_AUTH_SESSION', session });
        navigate('SecuritySetup');
      } catch (error) {
        setClaimError(getErrorMessage(error, 'Unable to create invited student account'));
      } finally {
        setClaimLoading(false);
      }
    },
    [claimPrefill.email, claimPrefill.full_name, navigate],
  );

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      openClaimFromUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [openClaimFromUrl]);
  return {
    claimToken,
    setClaimToken,
    claimMaskedEmail,
    claimPrefill,
    claimError,
    setClaimError,
    claimLoading,
    claimResending,
    claimLinkHandledRef,
    resetClaimState,
    openClaimFromUrl,
    requestClaimCode,
    resendClaimCode,
    verifyClaimCode,
    updateClaimPrefill,
    confirmClaimProfile,
    createClaimAccount,
  };
}
