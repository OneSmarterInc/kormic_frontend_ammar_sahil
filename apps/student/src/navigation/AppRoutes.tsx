import { Dispatch, SetStateAction } from 'react';
import { useStudentSession } from '../features/auth/useStudentSession';
import { BotScreen } from '../features/chat/BotScreen';
import { useClaimFlow } from '../features/claim/useClaimFlow';
import { OnboardingRoute, OnboardingState } from '../models/onboarding';
import { AgentLiveScreen } from '../screens/AgentLiveScreen';
import { BasicInfoScreen } from '../screens/BasicInfoScreen';
import { BuildingAgentScreen } from '../screens/BuildingAgentScreen';
import {
  ClaimCodeScreen,
  ClaimLandingScreen,
  ClaimPasswordScreen,
  ClaimReviewScreen,
} from '../screens/ClaimFlowScreens';
import { CvScreen } from '../screens/CvScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { GitHubScreen } from '../screens/GitHubScreen';
import { LinkedInScreen } from '../screens/LinkedInScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ResetOtpScreen } from '../screens/ResetOtpScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import TotpScreen from '../screens/TotpSetupScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { OnboardingServices } from '../services/onboardingServices';
import { OnboardingAction } from '../state/onboardingReducer';

export type AppRouteProps = ReturnType<typeof useClaimFlow> &
  ReturnType<typeof useStudentSession> & {
    state: OnboardingState;
    dispatch: Dispatch<OnboardingAction>;
    navigate: (route: OnboardingRoute) => void;
    resetEmail: string;
    resetToken: string;
    setResetEmail: Dispatch<SetStateAction<string>>;
    setResetToken: Dispatch<SetStateAction<string>>;
    services: OnboardingServices;
    next: () => void;
    completeBuild: () => void;
    setProfileAriaActive: Dispatch<SetStateAction<boolean>>;
    closeBotScreen: () => void;
    botNotificationRefreshKey: number;
  };

