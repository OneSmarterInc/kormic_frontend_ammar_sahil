import { AuthSession, OnboardingRoute } from '../../models/onboarding';
export function getFirstMissingOnboardingRoute(session: AuthSession): OnboardingRoute {
  const onboarding = session.user?.onboarding;

  if (!onboarding || onboarding.setup_complete) {
    return 'Profile';
  }
  if (!onboarding.profile_exists || onboarding.basic_info_complete === false) {
    return 'BasicInfo';
  }
  if (!onboarding.github_connected) {
    return 'GitHub';
  }
  if (!onboarding.linkedin_connected) {
    return 'LinkedIn';
  }
  if (!onboarding.resume_uploaded) {
    return 'CV';
  }

  return 'Profile';
}

export function getNextRouteAfterStep(
  route: OnboardingRoute,
  session?: AuthSession,
): OnboardingRoute | undefined {
  const onboarding = session?.user?.onboarding;

  if (route === 'GitHub') {
    if (!onboarding?.linkedin_connected) {
      return 'LinkedIn';
    }
    if (!onboarding?.resume_uploaded) {
      return 'CV';
    }
    return 'BuildingAgent';
  }
  if (route === 'LinkedIn') {
    if (!onboarding?.resume_uploaded) {
      return 'CV';
    }
    return 'BuildingAgent';
  }

  return undefined;
}

export function withProfileCreated(session: AuthSession): AuthSession {
  if (!session.user) {
    return { ...session, profileCreated: true };
  }

  return {
    ...session,
    profileCreated: true,
    user: {
      ...session.user,
      onboarding: {
        profile_exists: true,
        basic_info_complete: true,
        resume_uploaded: Boolean(session.user.onboarding?.resume_uploaded),
        github_connected: Boolean(session.user.onboarding?.github_connected),
        linkedin_connected: Boolean(session.user.onboarding?.linkedin_connected),
        setup_complete:
          Boolean(session.user.onboarding?.resume_uploaded) &&
          Boolean(session.user.onboarding?.github_connected) &&
          Boolean(session.user.onboarding?.linkedin_connected),
      },
    },
  };
}

export function isAuthRoute(route: OnboardingRoute) {
  return route !== 'Profile' && route !== 'AgentLive' && route !== 'BotScreen';
}

export function hidesBotLauncher(route: OnboardingRoute) {
  return (
    route === 'CV' ||
    route === 'GitHub' ||
    route === 'AgentLive' ||
    route === 'LinkedIn' ||
    route === 'BuildingAgent'
  );
}
