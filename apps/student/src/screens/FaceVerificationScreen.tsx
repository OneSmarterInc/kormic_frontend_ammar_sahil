import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { deleteAsync } from 'expo-file-system/legacy';
import { AuthSession } from '../models/onboarding';
import { FaceChallenge, startFaceVerification, submitFaceCapture } from '../services/api';
import { colors } from '../theme/tokens';

const instructions = {
  center: 'Look straight at the camera',
  left: 'Slowly turn your head to your left',
  right: 'Slowly turn your head to your right',
};

export default function FaceVerificationScreen({ session, onComplete, onCancel }: {
  session: AuthSession;
  onComplete: (session: AuthSession) => void | Promise<void>;
  onCancel: () => void | Promise<void>;
}) {
  const camera = useRef<CameraView>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [permission, requestPermission] = useCameraPermissions();
  const [challenge, setChallenge] = useState<FaceChallenge>();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const enrolled = Boolean(session.user?.face_enrolled);

  async function start() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const granted = permission?.granted || (await requestPermission()).granted;
      if (!granted) { setError('Camera access is needed to verify your face. Enable it in your device settings.'); return; }
      setChallenge(await startFaceVerification(session));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to start verification. Please retry.');
    } finally { inFlight.current = false; setBusy(false); }
  }

  async function capture() {
    if (!challenge || !camera.current || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    let capturedUri: string | undefined;
    try {
      // A fresh front-camera image is submitted for each server-selected pose.
      const photo = await camera.current.takePictureAsync({ base64: true, quality: 0.55, imageType: 'jpg' });
      capturedUri = photo?.uri;
      if (!photo?.base64) throw new Error('The camera could not capture a photo. Please retry.');
      const result = await submitFaceCapture(session, challenge, photo.base64);
      if (!mounted.current) return;
      if ('passed' in result && result.passed) {
        await onComplete({ access: result.access, refresh: result.refresh, user: result.user, mustEnrollTotp: false, totpRequired: false });
      } else if ('action' in result) {
        setChallenge(result);
      }
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Unable to verify this capture. Please retry.';
      setError(message);
      if (/expired|already been used|sign in again|fresh TOTP/i.test(message)) setSessionExpired(true);
    } finally {
      if (capturedUri?.startsWith('file://')) await deleteAsync(capturedUri, { idempotent: true }).catch(() => undefined);
      inFlight.current = false; setBusy(false);
    }
  }

  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.eyebrow}>ACCOUNT SECURITY</Text>
    <Text style={styles.title}>{enrolled ? 'Verify it’s you' : 'Set up face verification'}</Text>
    <Text style={styles.body}>{enrolled
      ? 'Complete a short face scan to finish signing in.'
      : 'Before setting up your profile, complete a short face scan. Future sign-ins will match this scan after your authenticator code.'}</Text>
    {challenge && !sessionExpired ? <>
      <View style={styles.preview}>
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="front" mirror={false}
          pictureSize="640x480" onCameraReady={() => setReady(true)}
          onMountError={() => { setReady(false); setError('Unable to open the camera. Close other camera apps and retry.'); }} />
        <View pointerEvents="none" style={styles.oval} />
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.step}>Step {challenge.step + 1} of {challenge.total_steps}</Text>
      <Text style={styles.instruction}>{instructions[challenge.action]}</Text>
      <Text style={styles.body}>Keep your whole face visible in good light. Hold the pose briefly, then capture.</Text>
      <Pressable accessibilityRole="button" disabled={busy || !ready} onPress={capture} style={[styles.button, (busy || !ready) && styles.disabled]}>
        {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.buttonText}>Capture and verify</Text>}
      </Pressable>
    </> : !sessionExpired ? <>
      <View style={styles.notice}><Text style={styles.body}>Your camera captures are processed to check your face and head movements. Kormic stores an encrypted face template for account matching; the captures are not saved by the verification service.</Text></View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={start} style={[styles.button, busy && styles.disabled]}>
        {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.buttonText}>{enrolled ? 'Start face scan' : 'Agree and start face scan'}</Text>}
      </Pressable>
    </> : null}
    {challenge && !sessionExpired && <Pressable disabled={busy} accessibilityRole="button" onPress={start}><Text style={styles.link}>Restart scan</Text></Pressable>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {permission?.canAskAgain === false && !permission.granted && <Pressable onPress={() => Linking.openSettings()} accessibilityRole="button"><Text style={styles.link}>Open camera settings</Text></Pressable>}
    <Pressable disabled={busy} accessibilityRole="button" onPress={() => onCancel()}><Text style={styles.link}>Return to sign in</Text></Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 24, gap: 18, backgroundColor: colors.ink, alignItems: 'stretch', maxWidth: 560, width: '100%', alignSelf: 'center' },
  eyebrow: { color: colors.coral, fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  body: { color: colors.textSoft, fontSize: 15, lineHeight: 23 },
  preview: { height: 320, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.panelInk, justifyContent: 'center', alignItems: 'center' },
  oval: { height: 265, width: 200, borderWidth: 3, borderColor: colors.onAccent, borderRadius: 120 },
  step: { textAlign: 'center', color: colors.muted, fontSize: 13 },
  instruction: { textAlign: 'center', color: colors.text, fontSize: 20, fontWeight: '600' },
  notice: { padding: 18, borderRadius: 18, backgroundColor: colors.accentSoft },
  button: { minHeight: 52, borderRadius: 16, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center', padding: 14 },
  buttonText: { color: colors.onAccent, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  link: { paddingVertical: 12, textAlign: 'center', color: colors.coral, fontWeight: '600' },
  error: { color: colors.error, lineHeight: 22 },
});