export function AppRoutes({
  state,
  dispatch,
  navigate,
  resetEmail,
  setResetEmail,
  resetToken,
  setResetToken,
  resetClaimState,
  claimToken,
  claimLoading,
  claimError,
  setClaimToken,
  setClaimError,
  requestClaimCode,
  claimMaskedEmail,
  claimResending,
  verifyClaimCode,
  resendClaimCode,
  claimPrefill,
  updateClaimPrefill,
  confirmClaimProfile,
  createClaimAccount,
  continueAfterAuth,
  continueAfterBasicInfo,
  basicInfoApiError,
  setBasicInfoApiError,
  services,
  next,
  completeBuild,
  viewProfile,
  profileLoading,
  profile,
  profileError,
  handleProfileChanged,
  logout,
  setProfileAriaActive,
  closeBotScreen,
  botNotificationRefreshKey,
}: Pick<
  AppRouteProps,
  | 'state'
  | 'dispatch'
  | 'navigate'
  | 'resetEmail'
  | 'setResetEmail'
  | 'resetToken'
  | 'setResetToken'
  | 'resetClaimState'
  | 'claimToken'
  | 'claimLoading'
  | 'claimError'
  | 'setClaimToken'
  | 'setClaimError'
  | 'requestClaimCode'
  | 'claimMaskedEmail'
  | 'claimResending'
  | 'verifyClaimCode'
  | 'resendClaimCode'
  | 'claimPrefill'
  | 'updateClaimPrefill'
  | 'confirmClaimProfile'
  | 'createClaimAccount'
  | 'continueAfterAuth'
  | 'continueAfterBasicInfo'
  | 'basicInfoApiError'
  | 'setBasicInfoApiError'
  | 'services'
  | 'next'
  | 'completeBuild'
  | 'viewProfile'
  | 'profileLoading'
  | 'profile'
  | 'profileError'
  | 'handleProfileChanged'
  | 'logout'
  | 'setProfileAriaActive'
  | 'closeBotScreen'
  | 'botNotificationRefreshKey'
>) {
  switch (state.route) {
    case 'Welcome':
      return (
        <WelcomeScreen
          onStart={() => {
            dispatch({ type: 'RESET_BASIC_INFO' });
            navigate('BasicInfo');
          }}
          onLogin={() => navigate('Login')}
          onClaim={() => {
            resetClaimState();
            navigate('ClaimLanding');
          }}
        />
      );
    case 'Login':
      return (
        <LoginScreen
          dispatch={dispatch}
          onContinue={(session) => (session ? continueAfterAuth(session) : navigate('SecuritySetup'))}
          onSignUp={() => navigate('Welcome')}
          onForgotPassword={() => navigate('ForgotPassword')}
        />
      );
    case 'ForgotPassword':
      return (
        <ForgotPasswordScreen
          initialEmail={resetEmail}
          onCodeSent={(email) => {
            setResetEmail(email);
            navigate('ResetOtp');
          }}
          onBackToLogin={() => navigate('Login')}
        />
      );
    case 'ResetOtp':
      return (
        <ResetOtpScreen
          email={resetEmail}
          onVerified={(token) => {
            setResetToken(token);
            navigate('ResetPassword');
          }}
          onBackToEmail={() => navigate('ForgotPassword')}
        />
      );
    case 'ResetPassword':
      return (
        <ResetPasswordScreen
          resetToken={resetToken}
          onComplete={() => {
            setResetToken('');
            navigate('Login');
          }}
          onExpired={() => {
            setResetToken('');
            navigate('ForgotPassword');
          }}
        />
      );
    case 'ClaimLanding':
      return (
        <ClaimLandingScreen
          token={claimToken}
          loading={claimLoading}
          error={claimError}
          onTokenChange={(token) => {
            setClaimToken(token);
            setClaimError('');
          }}
          onRequestCode={requestClaimCode}
          onBackToWelcome={() => {
            resetClaimState();
            navigate('Welcome');
          }}
        />
      );
    case 'ClaimCode':
      return (
        <ClaimCodeScreen
          maskedEmail={claimMaskedEmail || 'your institute email'}
          loading={claimLoading}
          resending={claimResending}
          error={claimError}
          onVerify={verifyClaimCode}
          onResend={resendClaimCode}
          onBack={() => {
            setClaimError('');
            navigate('ClaimLanding');
          }}
        />
      );
    case 'ClaimReview':
      return (
        <ClaimReviewScreen
          value={claimPrefill}
          loading={claimLoading}
          error={claimError}
          onChange={updateClaimPrefill}
          onConfirm={confirmClaimProfile}
          onBack={() => {
            setClaimError('');
            navigate('ClaimCode');
          }}
        />
      );
    case 'ClaimPassword':
      return (
        <ClaimPasswordScreen
          email={claimPrefill.email}
          fullName={claimPrefill.full_name}
          loading={claimLoading}
          error={claimError}
          onCreateAccount={createClaimAccount}
          onBack={() => {
            setClaimError('');
            navigate('ClaimReview');
          }}
        />
      );
    case 'BasicInfo':
      return (
        <BasicInfoScreen
          state={state}
          dispatch={dispatch}
          onContinue={continueAfterBasicInfo}
          apiError={basicInfoApiError}
          onClearApiError={() => setBasicInfoApiError('')}
        />
      );
    case 'SecuritySetup':
      return (
        <TotpScreen
          authSession={state.authSession}
          basicInfo={state.basicInfo}
          onAuthenticated={(session) => dispatch({ type: 'SET_AUTH_SESSION', session })}
          onContinue={continueAfterAuth}
        />
      );
    case 'GitHub':
      return <GitHubScreen state={state} services={services} dispatch={dispatch} onContinue={next} />;
    case 'LinkedIn':
      return <LinkedInScreen state={state} services={services} dispatch={dispatch} onContinue={next} />;
    case 'CV':
      return <CvScreen state={state} services={services} dispatch={dispatch} onContinue={next} />;
    case 'BuildingAgent':
      return (
        <BuildingAgentScreen
          services={services}
          buildStage={state.buildStage}
          dispatch={dispatch}
          onComplete={completeBuild}
        />
      );
    case 'AgentLive':
      return <AgentLiveScreen state={state} onViewProfile={viewProfile} loadingProfile={profileLoading} />;
    case 'Profile':
      return (
        <ProfileScreen
          profile={profile}
          loading={profileLoading}
          error={profileError}
          session={state.authSession}
          services={services}
          onRetry={viewProfile}
          onProfileChanged={handleProfileChanged}
          onLogout={logout}
          onAriaSectionActiveChange={setProfileAriaActive}
        />
      );
    case 'BotScreen':
      return (
        <BotScreen
          session={state.authSession}
          onBack={closeBotScreen}
          refreshKey={botNotificationRefreshKey}
        />
      );
  }
}
