import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthSession } from '../../models/onboarding';
import { colors, fonts } from '../../theme/tokens';
import { AriaBotScreen } from './AriaBotScreen';

export function BotScreen({
  session,
  onBack,
  refreshKey,
}: {
  session?: AuthSession;
  onBack: () => void;
  refreshKey: number;
}) {
  return (
    <View style={styles.botScreen}>
      <View style={styles.botTopBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={styles.botBackButton}
        >
          <Text style={styles.botBackText}>{'<'}</Text>
        </Pressable>
        <Text style={styles.botTitle}>Agent chat</Text>
      </View>

      <View style={styles.botContent}>
        <AriaBotScreen session={session} refreshKey={refreshKey} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  botScreen: {
    flex: 1,
    backgroundColor: colors.ink,
    paddingBottom: 14,
    marginTop: 28,
  },
  botTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 10,
    paddingTop: 12,
  },
  botBackButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  botBackText: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 20,
  },
  botTitle: {
    color: colors.offWhite,
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
  },
  botContent: {
    flex: 1,
  },
});
