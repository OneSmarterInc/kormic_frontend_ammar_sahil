import {
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
  useFonts as useFraunces,
} from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_600SemiBold, useFonts as useInter } from '@expo-google-fonts/inter';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, StatusBar, StyleSheet, View, Text, Pressable } from 'react-native';
import { ProgressHeader } from './components/ProgressHeader';
import { useStudentSession } from './features/auth/useStudentSession';
import { useClaimFlow } from './features/claim/useClaimFlow';
import { StudentNotificationBell } from './features/notifications/StudentNotificationBell';
import { useAgentNotifications } from './features/notifications/useAgentNotifications';
import { getNextRouteAfterStep, hidesBotLauncher, isAuthRoute } from './features/onboarding/navigation';
import { initialOnboardingState, OnboardingRoute } from './models/onboarding';
import { AppRoutes } from './navigation/AppRoutes';
import { canAdvanceFrom } from './navigation/routes';
import { mockOnboardingServices } from './services/onboardingServices';
import { onboardingReducer } from './state/onboardingReducer';
import { colors } from './theme/tokens';

export default function App() {
  const [frauncesLoaded] = useFraunces({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
  });
  const [interLoaded] = useInter({
    Inter_400Regular,
    Inter_600SemiBold,
  });
  const [state, dispatch] = useReducer(onboardingReducer, initialOnboardingState);
  const [botReturnRoute, setBotReturnRoute] = useState<OnboardingRoute>('Profile');
  const [profileAriaActive, setProfileAriaActive] = useState(false);
  const services = useMemo(() => mockOnboardingServices, []);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');

  const navigate = useCallback((route: OnboardingRoute) => dispatch({ type: 'NAVIGATE', route }), []);
  const back = useCallback(() => dispatch({ type: 'BACK' }), []);
  const goToWelcomeFromHeader = useCallback(() => {
    setBasicInfoApiError('');
    dispatch({ type: 'GO_TO_WELCOME' });
  }, []);
  const openBotScreen = useCallback(() => {
    setBotReturnRoute(state.route === 'BotScreen' ? botReturnRoute : state.route);
    navigate('BotScreen');
  }, [botReturnRoute, navigate, state.route]);

  const closeBotScreen = useCallback(() => {
    const targetRoute = isAuthRoute(botReturnRoute) ? 'Profile' : botReturnRoute;
    navigate(targetRoute);
  }, [botReturnRoute, navigate]);
  const next = useCallback(() => {
    const routedStep = getNextRouteAfterStep(state.route, state.authSession);
    if (routedStep) {
      navigate(routedStep);
      return;
    }

    if (canAdvanceFrom(state.route, state)) {
      dispatch({ type: 'NEXT' });
    }
  }, [navigate, state]);
  const completeBuild = useCallback(() => navigate('AgentLive'), [navigate]);
  const {
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
  } = useClaimFlow(navigate, dispatch);
  const [queryNavigation, setQueryNavigation] = useState<import('./features/queries/StudentQueriesPanel').QueryNavigation>();
  const onOpenQueries = useCallback((id?: number, direction?: string) => {
    setQueryNavigation({id, direction, key: Date.now()});
    navigate('Profile');
  }, [navigate]);
  const onOpenChat = useCallback(() => {
    setBotReturnRoute('Profile');
    navigate('BotScreen');
  }, [navigate]);
  const { refreshKey: botNotificationRefreshKey, openNotificationChat } = useAgentNotifications(
    state.authSession,
    onOpenChat,
  );
  const {
    profile,
    profileLoading,
    profileError,
    basicInfoApiError,
    setBasicInfoApiError,
    serverError,
    retryConnection,
    restoringSession,
    webSessionMissing,
    continueAfterAuth,
    continueAfterBasicInfo,
    viewProfile,
    handleProfileChanged,
    logout,
  } = useStudentSession({
    state,
    dispatch,
    navigate,
    openClaimFromUrl,
    claimLinkHandledRef,
    onNotificationOpen: openNotificationChat,
  });

  // Browser users authenticate through the single Kormic Login. Native login,
  // registration, and trusted claim-link flows keep their existing behavior.
  useEffect(() => {
    if (Platform.OS !== 'web' || restoringSession || !webSessionMissing || state.authSession?.access) return;
    const signupFlow = new URLSearchParams(window.location.search).get('signup') === '1';
    if (signupFlow || claimLinkHandledRef.current) return;
    window.location.replace('/login?portal=student');
  }, [restoringSession, webSessionMissing, claimLinkHandledRef, state.authSession?.access]);

  const handleBack = useCallback(() => {
    if (state.route === 'BotScreen' || (state.route === 'Profile' && profileAriaActive)) return false;
    if (isAuthRoute(state.route)) return false;
    if (state.route === 'Profile') return false; // Its section handler opens chat.
    onOpenChat();
    return true;
  }, [onOpenChat, profileAriaActive, state.route]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => {
      subscription.remove();
    };
  }, [handleBack]);

  if (!frauncesLoaded || !interLoaded || restoringSession) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.coral} />
      </View>
    );
  }

  const content = (
    <AppRoutes
      notificationControl={state.authSession?.user?.totp_enrolled ? <StudentNotificationBell session={state.authSession} onOpenChat={onOpenChat} onOpenQueries={onOpenQueries} /> : null}
      state={state}
      dispatch={dispatch}
      navigate={navigate}
      resetEmail={resetEmail}
      setResetEmail={setResetEmail}
      resetToken={resetToken}
      setResetToken={setResetToken}
      resetClaimState={resetClaimState}
      claimToken={claimToken}
      claimLoading={claimLoading}
      claimError={claimError}
      setClaimToken={setClaimToken}
      setClaimError={setClaimError}
      requestClaimCode={requestClaimCode}
      claimMaskedEmail={claimMaskedEmail}
      claimResending={claimResending}
      verifyClaimCode={verifyClaimCode}
      resendClaimCode={resendClaimCode}
      claimPrefill={claimPrefill}
      updateClaimPrefill={updateClaimPrefill}
      confirmClaimProfile={confirmClaimProfile}
      createClaimAccount={createClaimAccount}
      continueAfterAuth={continueAfterAuth}
      continueAfterBasicInfo={continueAfterBasicInfo}
      basicInfoApiError={basicInfoApiError}
      setBasicInfoApiError={setBasicInfoApiError}
      services={services}
      next={next}
      completeBuild={completeBuild}
      viewProfile={viewProfile}
      profileLoading={profileLoading}
      profile={profile}
      profileError={profileError}
      handleProfileChanged={handleProfileChanged}
      logout={logout}
      setProfileAriaActive={setProfileAriaActive}
      closeBotScreen={closeBotScreen}
      botNotificationRefreshKey={botNotificationRefreshKey}
      queryNavigation={queryNavigation}
    />
  );

  return (
    <View style={styles.root}>
      {Platform.OS !== 'android' ? <StatusBar barStyle="dark-content" backgroundColor={colors.ink} /> : null}
      <ProgressHeader route={state.route} onBack={goToWelcomeFromHeader} />
      {serverError ? <View accessibilityRole="alert" style={{ padding: 16, backgroundColor: '#fff4db', gap: 8 }}>
        <Text style={{ color: colors.text }}>{serverError}</Text>
        <Pressable accessibilityRole="button" onPress={retryConnection} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.coral }}>Retry connection</Text></Pressable>
      </View> : null}
      {serverError && !state.authSession ? null : content}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
});
