import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenShell } from '../../../components/ScreenShell';
import { SectionLabel } from '../../../components/SectionLabel';
import { TextField } from '../../../components/TextField';
import { colors, fonts, radii, type } from '../../../theme/tokens';
import { ClaimLandingScreenProps } from '../types';
import { ClaimStepHeader } from './ClaimStepHeader';

export function ClaimLandingScreen({
  token,
  loading = false,
  error,
  onTokenChange,
  onRequestCode,
  onBackToWelcome,
}: ClaimLandingScreenProps) {
  const hasToken = Boolean(token?.trim());

  return (
    <ScreenShell
      header={<ClaimStepHeader step="1" total="5" label="Invitation claim" onBack={onBackToWelcome} />}
      footer={
        <View style={styles.footerStack}>
          <PrimaryButton
            label="Send verification code"
            onPress={onRequestCode}
            disabled={!hasToken}
            loading={loading}
          />
          <PrimaryButton
            label="Back to welcome"
            onPress={onBackToWelcome}
            variant="secondary"
            disabled={loading}
          />
        </View>
      }
    >
      <View style={styles.content}>
        <View style={styles.heroIcon}>
          <Text style={styles.heroIconText}>ID</Text>
        </View>
        <Text style={styles.title}>Claim your student profile</Text>
        <Text style={styles.subhead}>
          We will confirm this invitation with a one-time code sent to the email your institute uploaded.
        </Text>

        <View style={styles.form}>
          <SectionLabel>Invitation link</SectionLabel>
          <TextField
            label="Invitation token"
            value={token ?? ''}
            onChangeText={onTokenChange}
            placeholder="Paste token from invite link"
            autoCapitalize="none"
            autoCorrect={false}
            required
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardLabel}>Invite status</Text>
          <Text style={styles.cardText}>
            {hasToken
              ? 'Invitation token found. You can continue.'
              : 'No invitation token was found in this link.'}
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
  heroIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  heroIconText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
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
});
