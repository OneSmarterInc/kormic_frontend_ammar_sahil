import { Dispatch, MutableRefObject, useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { AuthSession, OnboardingRoute, OnboardingState } from '../../models/onboarding';
import {
  createStudentProfile,
  getMe,
  getStudentProfile,
  logoutSession,
  refreshAccessToken,
} from '../../services/api';
import {
  registerForPushNotifications,
  shouldOpenAgentChatFromLastNotification,
  unregisterPushNotifications,
} from '../../services/notifications';
import { clearSavedTokens, getSavedTokens, saveAccessToken, saveTokens } from '../../services/tokenStorage';
import { OnboardingAction } from '../../state/onboardingReducer';
import { isBasicInfoComplete } from '../../utils/validation';
import { getFirstMissingOnboardingRoute, withProfileCreated } from '../onboarding/navigation';
import { StudentProfile } from '../profile/types';
import { getErrorMessage, isTotpEnrollmentError } from './authErrors';
interface StudentSessionOptions {
  state: OnboardingState;
  dispatch: Dispatch<OnboardingAction>;
  navigate: (route: OnboardingRoute) => void;
  openClaimFromUrl: (url?: string | null) => boolean;
  claimLinkHandledRef: MutableRefObject<boolean>;
  onNotificationOpen: () => void;
}
export function useStudentSession({
  state,
  dispatch,
  navigate,
  openClaimFromUrl,
  claimLinkHandledRef,
  onNotificationOpen,
}: StudentSessionOptions) {
  const [profile, setProfile] = useState<StudentProfile | undefined>();

  const [profileLoading, setProfileLoading] = useState(false);

  const [profileError, setProfileError] = useState('');

  const [basicInfoApiError, setBasicInfoApiError] = useState('');

  const [restoringSession, setRestoringSession] = useState(true);

  // Web redirect decisions must be based on a definitive cookie-restore
  // result, not on whether the reducer has rendered authSession yet. This
  // avoids a successful login briefly rendering and then being sent back to
  // /login during the dispatch/render boundary.
  const [webSessionMissing, setWebSessionMissing] = useState(false);

  const loadProfileForSession = useCallback(async (session: AuthSession) => {
    setProfileError('');
    setProfileLoading(true);

    try {
      const nextProfile = await getStudentProfile(session);
      setProfile(nextProfile as StudentProfile);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to load student profile');
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const continueAfterAuth = useCallback(
    async (session: AuthSession) => {
      let nextSession = session;
      const onboarding = nextSession.user?.onboarding;
      setBasicInfoApiError('');

      if (
        onboarding &&
        (!onboarding.profile_exists || onboarding.basic_info_complete === false) &&
        isBasicInfoComplete(state.basicInfo)
      ) {
        try {
          await createStudentProfile(nextSession, state.basicInfo);
          nextSession = withProfileCreated(nextSession);
        } catch (error) {
          const message = getErrorMessage(error, 'Unable to create student profile');

          if (nextSession.refresh && isTotpEnrollmentError(message)) {
            try {
              const refreshed = await refreshAccessToken(nextSession.refresh);
              nextSession = {
                ...nextSession,
                access: refreshed.access,
                refresh: refreshed.refresh ?? nextSession.refresh,
              };
              await createStudentProfile(nextSession, state.basicInfo);
              nextSession = withProfileCreated(nextSession);
            } catch (retryError) {
              setBasicInfoApiError(
                getErrorMessage(retryError, 'Unable to create student profile after TOTP verification'),
              );
            }
          } else {
            setBasicInfoApiError(message);
          }
        }
      }

      await saveTokens(nextSession);
      dispatch({ type: 'SET_AUTH_SESSION', session: nextSession });
      const nextRoute = getFirstMissingOnboardingRoute(nextSession);
      registerForPushNotifications(nextSession).catch((error) => {
        console.log('[notifications] register failed:', error);
      });
      navigate(nextRoute);
      if (nextRoute === 'Profile') {
        loadProfileForSession(nextSession);
      }
    },
    [loadProfileForSession, navigate, state.basicInfo],
  );

  const continueAfterBasicInfo = useCallback(
    async (session?: AuthSession) => {
      if (!session) {
        navigate('SecuritySetup');
        return;
      }

      if (session.mustEnrollTotp || session.totpRequired || !session.user?.totp_enrolled) {
        await saveTokens(session);
        navigate('SecuritySetup');
        return;
      }

      await continueAfterAuth(session);
    },
    [continueAfterAuth, navigate],
  );

  const viewProfile = useCallback(async () => {
    if (!state.authSession) {
      setProfileError('Please sign in again before opening your profile.');
      navigate('Profile');
      return;
    }

    navigate('Profile');
    await loadProfileForSession(state.authSession);
  }, [loadProfileForSession, navigate, state.authSession]);

  const handleProfileChanged = useCallback(
    async (updatedProfile?: StudentProfile) => {
      if (updatedProfile) {
        setProfile(updatedProfile);
        setProfileError('');
        return;
      }

      if (state.authSession) {
        await loadProfileForSession(state.authSession);
      }
    },
    [loadProfileForSession, state.authSession],
  );

  const logout = useCallback(async () => {
    try {
      await unregisterPushNotifications(state.authSession);
    } catch {
      // Logout should still clear local auth even if the notification token is already inactive or the network fails.
    }
    try {
      await logoutSession(state.authSession);
    } catch {
      // Clear local access even offline; the server cookie keeps its bounded expiry.
    }
    await clearSavedTokens();
    setProfile(undefined);
    setProfileError('');
    setProfileLoading(false);
    dispatch({ type: 'LOGOUT' });
    if (Platform.OS === 'web') {
      window.location.replace('/login?portal=student');
    }
  }, [state.authSession]);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (openClaimFromUrl(initialUrl)) {
        setWebSessionMissing(false);
        setRestoringSession(false);
        return;
      }

      let tokens = await getSavedTokens();
      if (Platform.OS === 'web' && !tokens) {
        try {
          const refreshed = await refreshAccessToken();
          tokens = { access: refreshed.access };
          await saveAccessToken(refreshed.access);
        } catch {
          if (active) {
            setWebSessionMissing(true);
            setRestoringSession(false);
          }
          return;
        }
      }
      if (!tokens) {
        if (active) {
          setWebSessionMissing(Platform.OS === 'web');
          setRestoringSession(false);
        }
        return;
      }

      try {
        let access = tokens.access;
        let user;
        try {
          user = await getMe(access);
        } catch (restoreError) {
          if (!tokens.refresh) {
            throw restoreError;
          }

          const refreshed = await refreshAccessToken(tokens.refresh);
          access = refreshed.access;
          await saveAccessToken(access);
          user = await getMe(access);
        }
        if (!active) {
          return;
        }

        const session: AuthSession = {
          access,
          refresh: tokens.refresh,
          user,
          mustEnrollTotp: false,
          totpRequired: false,
        };
        setWebSessionMissing(false);
        dispatch({ type: 'SET_AUTH_SESSION', session });
        registerForPushNotifications(session).catch((error) => {
          console.log('[notifications] register failed:', error);
        });
        const route = getFirstMissingOnboardingRoute(session);
        const openChat = await shouldOpenAgentChatFromLastNotification();

        if (claimLinkHandledRef.current) {
          navigate('ClaimLanding');
        } else if (openChat) {
          onNotificationOpen();
        } else {
          navigate(route);
        }
        if (route === 'Profile') {
          await loadProfileForSession(session);
        }
      } catch {
        await clearSavedTokens();
        if (active && Platform.OS === 'web') {
          setWebSessionMissing(true);
        }
      } finally {
        if (active) {
          setRestoringSession(false);
        }
      }
    };

    restore();

    return () => {
      active = false;
    };
  }, [loadProfileForSession, navigate, openClaimFromUrl, claimLinkHandledRef, onNotificationOpen, dispatch]);
  return {
    profile,
    profileLoading,
    profileError,
    basicInfoApiError,
    setBasicInfoApiError,
    restoringSession,
    webSessionMissing,
    continueAfterAuth,
    continueAfterBasicInfo,
    viewProfile,
    handleProfileChanged,
    logout,
  };
}
