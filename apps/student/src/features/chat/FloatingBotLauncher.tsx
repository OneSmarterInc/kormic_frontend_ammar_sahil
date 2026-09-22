import { Image, Pressable, StyleSheet } from 'react-native';
import { colors } from '../../theme/tokens';

// Metro requires a static asset path.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const botIcon = require('../../assets/bot.jpeg');

export function FloatingBotLauncher({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open agent chat"
      onPress={onPress}
      style={styles.botLauncher}
    >
      <Image source={botIcon} style={styles.botLauncherImage} resizeMode="cover" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botLauncherImage: {
    height: 54,
    width: 54,
    borderRadius: 27,
  },
  botLauncher: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 28,
    borderWidth: 1,
    bottom: 54,
    elevation: 8,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.26,
    shadowRadius: 14,
    width: 56,
  },
});
