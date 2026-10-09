import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../../theme/tokens';
import { ProfileSection } from '../types';

export function sectionTitle(section: ProfileSection, agentName: string) {
  switch (section) {
    case 'queries':
      return 'Queries';
    case 'overview':
      return 'Complete profile';
    case 'edit':
      return 'Edit profile';
    case 'resumes':
      return 'Resume';
    case 'github':
      return 'GitHub';
    case 'githubProfile':
      return 'GitHub Profile';
    case 'linkedin':
      return 'LinkedIn';
    case 'aria':
      return `Chat with ${agentName}`;
  }
}

export function ProfileMenu({
  active,
  agentName,
  onSelect,
  onLogout,
}: {
  active: ProfileSection;
  agentName: string;
  onSelect: (section: ProfileSection) => void;
  onLogout?: () => void;
}) {
  const items: Array<{ key: ProfileSection; label: string }> = [
    { key: 'aria', label: `Chat with ${agentName}` },
    { key: 'queries', label: 'Queries' },
    { key: 'overview', label: 'Profile Overview' },
    { key: 'edit', label: 'Edit Profile' },
    { key: 'resumes', label: 'Resume' },
    { key: 'githubProfile', label: 'GitHub Profile' },
    { key: 'linkedin', label: 'LinkedIn images' },
  ];

  return (
    <View style={styles.sidebar}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          accessibilityState={{ selected: active === item.key }}
          onPress={() => onSelect(item.key)}
          style={[styles.sidebarItem, active === item.key && styles.sidebarItemActive]}
        >
          <Text style={[styles.sidebarItemText, active === item.key && styles.sidebarItemTextActive]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
      {onLogout ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          onPress={onLogout}
          style={styles.sidebarItem}
        >
          <Text style={[styles.sidebarItemText, styles.sidebarLogoutText]}>Logout</Text>
        </Pressable>
      ) : null}
      <View style={styles.developerFooter}>
        <Text style={styles.developerCredit}>
          Developed by <Text style={styles.developerName}>One Smarter Inc</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    flexGrow: 1,
    backgroundColor: colors.panelInk,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
    padding: 10,
  },
  sidebarItem: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sidebarItemActive: {
    backgroundColor: 'rgba(56,90,70,0.16)',
  },
  sidebarItemText: {
    color: colors.textSoft,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
  sidebarItemTextActive: {
    color: colors.coral,
  },
  sidebarLogoutText: {
    color: colors.error,
  },
  developerFooter: {
    marginTop: 'auto',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
  },
  developerCredit: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  developerName: {
    color: colors.textSoft,
    fontFamily: fonts.bodyMedium,
  },
});
