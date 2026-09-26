import { MaterialIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { ConfirmModal } from '../../components/ConfirmModal';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenShell } from '../../components/ScreenShell';
import { getAgentName } from '../../services/api';
import { colors, fonts } from '../../theme/tokens';
import { AriaBotScreen } from '../chat/AriaBotScreen';
import { AriaHeaderCommand } from '../chat/types';
import { GithubAnalysisDetails } from '../github/GithubAnalysisDetails';
import { GithubProfilePanel } from '../github/GithubProfilePanel';
import { useGithubProfile } from '../github/useGithubProfile';
import { LinkedinImageHistory } from '../linkedin/LinkedinImageHistory';
import { useLinkedinProfile } from '../linkedin/useLinkedinProfile';
import { EditProfileForm } from './components/EditProfileForm';
import { ProfileMenu, sectionTitle } from './components/ProfileMenu';
import { ProfileOverview } from './components/ProfileOverview';
import { ProfileError } from './components/ProfileSections';
import { ResumeManager } from './components/ResumeManager';
import { SourceEditor } from './components/SourceEditor';
import { normalizeStudentProfile } from './normalizeProfile';
import { sampleProfile } from './sampleProfile';
import { ProfileScreenProps, ProfileSection } from './types';
import { useProfileEditor } from './useProfileEditor';
import { useProfileImage } from './useProfileImage';
import { useResumes } from './useResumes';

