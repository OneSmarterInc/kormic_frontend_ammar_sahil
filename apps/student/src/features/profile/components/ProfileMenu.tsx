import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../../theme/tokens';
import { ProfileSection } from '../types';

export function sectionTitle(section: ProfileSection, agentName: string) {
  switch (section) {
    case 'overview':
      return 'Complete profile';
    case 'edit':
      return 'Edit profile';
    case 'resumes':
      return 'Resume history';
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
    { key: 'overview', label: 'Profile Overview' },
    { key: 'edit', label: 'Edit Profile' },
    { key: 'resumes', label: 'Resume update/view' },
    { key: 'github', label: 'GitHub' },
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
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
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
});
