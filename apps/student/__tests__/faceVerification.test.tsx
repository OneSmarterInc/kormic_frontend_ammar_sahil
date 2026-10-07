import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import FaceVerificationScreen from '../src/screens/FaceVerificationScreen';
import * as api from '../src/services/api';
import { deleteAsync } from 'expo-file-system/legacy';

const mockCapture = jest.fn();
const mockPermission = jest.fn();
jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useCameraPermissions: () => [null, mockPermission],
    CameraView: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ takePictureAsync: mockCapture }));
      React.useEffect(() => { props.onCameraReady(); }, []);
      return <View testID="front-camera" />;
    }),
  };
});
jest.mock('expo-file-system/legacy', () => ({ deleteAsync: jest.fn(async () => undefined) }));
jest.mock('../src/services/api', () => ({ startFaceVerification: jest.fn(), submitFaceCapture: jest.fn() }));

const session = { access: 'pending', mustEnrollTotp: false, user: { id: 1, email: 'test@example.test', role: 'student', totp_enrolled: true, face_verification_required: true } };
const challenge = { id: 'challenge-1', action: 'center' as const, step: 0, total_steps: 4 };
async function advanceCapture() {
  await act(async () => { jest.advanceTimersByTime(2000); });
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockPermission.mockResolvedValue({ granted: true });
  mockCapture.mockResolvedValue({ base64: 'camera-frame', uri: 'file://camera-capture.jpg' });
  jest.mocked(api.startFaceVerification).mockResolvedValue(challenge);
});
afterEach(() => jest.useRealTimers());

it('only finishes authentication after a server-confirmed match and removes the temporary photo', async () => {
  const onComplete = jest.fn();
  jest.mocked(api.submitFaceCapture).mockResolvedValue({ passed: true, access: 'verified', refresh: 'verified-refresh', user: { ...session.user, face_verification_required: false } });
  const screen = render(<FaceVerificationScreen session={session} onComplete={onComplete} onCancel={jest.fn()} />);
  fireEvent.press(screen.getByText('Agree and start face scan'));
  await act(async () => undefined);
  expect(screen.getByText(/scanning automatically/i)).toBeTruthy();
  expect(onComplete).not.toHaveBeenCalled();
  await advanceCapture();
  expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ access: 'verified', refresh: 'verified-refresh' }));
  expect(api.submitFaceCapture).toHaveBeenCalledWith(session, challenge, 'camera-frame');
  expect(deleteAsync).toHaveBeenCalledWith('file://camera-capture.jpg', { idempotent: true });
});

it('keeps a mismatched face locked and displays the server rejection', async () => {
  const onComplete = jest.fn();
  jest.mocked(api.submitFaceCapture).mockRejectedValue(new Error('Face did not match this account. Access denied.'));
  const screen = render(<FaceVerificationScreen session={session} onComplete={onComplete} onCancel={jest.fn()} />);
  fireEvent.press(screen.getByText('Agree and start face scan'));
  await act(async () => undefined);
  await advanceCapture();
  expect(screen.getByText('Face did not match this account. Access denied.')).toBeTruthy();
  expect(onComplete).not.toHaveBeenCalled();
  expect(deleteAsync).toHaveBeenCalled();
  await advanceCapture();
  expect(api.submitFaceCapture).toHaveBeenCalledTimes(1);
});

it('moves through poses and retries a missed pose without another tap', async () => {
  const left = { ...challenge, action: 'left' as const, step: 1 };
  const right = { ...challenge, action: 'right' as const, step: 2 };
  const finalCenter = { ...challenge, action: 'center' as const, step: 3 };
  jest.mocked(api.submitFaceCapture)
    .mockResolvedValueOnce(left)
    .mockRejectedValueOnce(new Error('Follow the requested head movement, then try again.'))
    .mockResolvedValueOnce(right)
    .mockResolvedValueOnce(finalCenter)
    .mockResolvedValueOnce({ passed: true, access: 'verified', user: { ...session.user, face_verification_required: false } });
  const onComplete = jest.fn();
  const screen = render(<FaceVerificationScreen session={session} onComplete={onComplete} onCancel={jest.fn()} />);
  fireEvent.press(screen.getByText('Agree and start face scan'));
  await act(async () => undefined);
  await advanceCapture();
  expect(screen.getByText('Slowly turn your head to your left')).toBeTruthy();
  await advanceCapture();
  expect(screen.getByText(/Scanning again automatically/)).toBeTruthy();
  await advanceCapture();
  expect(screen.getByText('Slowly turn your head to your right')).toBeTruthy();
  await advanceCapture();
  expect(screen.getByText('Step 4 of 4')).toBeTruthy();
  await advanceCapture();
  expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ access: 'verified' }));
  expect(api.submitFaceCapture).toHaveBeenNthCalledWith(3, session, left, 'camera-frame');
  expect(api.submitFaceCapture).toHaveBeenNthCalledWith(4, session, right, 'camera-frame');
  expect(api.submitFaceCapture).toHaveBeenNthCalledWith(5, session, finalCenter, 'camera-frame');
});

it('does not begin a scan without camera permission', async () => {
  mockPermission.mockResolvedValue({ granted: false });
  const screen = render(<FaceVerificationScreen session={session} onComplete={jest.fn()} onCancel={jest.fn()} />);
  fireEvent.press(screen.getByText('Agree and start face scan'));
  await act(async () => undefined);
  expect(screen.getByText(/Camera access is needed/)).toBeTruthy();
  expect(api.startFaceVerification).not.toHaveBeenCalled();
});
