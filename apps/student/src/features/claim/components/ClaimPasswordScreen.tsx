import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PasswordVisibilityIcon } from '../../../components/PasswordVisibilityIcon';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenShell } from '../../../components/ScreenShell';
import { SectionLabel } from '../../../components/SectionLabel';
import { TextField } from '../../../components/TextField';
import { colors, fonts, radii, type } from '../../../theme/tokens';
import { ClaimPasswordScreenProps } from '../types';
import { ClaimStepHeader } from './ClaimStepHeader';

export function ClaimPasswordScreen({
  email,
  fullName,
  loading = false,
  error,
  onCreateAccount,
  onBack,
}: ClaimPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const canContinue = Boolean(password.trim()) && password === confirmPassword;

  return (
    <ScreenShell
      header={<ClaimStepHeader step="4" total="5" label="Account setup" onBack={onBack} />}
      footer={
        <View style={styles.footerStack}>
          <PrimaryButton
            label="Create account"
            onPress={() => onCreateAccount(password)}
            disabled={!canContinue}
            loading={loading}
          />
          <PrimaryButton label="Back to review" onPress={onBack} variant="secondary" disabled={loading} />
        </View>
      }
    >
      <View style={styles.content}>
        <Text style={styles.title}>Set your password</Text>
        <Text style={styles.subhead}>
          This creates the login account for {fullName || email}. TOTP setup comes next.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.cardLabel}>Account email</Text>
          <Text style={styles.cardText}>{email}</Text>
        </View>

        <View style={styles.form}>
          <SectionLabel>Password</SectionLabel>
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!passwordVisible}
            required
            rightElement={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={passwordVisible ? 'Conceal password' : 'Reveal password'}
                onPress={() => setPasswordVisible((visible) => !visible)}
                style={styles.passwordToggle}
              >
                <PasswordVisibilityIcon visible={passwordVisible} />
              </Pressable>
            }
          />
          <TextField
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!passwordVisible}
            required
            error={
              confirmPassword.length > 0 && password !== confirmPassword
                ? 'Passwords do not match'
                : undefined
            }
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
  infoCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  cardLabel: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  cardText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
  },
  errorText: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  passwordToggle: {
    alignItems: 'center',
    borderRadius: 999,
    minWidth: 44,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
