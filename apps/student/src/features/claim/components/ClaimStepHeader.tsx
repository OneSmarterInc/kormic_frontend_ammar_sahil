import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../../theme/tokens';

export function ClaimStepHeader({
  step,
  total,
  label,
  onBack,
}: {
  step: string;
  total: string;
  label: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.stepHeader}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>{'<'}</Text>
        </Pressable>
      ) : (
        <View style={styles.backButtonPlaceholder} />
      )}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(Number(step) / Number(total)) * 100}%` }]} />
      </View>
      <Text style={styles.stepText}>
        {step} / {total}
      </Text>
      <Text style={styles.stepLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stepHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  backButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backButtonPlaceholder: {
    height: 44,
    width: 44,
  },
  backText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 20,
  },
  progressTrack: {
    backgroundColor: colors.panelInk,
    borderRadius: 999,
    flex: 1,
    height: 5,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.coral,
    height: '100%',
  },
  stepText: {
    color: colors.muted,
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  stepLabel: {
    display: 'none',
  },
});
