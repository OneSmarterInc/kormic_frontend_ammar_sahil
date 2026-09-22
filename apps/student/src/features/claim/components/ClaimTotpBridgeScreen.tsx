import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenShell } from '../../../components/ScreenShell';
import { colors, fonts, type } from '../../../theme/tokens';
import { ClaimStepHeader } from './ClaimStepHeader';

export function ClaimTotpBridgeScreen({
  onContinue,
  onBack,
  loading = false,
}: {
  onContinue: () => void;
  onBack?: () => void;
  loading?: boolean;
}) {
  return (
    <ScreenShell
      header={<ClaimStepHeader step="5" total="5" label="Security" onBack={onBack} />}
      footer={<PrimaryButton label="Set up security" onPress={onContinue} loading={loading} />}
    >
      <View style={styles.content}>
        <View style={styles.heroIcon}>
          <Text style={styles.heroIconText}>2FA</Text>
        </View>
        <Text style={styles.title}>Secure your account</Text>
        <Text style={styles.subhead}>
          Your profile is claimed and your account is created. One authenticator code is required before
          normal app access.
        </Text>
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
});
