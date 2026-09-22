import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { TextField } from '../../../components/TextField';
import { colors, fonts } from '../../../theme/tokens';
import { InfoCard } from './ProfileSections';

export function SourceEditor({
  title,
  description,
  value,
  onChange,
  placeholder,
  primaryLabel,
  secondaryLabel,
  showUrlField = true,
  showPrimaryAction = true,
  disabled,
  error,
  onPrimary,
  onSecondary,
}: {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  primaryLabel: string;
  secondaryLabel: string;
  showUrlField?: boolean;
  showPrimaryAction?: boolean;
  disabled: boolean;
  error: string;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  return (
    <View style={styles.form}>
      <Text style={styles.sectionIntro}>{description}</Text>
      <InfoCard>
        <Text style={styles.cardTitle}>{title}</Text>
        {showUrlField ? (
          <TextField
            label={`${title} URL`}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            autoCapitalize="none"
            keyboardType="url"
          />
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {showPrimaryAction ? (
          <PrimaryButton label={primaryLabel} onPress={onPrimary} disabled={disabled} loading={disabled} />
        ) : null}
        <PrimaryButton
          label={secondaryLabel}
          onPress={onSecondary}
          variant="secondary"
          disabled={disabled}
          loading={disabled}
        />
      </InfoCard>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionIntro: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: colors.coral,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  form: {
    gap: 10,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 17,
    lineHeight: 23,
    marginBottom: 8,
  },
});