export function ProfileScreen({
  profile: loadedProfile,
  loading = false,
  error,
  session,
  services,
  onRetry,
  onProfileChanged,
  onLogout,
  onAriaSectionActiveChange,
}: ProfileScreenProps) {
  const profile = useMemo(() => normalizeStudentProfile(loadedProfile ?? sampleProfile), [loadedProfile]);
  const skills = profile.technical_skills?.length ? profile.technical_skills : profile.skills;
  const [section, setSectionState] = useState<ProfileSection>('aria');
  const [sectionHistory, setSectionHistory] = useState<ProfileSection[]>([]);
  const [agentName, setAgentName] = useState('Aria');
  const [ariaHeaderCommand, setAriaHeaderCommand] = useState<AriaHeaderCommand | undefined>();
  const sendAriaHeaderCommand = (type: AriaHeaderCommand['type']) => {
    setAriaHeaderCommand({ type, id: Date.now() });
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [ariaActionsOpen, setAriaActionsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [sectionError, setSectionError] = useState('');

  useEffect(() => {
    onAriaSectionActiveChange?.(section === 'aria');
  }, [onAriaSectionActiveChange, section]);

  useEffect(() => {
    let active = true;

    const loadAgentName = async () => {
      if (!session) {
        setAgentName('Aria');
        return;
      }

      try {
        const response = await getAgentName(session);
        const nextAgentName =
          response.agent_name?.trim() || response.agent?.trim() || response.name?.trim() || 'Aria';

        if (active) {
          setAgentName(nextAgentName);
        }
      } catch {
        if (active) {
          setAgentName('Aria');
        }
      }
    };

    loadAgentName();

    return () => {
      active = false;
    };
  }, [session]);

  const selectSection = (nextSection: ProfileSection) => {
    if (section !== nextSection) {
      setSectionHistory((prev) => [...prev, section]);
      setSectionState(nextSection);
    }
    setMenuOpen(false);
    setSectionError('');
  };

  const goBackSection = useCallback(() => {
    if (sectionHistory.length > 0) {
      const prevSection = sectionHistory[sectionHistory.length - 1];
      setSectionHistory((prev) => prev.slice(0, prev.length - 1));
      if (prevSection) {
        setSectionState(prevSection);
      }
      return true;
    }

    if (section !== 'aria') {
      setSectionState('aria');
      return true;
    }

    return false;
  }, [section, sectionHistory]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      return goBackSection();
    });

    return () => {
      subscription.remove();
    };
  }, [goBackSection]);

  const {
    resumes,
    resumesLoading,
    resumeUploadLoading,
    viewLoadingId,
    deleteLoadingId,
    loadResumes,
    uploadNewResume,
    downloadResume,
    removeResume,
  } = useResumes({ session, services, section, setSectionError, onProfileChanged });
  const {
    githubAnalysis,
    githubHistory,
    githubLoading,
    githubConnected,
    message,
    loadGithubHistory,
    runGithubAnalysis,
    handleConnectGitHub,
  } = useGithubProfile({ session, section, setSectionError, setActionLoading, onProfileChanged });
  const {
    linkedinImages,
    linkedinPreviews,
    linkedinLoading,
    linkedinUrl,
    setLinkedinUrl,
    loadLinkedinImages,
    savePlainUrl,
    uploadLinkedinImages,
  } = useLinkedinProfile({
    session,
    services,
    profile,
    section,
    setSectionError,
    setActionLoading,
    onProfileChanged,
  });
  const {
    profileImageUrl,
    profileImageLoading,
    replaceImageLoading,
    deleteImageLoading,
    replaceProfileImage,
    removeProfileImage,
  } = useProfileImage({ session, services, profile, setSectionError, onProfileChanged });
  const { profileFieldErrors, profileDraft, setProfileDraft, saveProfileDetails } = useProfileEditor({
    session,
    profile,
    setSectionError,
    setActionLoading,
    onProfileChanged,
    selectSection,
  });

  if (loading && !loadedProfile) {
    return (
      <ScreenShell>
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.coral} />
          <Text style={styles.loadingText}>Loading your agent...</Text>
        </View>
      </ScreenShell>
    );
  }
  if (error && !loadedProfile) {
    return (
      <ScreenShell>
        <ProfileError message={error} onRetry={onRetry} loading={loading} />
      </ScreenShell>
    );
  }

  const confirmLogout = () => {
    setLogoutConfirmVisible(false);
    onLogout?.();
  };

  return (
    <ScreenShell>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile menu"
          onPress={() => setMenuOpen((value) => !value)}
          style={styles.menuButton}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </Pressable>

        {!menuOpen ? (
          <>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {section === 'overview' ? 'Complete profile' : sectionTitle(section, agentName)}
            </Text>

            {section === 'aria' ? (
              <View style={styles.topBarActions}>
                {/* More button */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Aria chat actions"
                  onPress={() => setAriaActionsOpen((current) => !current)}
                  style={[styles.topBarIconButton, ariaActionsOpen && styles.topBarIconButtonActive]}
                >
                  <MaterialIcons name="more-vert" size={22} color={colors.offWhite} />
                </Pressable>

                {/* Expanded actions */}
                {ariaActionsOpen ? (
                  <View style={styles.ariaActionsMenu}>
                    {/* Edit */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Edit agent name"
                      onPress={() => {
                        setAriaActionsOpen(false);
                        sendAriaHeaderCommand('edit');
                      }}
                      style={styles.topBarIconButton}
                    >
                      <MaterialIcons name="edit" size={18} color={colors.offWhite} />
                    </Pressable>

                    {/* History */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Open chat history"
                      onPress={() => {
                        setAriaActionsOpen(false);
                        sendAriaHeaderCommand('history');
                      }}
                      style={styles.topBarIconButton}
                    >
                      <MaterialIcons name="history" size={19} color={colors.offWhite} />
                    </Pressable>

                    {/* Download PDF */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Download chat as PDF"
                      onPress={() => {
                        setAriaActionsOpen(false);
                        sendAriaHeaderCommand('download');
                      }}
                      style={styles.topBarIconButton}
                    >
                      <MaterialIcons name="download" size={19} color={colors.offWhite} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      <ConfirmModal
        visible={logoutConfirmVisible}
        title="Log out?"
        message="You will need to sign in again to access your profile and agent chat."
        primaryLabel="Logout"
        secondaryLabel="Cancel"
        onPrimary={confirmLogout}
        onSecondary={() => setLogoutConfirmVisible(false)}
        onRequestClose={() => setLogoutConfirmVisible(false)}
      />

      {menuOpen ? (
        <ProfileMenu
          active={section}
          agentName={agentName}
          onSelect={selectSection}
          onLogout={onLogout ? () => setLogoutConfirmVisible(true) : undefined}
        />
      ) : (
        <>
          {error ? <ProfileError message={error} onRetry={onRetry} loading={loading} /> : null}

          {loading ? <ActivityIndicator color={colors.coral} style={styles.inlineLoader} /> : null}

          {section === 'resumes' ? (
            <ResumeManager
              resumes={resumes}
              loading={resumesLoading}
              viewLoadingId={viewLoadingId}
              deleteLoadingId={deleteLoadingId}
              uploadLoading={resumeUploadLoading}
              error={sectionError}
              onUpload={uploadNewResume}
              onDownload={downloadResume}
              onDelete={removeResume}
              onRefresh={loadResumes}
            />
          ) : null}

          {section === 'edit' ? (
            <EditProfileForm
              draft={profileDraft}
              imageUrl={profileImageUrl}
              imageLoading={profileImageLoading}
              replaceImageLoading={replaceImageLoading}
              deleteImageLoading={deleteImageLoading}
              loading={actionLoading}
              error={sectionError}
              fieldErrors={profileFieldErrors}
              onChange={(field, value) => setProfileDraft((current) => ({ ...current, [field]: value }))}
              onReplaceImage={replaceProfileImage}
              onRemoveImage={removeProfileImage}
              onSave={saveProfileDetails}
            />
          ) : null}

          {section === 'github' ? (
            <View style={styles.form}>
              {!githubConnected ? (
                <View style={styles.connectGithubCard}>
                  <Text style={styles.connectGithubTitle}>Connect GitHub Account</Text>
                  <Text style={styles.sectionIntro}>
                    Connect your GitHub account to analyze your repositories and technical skills.
                  </Text>
                  {message ? <Text style={styles.successText}>{message}</Text> : null}
                  {sectionError ? <Text style={styles.errorTextMsg}>{sectionError}</Text> : null}
                  <PrimaryButton
                    label={githubLoading ? 'Connecting...' : 'Connect GitHub'}
                    onPress={handleConnectGitHub}
                    loading={githubLoading}
                    disabled={githubLoading}
                  />
                </View>
              ) : (
                <>
                  <SourceEditor
                    title="GitHub"
                    description={
                      profile.github
                        ? 'Run a fresh analysis on your connected GitHub account.'
                        : 'Your GitHub account is connected. Run analysis to get insights.'
                    }
                    value=""
                    onChange={() => undefined}
                    primaryLabel="Save"
                    secondaryLabel="Analyze GitHub"
                    showUrlField={false}
                    showPrimaryAction={false}
                    disabled={actionLoading}
                    error={sectionError}
                    onPrimary={() => undefined}
                    onSecondary={runGithubAnalysis}
                  />
                  {message ? <Text style={styles.successText}>{message}</Text> : null}
                  {sectionError ? <Text style={styles.errorTextMsg}>{sectionError}</Text> : null}
                  <GithubAnalysisDetails
                    loading={githubLoading}
                    currentAnalysis={githubAnalysis}
                    history={githubHistory}
                    onRefresh={loadGithubHistory}
                  />
                </>
              )}
            </View>
          ) : null}

          {section === 'githubProfile' ? (
            <GithubProfilePanel session={session} onConnect={() => selectSection('github')} onProfileChanged={onProfileChanged} />
          ) : null}

          {section === 'linkedin' ? (
            <SourceEditor
              title="LinkedIn"
              description={
                profile.linkedin_url
                  ? 'Update the saved URL or upload screenshots for a fresh analysis.'
                  : 'Upload profile screenshots.'
              }
              value={linkedinUrl}
              onChange={setLinkedinUrl}
              placeholder="https://www.linkedin.com/in/username"
              primaryLabel="Save URL"
              secondaryLabel="Upload images"
              showUrlField={false}
              showPrimaryAction={false}
              disabled={actionLoading}
              error={sectionError}
              onPrimary={() => savePlainUrl('linkedin_url', linkedinUrl)}
              onSecondary={uploadLinkedinImages}
            />
          ) : null}

          {section === 'linkedin' ? (
            <LinkedinImageHistory
              session={session}
              loading={linkedinLoading}
              localPreviews={linkedinPreviews}
              records={linkedinImages}
              onRefresh={loadLinkedinImages}
              actionLoading={actionLoading}
            />
          ) : null}

          {section === 'aria' ? (
            <AriaBotScreen
              session={session}
              onAgentNameChange={setAgentName}
              headerCommand={ariaHeaderCommand}
              onHeaderCommandHandled={() => setAriaHeaderCommand(undefined)}
              hideHeader
            />
          ) : null}

          {section === 'overview' ? (
            <ProfileOverview
              onGithubConnect={() => selectSection('github')}
              profile={profile}
              skills={skills}
              profileImageUrl={profileImageUrl}
              profileImageLoading={profileImageLoading}
              session={session}
            />
          ) : null}
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  topBarActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  topBarIconButtonActive: {
    backgroundColor: 'rgba(56,90,70,0.14)',
    borderColor: 'rgba(56,90,70,0.32)',
  },
  ariaActionsMenu: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    padding: 6,
    position: 'absolute',
    right: 42,
    top: 0,
    zIndex: 1000,

    elevation: 8,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  topBarIconButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    borderRadius: 10,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    borderRadius: 10,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
    marginTop: 24,
  },
  menuIcon: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
  },
  topBarTitle: {
    color: colors.offWhite,
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 17,
    marginTop: 18,
  },
  sectionIntro: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  loadingState: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  inlineLoader: {
    marginBottom: 12,
  },
  errorTextMsg: {
    color: colors.coral,
    fontSize: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  form: {
    gap: 10,
  },
  successText: {
    color: colors.connectionBlue,
    fontFamily: fonts.body,
    fontSize: 14,
    marginVertical: 8,
  },
  connectGithubCard: {
    backgroundColor: 'rgba(56,90,70,0.10)',
    borderColor: 'rgba(56,90,70,0.22)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 20,
    marginBottom: 10,
  },
  connectGithubTitle: {
    color: colors.offWhite,
    fontFamily: fonts.heading,
    fontSize: 20,
    lineHeight: 26,
  },
});
