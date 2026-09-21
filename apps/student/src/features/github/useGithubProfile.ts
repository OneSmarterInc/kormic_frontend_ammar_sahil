import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import {
  analyzeGithub,
  getGithubConnectUrl,
  getGithubHistory,
  getGithubStatus,
  GithubAnalysisResponse,
  GithubHistoryResponse,
} from '../../services/api';
import { ProfileFeatureContext } from '../profile/types';

export function useGithubProfile({
  session,
  section,
  setSectionError,
  setActionLoading,
  onProfileChanged,
}: Pick<
  ProfileFeatureContext,
  'session' | 'section' | 'setSectionError' | 'setActionLoading' | 'onProfileChanged'
>) {
  const [githubAnalysis, setGithubAnalysis] = useState<GithubAnalysisResponse | undefined>();

  const [githubHistory, setGithubHistory] = useState<GithubHistoryResponse['analyses']>([]);

  const [githubLoading, setGithubLoading] = useState(false);

  const [githubConnected, setGithubConnected] = useState(false);

  const [message, setMessage] = useState('');

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const pollGithubStatusAfterOAuth = useCallback(async () => {
    if (!session) return;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        const nextStatus = await getGithubStatus(session);
        if (nextStatus.connected) {
          setGithubConnected(true);
          setMessage('GitHub connected successfully. You can now analyze it.');
        }
      } catch (error) {
        console.log('Polling attempt failed:', error);
      }
      await wait(2000);
    }
    setMessage('If GitHub says connected, refresh the page or tap Connect again to update status.');
  }, [session]);

  useEffect(() => {
    const checkGithubStatus = async () => {
      if (!session) return;

      try {
        const status = await getGithubStatus(session);
        setGithubConnected(status.connected);
      } catch (error) {
        console.log('GitHub status error:', error);
      }
    };
    checkGithubStatus();
  }, [session]);

  const loadGithubHistory = async () => {
    if (!session) {
      setSectionError('Please sign in again to view GitHub details.');
      return;
    }

    try {
      setSectionError('');
      setGithubLoading(true);
      const data = await getGithubHistory(session);
      setGithubHistory(data.analyses ?? []);
    } catch (githubError) {
      setSectionError(githubError instanceof Error ? githubError.message : 'Unable to load GitHub details');
    } finally {
      setGithubLoading(false);
    }
  };

  useEffect(() => {
    if (section === 'github') {
      loadGithubHistory();
    }
  }, [section, session?.access, session?.user?.student_id]);

  const runGithubAnalysis = async () => {
    if (!session) {
      setSectionError('Please sign in again to update GitHub.');
      return;
    }

    try {
      setActionLoading(true);
      setSectionError('');
      setMessage('');

      const result = await analyzeGithub(session);
      setGithubAnalysis(result);
      await loadGithubHistory();
      await onProfileChanged?.();

      setMessage('GitHub analysis completed successfully.');
    } catch (githubError) {
      setSectionError(githubError instanceof Error ? githubError.message : 'Unable to analyze GitHub');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConnectGitHub = async () => {
    if (!session) {
      setSectionError('Please sign in again to connect GitHub.');
      return;
    }

    setMessage('');
    setSectionError('');

    try {
      setGithubLoading(true);
      const data = await getGithubConnectUrl(session);

      if (!data.authorize_url) {
        throw new Error('The server did not return a GitHub authorization URL.');
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.open === 'function') {
        const popup = window.open(data.authorize_url, '_blank');

        if (!popup) {
          setMessage('GitHub opened in a new browser tab. Complete authorization there, then return here.');
          await Linking.openURL(data.authorize_url);
        } else {
          popup.focus();
          setMessage('Complete GitHub authorization in the new tab, then return here.');
        }

        pollGithubStatusAfterOAuth();
        return;
      }

      await Linking.openURL(data.authorize_url);
      setMessage('Complete GitHub authorization in the browser, then return here.');
      pollGithubStatusAfterOAuth();
    } catch (error) {
      setSectionError(error instanceof Error ? error.message : 'Unable to start GitHub OAuth.');
    } finally {
      setGithubLoading(false);
    }
  };

  return {
    githubAnalysis,
    githubHistory,
    githubLoading,
    githubConnected,
    message,
    loadGithubHistory,
    runGithubAnalysis,
    handleConnectGitHub,
  };
}
