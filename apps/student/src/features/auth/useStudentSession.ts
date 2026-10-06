import { cacheGeneration, cacheProfile, readCachedProfile } from '../../services/studentCache';
import { Dispatch, MutableRefObject, useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { AuthSession, AuthUser, OnboardingRoute, OnboardingState } from '../../models/onboarding';
import {
  createStudentProfile,
  getMe,
  isSessionRejected,
  getStudentProfile,
  logoutSession,
  refreshAccessToken,
  subscribeSessionExpired,
} from '../../services/api';
import {
  registerForPushNotifications,
  shouldOpenAgentChatFromLastNotification,
  unregisterPushNotifications,
} from '../../services/notifications';
import { clearSavedTokens, getTokenGeneration, getSavedRefreshToken, getSavedSessionUser, getSavedTokens, saveAccessToken, saveTokens } from '../../services/tokenStorage';
import { consumeWebSessionHandoff } from '../../services/webSessionHandoff';
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

const WEB_SESSION_RESTORE_ATTEMPTS = 3;
const WEB_SESSION_RESTORE_DELAY_MS = 300;

function waitForWebSessionRetry() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, WEB_SESSION_RESTORE_DELAY_MS);
  });
}
export function useStudentSession({
  state,
  dispatch,
  navigate,
  openClaimFromUrl,
  claimLinkHandledRef,
  onNotificationOpen,
}: StudentSessionOptions) {
  const [serverError, setServerError] = useState('');
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const retryConnection = useCallback(() => { setServerError(''); setRestoringSession(true); setRestoreAttempt(value => value + 1); }, []);
  const [profile, setProfile] = useState<StudentProfile | undefined>();

  const [profileLoading, setProfileLoading] = useState(false);

  const [profileError, setProfileError] = useState('');

  const [basicInfoApiError, setBasicInfoApiError] = useState('');

  const [restoringSession, setRestoringSession] = useState(true);

  // Web redirect decisions must be based on a definitive token-restore
  // result, not on whether the reducer has rendered authSession yet. This
  // avoids a successful login briefly rendering and then being sent back to
  // /login during the dispatch/render boundary.
  const [webSessionMissing, setWebSessionMissing] = useState(false);

  useEffect(() => subscribeSessionExpired(() => {
    setProfile(undefined);
    setProfileError('');
    setProfileLoading(false);
    dispatch({ type: 'LOGOUT' });
    setWebSessionMissing(Platform.OS === 'web');
  }), [dispatch]);

  const loadProfileForSession = useCallback(async (session: AuthSession) => {
    setProfileError('');
    setProfileLoading(true);

    const generation = cacheGeneration();
    const cached = await readCachedProfile(session);
    if (cached && generation === cacheGeneration()) { setProfile(cached); setProfileLoading(false); }
    try {
      const nextProfile = await getStudentProfile(session);
      if (generation !== cacheGeneration()) return;
      setProfile(nextProfile as StudentProfile);
      setServerError('');
      await cacheProfile(session, nextProfile as StudentProfile, generation);
    } catch (error) {
      if (!isSessionRejected(error)) setProfileError('Server error. Your saved profile is still available. Please retry.');
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const continueAfterAuth = useCallback(
    async (session: AuthSession) => {
      if (session.user?.face_verification_required) {
        dispatch({ type: 'SET_AUTH_SESSION', session });
        navigate('FaceVerification');
        return;
      }
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
        if (state.authSession) await cacheProfile(state.authSession, updatedProfile);
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
      const tokenGeneration = getTokenGeneration();
      const initialUrl = await Linking.getInitialURL();
      if (openClaimFromUrl(initialUrl)) {
        setWebSessionMissing(false);
        setRestoringSession(false);
        return;
      }

      let tokens = await getSavedTokens();
      let restoredWebUser: AuthUser | undefined;
      if (Platform.OS !== 'web' && tokens) {
        const user = await getSavedSessionUser();
        if (user && active && tokenGeneration === getTokenGeneration()) {
          const savedSession: AuthSession = { ...tokens, user, mustEnrollTotp: !user.totp_enrolled, totpRequired: false };
          const cached = await readCachedProfile(savedSession);
          if (active && tokenGeneration === getTokenGeneration() && cached && user.totp_enrolled) {
            dispatch({ type: 'SET_AUTH_SESSION', session: savedSession });
            setProfile(cached);
            navigate(getFirstMissingOnboardingRoute(savedSession));
            setRestoringSession(false);
          }
        }
      }

      if (Platform.OS === 'web' && !tokens) {
        // The login page and student portal are separate documents. A
        // successful TOTP response carries a short-lived access token for the
        // redirect boundary. The tab-scoped refresh token handles reloads.
        const handoffAccess = consumeWebSessionHandoff();
        if (handoffAccess) {
          try {
            const handoffUser = await getMe(handoffAccess);
            tokens = { access: handoffAccess, refresh: await getSavedRefreshToken() };
            restoredWebUser = handoffUser;
            await saveAccessToken(handoffAccess);
          } catch {
            // The handoff may have expired or the access token may already be
            // invalid. Continue with the tab-scoped refresh credential.
          }
        }

        let lastRestoreError: unknown;
        let restored = Boolean(tokens && restoredWebUser);
        if (restored) {
          // The access token is enough to cross the redirect boundary. The
          // refresh token handles subsequent access-token renewals.
        }

        // Restore directly through the backend token endpoint after reload.
        for (let attempt = 0; !restored && attempt < WEB_SESSION_RESTORE_ATTEMPTS && active; attempt += 1) {
          try {
            const refreshed = await refreshAccessToken();
            tokens = { access: refreshed.access, refresh: await getSavedRefreshToken() };
            restoredWebUser = refreshed.user;
            await saveAccessToken(refreshed.access);
            restored = true;
            break;
          } catch (error) {
            lastRestoreError = error;
            if (attempt + 1 < WEB_SESSION_RESTORE_ATTEMPTS) {
              await waitForWebSessionRetry();
            }
          }
        }

        if (!restored) {
          if (active) {
            setWebSessionMissing(isSessionRejected(lastRestoreError));
            if (!isSessionRejected(lastRestoreError)) setServerError('Server error. Please retry.');
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
        let user = restoredWebUser;

        if (!user) {
          try {
            user = await getMe(access);
          } catch (restoreError) {
            if (!isSessionRejected(restoreError)) throw restoreError;
            if (Platform.OS === 'web') {
              // Retry with the tab-scoped refresh token if the access token
              // expired across the document redirect.
              let refreshed = false;
              let refreshError: unknown = restoreError;
              for (let attempt = 0; attempt < WEB_SESSION_RESTORE_ATTEMPTS && active; attempt += 1) {
                try {
                  const next = await refreshAccessToken();
                  access = next.access;
                  await saveAccessToken(access);
                  user = next.user ?? await getMe(access);
                  refreshed = true;
                  break;
                } catch (error) {
                  refreshError = error;
                  if (attempt + 1 < WEB_SESSION_RESTORE_ATTEMPTS) {
                    await waitForWebSessionRetry();
                  }
                }
              }
              if (!refreshed || !user) {
                throw refreshError;
              }
            } else {
              if (!tokens.refresh) {
                throw restoreError;
              }

              const refreshed = await refreshAccessToken(tokens.refresh);
              access = refreshed.access;
              tokens.refresh = refreshed.refresh ?? tokens.refresh;
              await saveAccessToken(access);
              user = await getMe(access);
            }
          }
        }

        if (!active || tokenGeneration !== getTokenGeneration()) {
          return;
        }

        const session: AuthSession = {
          access,
          refresh: tokens.refresh,
          user,
          mustEnrollTotp: false,
          totpRequired: false,
        };
        await saveTokens(session);
        setServerError('');
        setWebSessionMissing(false);
        dispatch({ type: 'SET_AUTH_SESSION', session });
        if (user.face_verification_required) {
          navigate('FaceVerification');
          return;
        }
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
      } catch (error) {
        if (isSessionRejected(error)) {
          await clearSavedTokens();
          if (active) setWebSessionMissing(Platform.OS === 'web');
        } else if (active) {
          setWebSessionMissing(false);
          setServerError('Server error. Your session is saved. Please retry.');
          const user = await getSavedSessionUser();
          if (user && tokens && active) {
            const session: AuthSession = { ...tokens, user, mustEnrollTotp: !user.totp_enrolled, totpRequired: false };
            dispatch({ type: 'SET_AUTH_SESSION', session });
            const cached = await readCachedProfile(session);
            if (active) {
              if (cached) setProfile(cached);
              else setProfileError('Server error. Connect to load your profile, then retry.');
              navigate(getFirstMissingOnboardingRoute(session));
            }
          }
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
  }, [loadProfileForSession, navigate, openClaimFromUrl, claimLinkHandledRef, onNotificationOpen, dispatch, restoreAttempt]);
  return {
    serverError,
    retryConnection,
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
