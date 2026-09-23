import { Dispatch, MutableRefObject, useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { AuthSession, AuthUser, OnboardingRoute, OnboardingState } from '../../models/onboarding';
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
      let restoredWebUser: AuthUser | undefined;

      if (Platform.OS === 'web' && !tokens) {
        // The login page and student portal are separate documents. A
        // successful TOTP response can be available before the HttpOnly
        // refresh cookie is observable by the next document, especially when
        // the frontend and API are on different origins. Prefer the short-
        // lived access-token handoff first, then fall back to the cookie.
        const handoffAccess = consumeWebSessionHandoff();
        if (handoffAccess) {
          try {
            const handoffUser = await getMe(handoffAccess);
            tokens = { access: handoffAccess };
            restoredWebUser = handoffUser;
            await saveAccessToken(handoffAccess);
          } catch {
            // The handoff may have expired or the access token may already be
            // invalid. Continue with the normal HttpOnly-cookie restore path.
          }
        }

        let restored = Boolean(tokens && restoredWebUser);
        if (restored) {
          // The access token is enough to cross the redirect boundary. The
          // normal refresh-cookie path remains the long-lived browser session.
        }

        // The shared login page stores the browser refresh credential in an
        // HttpOnly cookie. Restore both the access token and the already
        // server-validated user in one request. This avoids a second
        // authentication hop immediately after the cross-document redirect.
        for (let attempt = 0; !restored && attempt < WEB_SESSION_RESTORE_ATTEMPTS && active; attempt += 1) {
          try {
            const refreshed = await refreshAccessToken();
            tokens = { access: refreshed.access };
            restoredWebUser = refreshed.user;
            await saveAccessToken(refreshed.access);
            restored = true;
            break;
          } catch {
            if (attempt + 1 < WEB_SESSION_RESTORE_ATTEMPTS) {
              await waitForWebSessionRetry();
            }
          }
        }

        if (!restored) {
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
        let user = restoredWebUser;

        if (!user) {
          try {
            user = await getMe(access);
          } catch (restoreError) {
            if (Platform.OS === 'web') {
              // A browser session has no JS refresh token. If the first
              // access-token request races the cross-document redirect,
              // re-read the HttpOnly session cookie and retry as a bounded
              // session restore instead of declaring the user logged out.
              let refreshed = false;
              for (let attempt = 0; attempt < WEB_SESSION_RESTORE_ATTEMPTS && active; attempt += 1) {
                try {
                  const next = await refreshAccessToken();
                  access = next.access;
                  await saveAccessToken(access);
                  user = next.user ?? await getMe(access);
                  refreshed = true;
                  break;
                } catch {
                  if (attempt + 1 < WEB_SESSION_RESTORE_ATTEMPTS) {
                    await waitForWebSessionRetry();
                  }
                }
              }
              if (!refreshed || !user) {
                throw restoreError;
              }
            } else {
              if (!tokens.refresh) {
                throw restoreError;
              }

              const refreshed = await refreshAccessToken(tokens.refresh);
              access = refreshed.access;
              await saveAccessToken(access);
              user = await getMe(access);
            }
          }
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
