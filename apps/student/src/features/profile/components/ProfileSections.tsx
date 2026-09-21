import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { colors, fonts } from '../../../theme/tokens';
import { formatValue } from '../profileValues';
import { Project } from '../types';

export function ProfileError({
  message,
  onRetry,
  loading = false,
}: {
  message: string;
  onRetry?: () => void;
  loading?: boolean;
}) {
  return (
    <View style={styles.errorCard}>
      <Text style={styles.errorTitle}>Profile could not be loaded</Text>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <PrimaryButton label="Try again" onPress={onRetry} variant="secondary" loading={loading} />
      ) : null}
    </View>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <InfoCard>
      <Text style={styles.cardTitle}>{project.title}</Text>
      <Text style={styles.bodyText}>{project.description}</Text>
      <ChipGroup items={project.technologies} compact />
    </InfoCard>
  );
}

export function InfoCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function FieldRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{formatValue(value)}</Text>
    </View>
  );
}

export function MiniList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <View style={styles.miniList}>
      <Text style={styles.miniListTitle}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={styles.listItem}>
          {'\u2022'} {item}
        </Text>
      ))}
    </View>
  );
}

export function ChipGroup({
  items = [],
  tone = 'default',
  compact = false,
}: {
  items?: string[];
  tone?: 'default' | 'warning';
  compact?: boolean;
}) {
  if (!items.length) {
    return <Text style={styles.emptyText}>Not provided</Text>;
  }

  return (
    <View style={[styles.chipWrap, compact && styles.compactChipWrap]}>
      {items.map((item) => (
        <View key={item} style={[styles.chip, tone === 'warning' && styles.warningChip]}>
          <Text style={[styles.chipText, tone === 'warning' && styles.warningChipText]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    backgroundColor: 'rgba(255,176,157,0.10)',
    borderColor: 'rgba(255,176,157,0.35)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
    padding: 14,
  },
  errorTitle: {
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  errorText: {
    color: colors.coral,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderColor: 'rgba(255,255,255,0.11)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 15,
  },
  fieldRow: {
    gap: 5,
  },
  fieldLabel: {
    color: '#A6A7C2',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  fieldValue: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 17,
    lineHeight: 23,
    marginBottom: 8,
  },
  bodyText: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  miniList: {
    gap: 4,
  },
  miniListTitle: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 13,
  },
  listItem: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactChipWrap: {
    marginTop: 2,
  },
  chip: {
    backgroundColor: '#21498b',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipText: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  warningChip: {
    backgroundColor: '#FFF7E6',
    borderColor: '#F3C877',
  },
  warningChipText: {
    color: '#8A5A00',
  },
  emptyText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 14,
  },
});
