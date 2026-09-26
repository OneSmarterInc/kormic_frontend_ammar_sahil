import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { TextField } from '../../../components/TextField';
import { colors, fonts } from '../../../theme/tokens';
import { ProfileDraft } from '../profileDraft';
import { ProfileAvatar } from './ProfileAvatar';

export function EditProfileForm({
  draft,
  imageUrl,
  imageLoading,
  loading,
  replaceImageLoading,
  deleteImageLoading,
  error,
  onChange,
  onReplaceImage,
  onRemoveImage,
  onSave,
  fieldErrors,
}: {
  draft: ProfileDraft;
  imageUrl: string;
  imageLoading: boolean;
  replaceImageLoading: boolean;
  deleteImageLoading: boolean;
  loading: boolean;
  error: string;
  fieldErrors: Record<string, string>;
  onChange: (field: keyof typeof draft, value: string) => void;
  onReplaceImage: () => void;
  onRemoveImage: () => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.form}>
      <View style={styles.resumeIntroCard}>
        <Text style={styles.resumeIntroTitle}>Edit basic details</Text>
        <Text style={styles.sectionIntro}>
          Update the student information shown on your complete profile.
        </Text>
      </View>
      <View style={styles.editBlock}>
        <View style={styles.editBlockHeader}>
          <Text style={styles.editBlockTitle}>Profile image</Text>
          <Text style={styles.editBlockCaption}>
            Upload, replace, or remove the avatar shown on your complete profile
          </Text>
        </View>
        <View style={styles.profileImageEditor}>
          <ProfileAvatar
            name={draft.name || draft.email || ''}
            imageUrl={imageUrl}
            loading={imageLoading}
            large
          />
          <View style={styles.profileImageActions}>
            <PrimaryButton
              label={imageUrl ? 'Replace image' : 'Upload image'}
              onPress={onReplaceImage}
              loading={replaceImageLoading}
            />
            {imageUrl ? (
              <PrimaryButton
                label="Delete image"
                onPress={onRemoveImage}
                variant="secondary"
                loading={deleteImageLoading}
              />
            ) : null}
          </View>
        </View>
      </View>
      <View style={styles.editBlock}>
        <View style={styles.editBlockHeader}>
          <Text style={styles.editBlockTitle}>Basic details</Text>
          <Text style={styles.editBlockCaption}>Personal and program information</Text>
        </View>
        <TextField
          label="Full name"
          required
          value={draft.name}
          error={fieldErrors.name}
          onChangeText={(value) => onChange('name', value)}
        />
        <TextField
          label="Email"
          required
          value={draft.email}
          error={fieldErrors.email}
          onChangeText={(value) => onChange('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label="Country"
          required
          value={draft.country}
          error={fieldErrors.country}
          onChangeText={(value) => onChange('country', value)}
        />
        <TextField
          label="Institution"
          required
          value={draft.institution}
          error={fieldErrors.institution}
          onChangeText={(value) => onChange('institution', value)}
        />
        <TextField
          label="Branch"
          required
          value={draft.major}
          error={fieldErrors.major}
          onChangeText={(value) => onChange('major', value)}
        />
        {/* <TextField
          label="Program"
          value={draft.program}
          onChangeText={(value) => onChange('program', value)}
        /> */}
        <TextField
          label="Graduation year"
          required
          value={draft.graduation_year}
          error={fieldErrors.graduation_year}
          onChangeText={(value) => onChange('graduation_year', value)}
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.editBlock}>
        <View style={styles.editBlockHeader}>
          <Text style={styles.editBlockTitle}>Academic details</Text>
          <Text style={styles.editBlockCaption}>Scores, GPA, tests, and budget</Text>
        </View>
        <TextField
          label="GPA"
          value={draft.gpa}
          onChangeText={(value) => onChange('gpa', value)}
          keyboardType="decimal-pad"
        />
        <TextField
          label="GPA scale"
          value={draft.gpa_scale}
          onChangeText={(value) => onChange('gpa_scale', value)}
          keyboardType="decimal-pad"
        />
        <TextField
          label="GRE Quant"
          value={draft.gre_quant}
          onChangeText={(value) => onChange('gre_quant', value)}
          keyboardType="number-pad"
        />
        <TextField
          label="GRE Verbal"
          value={draft.gre_verbal}
          onChangeText={(value) => onChange('gre_verbal', value)}
          keyboardType="number-pad"
        />
        <TextField
          label="TOEFL"
          value={draft.toefl}
          onChangeText={(value) => onChange('toefl', value)}
          keyboardType="number-pad"
        />
        <TextField
          label="IELTS"
          value={draft.ielts}
          onChangeText={(value) => onChange('ielts', value)}
          keyboardType="decimal-pad"
        />
        <TextField
          label="English score"
          value={draft.english_score_text}
          onChangeText={(value) => onChange('english_score_text', value)}
        />
        <TextField
          label="Budget"
          value={draft.budget}
          onChangeText={(value) => onChange('budget', value)}
          keyboardType="number-pad"
        />
      </View>

      <View style={styles.editFooter}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton label="Save profile" onPress={onSave} loading={loading} disabled={loading} />
      </View>
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
  resumeIntroCard: {
    backgroundColor: 'rgba(56,90,70,0.10)',
    borderColor: 'rgba(56,90,70,0.22)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  resumeIntroTitle: {
    color: colors.offWhite,
    fontFamily: fonts.heading,
    fontSize: 22,
    lineHeight: 27,
  },
  editBlock: {
    backgroundColor: '#ffffff',
    borderColor: '#e7e9e2',
    borderRadius: 8,
    borderWidth: 1,
    gap: 13,
    padding: 15,
  },
  editBlockHeader: {
    backgroundColor: 'rgba(56,90,70,0.10)',
    borderColor: 'rgba(56,90,70,0.18)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginBottom: 2,
    padding: 12,
  },
  editBlockTitle: {
    color: colors.offWhite,
    fontFamily: fonts.heading,
    fontSize: 18,
    lineHeight: 23,
  },
  editBlockCaption: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
  editFooter: {
    gap: 24,
    paddingTop: 174,
    bottom: 24,
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
  profileImageEditor: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  profileImageActions: {
    flex: 1,
    gap: 10,
  },
});
