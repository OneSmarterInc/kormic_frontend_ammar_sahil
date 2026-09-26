import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DropdownField } from '../../../components/DropdownField';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenShell } from '../../../components/ScreenShell';
import { SectionLabel } from '../../../components/SectionLabel';
import { TextField } from '../../../components/TextField';
import { colors, fonts, radii, type } from '../../../theme/tokens';
import { ClaimEditableField, ClaimReviewScreenProps } from '../types';
import { ClaimStepHeader } from './ClaimStepHeader';

export function getGraduationYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 50 }, (_, index) => {
    const year = currentYear + index;
    return { label: String(year), value: String(year) };
  });
}

export function ClaimReviewScreen({
  value,
  loading = false,
  error,
  onChange,
  onConfirm,
  onBack,
}: ClaimReviewScreenProps) {
  const graduationYearOptions = useMemo(() => getGraduationYearOptions(), []);

  const validationErrors = useMemo(() => {
    const errors: Partial<Record<ClaimEditableField, string>> = {};

    if (!value.full_name.trim()) {
      errors.full_name = 'Full name is required';
    } else if (value.full_name.trim().length < 2) {
      errors.full_name = 'Full name must be at least 2 characters';
    } else if (value.full_name.trim().length > 50) {
      errors.full_name = 'Full name must be less than 50 characters';
    }

    if (!value.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else {
      const normalizedPhone = value.phone.replace(/[\s().-]/g, '');
      if (!/^\+?[1-9]\d{7,14}$/.test(normalizedPhone)) {
        errors.phone = 'Use an international phone number, e.g. +91 98765 43210';
      }
    }

    if (!value.field_of_study.trim()) {
      errors.field_of_study = 'Field of study is required';
    } else if (value.field_of_study.trim().length < 2) {
      errors.field_of_study = 'Field of study must be at least 2 characters';
    }

    if (!value.degree_level.trim()) {
      errors.degree_level = 'Degree level is required';
    }

    if (!value.expected_graduation.trim()) {
      errors.expected_graduation = 'Graduation year is required';
    } else {
      const year = parseInt(value.expected_graduation.trim());
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < currentYear || year > currentYear + 10) {
        errors.expected_graduation = `Year must be between ${currentYear} and ${currentYear + 10}`;
      }
    }

    if (!value.year_in_college.trim()) {
      errors.year_in_college = 'Year in college is required';
    }

    if (!value.program_name.trim()) {
      errors.program_name = 'Program name is required';
    } else if (value.program_name.trim().length < 2) {
      errors.program_name = 'Program name must be at least 2 characters';
    }

    if (!value.city.trim()) {
      errors.city = 'City is required';
    } else if (value.city.trim().length < 2) {
      errors.city = 'City must be at least 2 characters';
    }

    if (!(value.region || value.state).trim()) {
      errors.region = 'State/region is required';
    } else if ((value.region || value.state).trim().length < 2) {
      errors.region = 'State/region must be at least 2 characters';
    }

    if (!value.country.trim()) {
      errors.country = 'Country is required';
    } else if (!/^[A-Za-z]{2}$/.test(value.country.trim())) {
      errors.country = 'Use a two-letter country code';
    }

    return errors;
  }, [value]);

  const hasErrors = useMemo(() => Object.keys(validationErrors).length > 0, [validationErrors]);

  const missingRequired = useMemo(
    () =>
      !value.full_name.trim() ||
      !value.field_of_study.trim() ||
      !value.degree_level.trim() ||
      !value.expected_graduation.trim() ||
      !value.phone.trim() ||
      !value.year_in_college.trim() ||
      !value.program_name.trim() ||
      !value.city.trim() ||
      !(value.region || value.state).trim() ||
      !value.country.trim(),
    [value],
  );

  const update = (field: ClaimEditableField) => (nextValue: string) => onChange(field, nextValue);

  const getError = (field: ClaimEditableField) => validationErrors[field];

  return (
    <ScreenShell
      header={<ClaimStepHeader step="3" total="5" label="Review details" onBack={onBack} />}
      footer={
        <View style={styles.footerStack}>
          {hasErrors && <Text style={styles.errorText}>Please fix all errors before continuing</Text>}
          <PrimaryButton
            label="Confirm profile"
            onPress={onConfirm}
            disabled={hasErrors || missingRequired || loading}
            loading={loading}
          />
        </View>
      }
    >
      <View style={styles.contentTop}>
        <Text style={styles.title}>Review your student details</Text>
        <Text style={styles.subhead}>
          These details came from your institute. Correct anything that is outdated before you continue.
        </Text>

        {value.institute_name ? (
          <View style={styles.badgeCard}>
            <Text style={styles.cardLabel}>Institute sourced</Text>
            <Text style={styles.cardText}>{value.institute_name}</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.form}>
          <SectionLabel>Identity</SectionLabel>
          <TextField
            label="Full name"
            value={value.full_name}
            onChangeText={update('full_name')}
            required
            error={getError('full_name')}
          />
          <TextField label="Email" value={value.email} editable={false} required />
          <TextField
            label="Phone"
            value={value.phone}
            onChangeText={update('phone')}
            keyboardType="phone-pad"
            maxLength={20}
            required
            error={getError('phone')}
          />

          <SectionLabel>Studies</SectionLabel>
          <TextField label="College/university" value={value.institute_name ?? ''} editable={false} />
          <TextField
            label="Field or branch of study"
            value={value.field_of_study}
            onChangeText={update('field_of_study')}
            required
            error={getError('field_of_study')}
          />
          <TextField
            label="Degree level"
            value={value.degree_level}
            onChangeText={update('degree_level')}
            required
            error={getError('degree_level')}
          />
          <TextField
            label="Program name"
            value={value.program_name}
            onChangeText={update('program_name')}
            required
            error={getError('program_name')}
          />
          <DropdownField
            label="Expected graduation year"
            required
            data={graduationYearOptions}
            value={value.expected_graduation}
            onChange={(selectedValue) => onChange('expected_graduation', selectedValue)}
            error={getError('expected_graduation')}
          />
          <TextField
            label="Year in college"
            value={value.year_in_college}
            onChangeText={update('year_in_college')}
            required
            error={getError('year_in_college')}
          />

          <SectionLabel>Location</SectionLabel>
          <TextField
            label="City"
            value={value.city}
            onChangeText={update('city')}
            required
            error={getError('city')}
          />
          <TextField
            label="State/region"
            value={value.region || value.state}
            onChangeText={update('region')}
            required
            error={getError('region')}
          />
          <TextField
            label="Country code"
            value={value.country}
            onChangeText={(nextValue) => onChange('country', nextValue.toUpperCase().slice(0, 2))}
            autoCapitalize="characters"
            maxLength={2}
            required
            error={getError('country')}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  contentTop: {
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
  badgeCard: {
    backgroundColor: colors.surface,
    borderColor: 'rgba(56,90,70,0.35)',
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
