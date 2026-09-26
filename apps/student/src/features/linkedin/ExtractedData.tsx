import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme/tokens';
import {
  EXTRACTED_DATA_SECTIONS,
  formatExtractedValue,
  hasExtractedValue,
  humanizeKey,
  shouldUseFullWidthSummaryItem,
} from './linkedinData';

export function ExtractedData({ data }: { data?: Record<string, unknown> }) {
  if (!data || Object.keys(data).length === 0) {
    return <Text style={styles.emptyText}>No extracted data available.</Text>;
  }

  const usedKeys = new Set<string>();
  const sections = EXTRACTED_DATA_SECTIONS.map((section) => {
    const entries = section.keys
      .filter((key) => hasExtractedValue(data[key]))
      .map((key) => {
        usedKeys.add(key);
        return [key, data[key]] as [string, unknown];
      });

    return { ...section, entries };
  }).filter((section) => section.entries.length > 0);

  const remainingEntries = Object.entries(data).filter(
    ([key, value]) => !usedKeys.has(key) && hasExtractedValue(value),
  );

  return (
    <View style={styles.extractedList}>
      {sections.map((section) => (
        <ExtractedGroup
          key={section.title}
          title={section.title}
          entries={section.entries}
          featured={section.featured}
        />
      ))}

      {remainingEntries.length > 0 ? (
        <ExtractedGroup title="Additional details" entries={remainingEntries} />
      ) : null}
    </View>
  );
}

export function ExtractedGroup({
  title,
  entries,
  featured = false,
}: {
  title: string;
  entries: [string, unknown][];
  featured?: boolean;
}) {
  return (
    <View style={[styles.extractedGroup, featured && styles.extractedGroupFeatured]}>
      <Text style={styles.extractedGroupTitle}>{title}</Text>
      <View style={featured ? styles.extractedSummary : styles.extractedGroupBody}>
        {entries.map(([key, value]) =>
          featured ? (
            <View
              key={key}
              style={[
                styles.extractedSummaryItem,
                shouldUseFullWidthSummaryItem(key, value) && styles.extractedSummaryItemWide,
              ]}
            >
              <Text style={styles.extractedLabel}>{humanizeKey(key)}</Text>
              <Text style={styles.extractedValue}>{formatExtractedValue(value)}</Text>
            </View>
          ) : (
            <ExtractedField key={key} label={humanizeKey(key)} value={value} />
          ),
        )}
      </View>
    </View>
  );
}

export function ExtractedField({ label, value }: { label: string; value: unknown }) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return null;
    }

    if (value.every((item) => typeof item === 'string' || typeof item === 'number')) {
      return (
        <View style={styles.extractedSection}>
          <Text style={styles.extractedSectionTitle}>{label}</Text>
          <View style={styles.extractedChipWrap}>
            {value.map((item, index) => (
              <View key={`${String(item)}-${index}`} style={styles.extractedChip}>
                <Text style={styles.extractedChipText}>{String(item)}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.extractedSection}>
        <Text style={styles.extractedSectionTitle}>{label}</Text>
        {value.map((item, index) => (
          <View key={`${label}-${index}`} style={styles.extractedMiniCard}>
            {typeof item === 'object' && item !== null ? (
              <ObjectExtractedRows value={item as Record<string, unknown>} />
            ) : (
              <Text style={styles.extractedMiniText}>{formatExtractedValue(item)}</Text>
            )}
          </View>
        ))}
      </View>
    );
  }

  if (typeof value === 'object' && value !== null) {
    return (
      <View style={styles.extractedSection}>
        <Text style={styles.extractedSectionTitle}>{label}</Text>
        <View style={styles.extractedMiniCard}>
          <ObjectExtractedRows value={value as Record<string, unknown>} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.extractedSection}>
      <Text style={styles.extractedSectionTitle}>{label}</Text>
      <Text style={styles.extractedParagraph}>{formatExtractedValue(value)}</Text>
    </View>
  );
}

export function ObjectExtractedRows({ value }: { value: Record<string, unknown> }) {
  return (
    <>
      {Object.entries(value)
        .filter(([, nestedValue]) => hasExtractedValue(nestedValue))
        .map(([nestedKey, nestedValue]) => (
          <View key={nestedKey} style={styles.extractedNestedRow}>
            <Text style={styles.extractedLabel}>{humanizeKey(nestedKey)}</Text>
            <Text style={styles.extractedMiniText}>{formatExtractedValue(nestedValue)}</Text>
          </View>
        ))}
    </>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  extractedList: {
    gap: 12,
  },
  extractedGroup: {
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  extractedGroupFeatured: {
    backgroundColor: 'rgba(56,90,70,0.08)',
    borderColor: 'rgba(56,90,70,0.18)',
  },
  extractedGroupTitle: {
    color: colors.offWhite,
    fontFamily: fonts.heading,
    fontSize: 16,
    lineHeight: 20,
  },
  extractedGroupBody: {
    gap: 12,
  },
  extractedSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  extractedSummaryItem: {
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    maxWidth: '100%',
    padding: 10,
    width: '47%',
  },
  extractedSummaryItemWide: {
    width: '100%',
  },
  extractedLabel: {
    color: '#697267',
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  extractedValue: {
    color: colors.offWhite,
    flexShrink: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    width: '100%',
  },
  extractedSection: {
    gap: 9,
  },
  extractedSectionTitle: {
    color: '#536149',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  extractedParagraph: {
    color: colors.offWhite,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  extractedChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  extractedChip: {
    backgroundColor: 'rgba(56,90,70,0.18)',
    borderColor: 'rgba(56,90,70,0.34)',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  extractedChipText: {
    color: '#385a46',
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  extractedMiniCard: {
    backgroundColor: '#eef2e9',
    borderColor: '#e7e9e2',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 11,
  },
  extractedMiniText: {
    color: colors.offWhite,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
  },
  extractedNestedRow: {
    borderBottomColor: '#ffffff',
    borderBottomWidth: 1,
    gap: 5,
    paddingBottom: 9,
  },
});
