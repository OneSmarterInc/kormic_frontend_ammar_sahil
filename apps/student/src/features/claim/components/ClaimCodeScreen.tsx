import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenShell } from '../../../components/ScreenShell';
import { SectionLabel } from '../../../components/SectionLabel';
import { TextField } from '../../../components/TextField';
import { colors, fonts, type } from '../../../theme/tokens';
import { ClaimCodeScreenProps } from '../types';
import { ClaimStepHeader } from './ClaimStepHeader';

export function ClaimCodeScreen({
  maskedEmail,
  loading = false,
  resending = false,
  error,
  onVerify,
  onResend,
  onBack,
}: ClaimCodeScreenProps) {
  const [code, setCode] = useState('');
  const normalizedCode = code.trim();
  const canContinue = /^\d{6}$/.test(normalizedCode);

  return (
    <ScreenShell
      header={<ClaimStepHeader step="2" total="5" label="Email check" onBack={onBack} />}
      footer={
        <View style={styles.footerStack}>
          <PrimaryButton
            label="Verify code"
            onPress={() => onVerify(normalizedCode)}
            disabled={!canContinue}
            loading={loading}
          />
          <PrimaryButton
            label={resending ? 'Sending code...' : 'Resend code'}
            onPress={onResend}
            variant="secondary"
            disabled={loading || resending}
            loading={resending}
          />
        </View>
      }
    >
      <View style={styles.content}>
        <Text style={styles.title}>Enter your code</Text>
        <Text style={styles.subhead}>We sent a 6-digit code to {maskedEmail}. It expires soon.</Text>

        <View style={styles.form}>
          <SectionLabel>Verification</SectionLabel>
          <TextField
            label="6-digit code"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
            required
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 18,
  },
  title: {
    ...type.title,
    fontSize: 34,
    lineHeight: 39,
  },
  subhead: {
    ...type.body,
  },
  form: {
    gap: 14,
  },
  footerStack: {
    gap: 10,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
});
