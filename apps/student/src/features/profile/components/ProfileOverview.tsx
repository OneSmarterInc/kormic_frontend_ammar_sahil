import { StyleSheet, Text, View } from 'react-native';
import { SectionLabel } from '../../../components/SectionLabel';
import { AuthSession } from '../../../models/onboarding';
import { colors, fonts, type } from '../../../theme/tokens';
import { firstProvidedValue, formatDateTime, formatValue } from '../profileValues';
import { StudentProfile } from '../types';
import { ProfileAvatar } from './ProfileAvatar';
import { ChipGroup, FieldRow, InfoCard, ProjectCard } from './ProfileSections';

export type ProfileOverviewProps = {
  profile: StudentProfile;
  skills: string[];
  profileImageUrl: string;
  profileImageLoading: boolean;
  session?: AuthSession;
};

export function ProfileOverview({
  profile,
  skills,
  profileImageUrl,
  profileImageLoading,
  session,
}: Pick<ProfileOverviewProps, 'profile' | 'skills' | 'profileImageUrl' | 'profileImageLoading' | 'session'>) {
  return (
    <>
      <View style={styles.profileHero}>
        <View style={styles.header}>
          <ProfileAvatar
            name={profile.name || profile.email || ''}
            imageUrl={profileImageUrl}
            accessToken={session?.access}
            loading={profileImageLoading}
          />
          <View style={styles.headerText}>
            <Text style={styles.title}>{profile.name}</Text>
            <Text style={styles.subhead}>{profile.email}</Text>
          </View>
        </View>
      </View>

      <View style={styles.form}>
        <SectionLabel>Personal information</SectionLabel>
        <InfoCard>
          <FieldRow label="Institution" value={profile.institution} />
          <FieldRow label="Branch" value={profile.major} />
          {/* <FieldRow label="Program" value={profile.program} /> */}
          <FieldRow label="Country" value={profile.country} />
          <FieldRow label="Graduation year" value={formatValue(profile.graduation_year)} />
        </InfoCard>

        <SectionLabel>Academic profile</SectionLabel>
        <InfoCard>
          <FieldRow
            label="GPA"
            value={
              profile.gpa !== null && profile.gpa !== undefined
                ? `${profile.gpa}/${profile.gpa_scale || 10}`
                : profile.gpa_text
            }
          />
          <FieldRow label="GRE Quant" value={formatValue(profile.gre_quant)} />
          <FieldRow label="GRE Verbal" value={formatValue(profile.gre_verbal)} />
          <FieldRow label="TOEFL" value={formatValue(profile.toefl)} />
          <FieldRow label="IELTS" value={formatValue(profile.ielts)} />
          <FieldRow
            label="English score"
            value={formatValue(
              String(firstProvidedValue(profile.english_score, profile.english_score_text) ?? ''),
            )}
          />
          <FieldRow
            label="Budget"
            value={
              profile.budget !== null && profile.budget !== undefined
                ? `$${profile.budget}`
                : profile.budget_text
            }
          />
        </InfoCard>

        <SectionLabel>Skills</SectionLabel>
        <ChipGroup items={skills} />

        <SectionLabel>Target disciplines</SectionLabel>
        <ChipGroup items={profile.disciplines} />

        <SectionLabel>Projects</SectionLabel>
        {(profile.projects ?? []).map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}

        <SectionLabel>Experience and research</SectionLabel>
        <InfoCard>
          <FieldRow
            label="Work experience"
            value={
              profile.work_months !== null && profile.work_months !== undefined
                ? `${profile.work_months} months`
                : ''
            }
          />
          <FieldRow label="Experience summary" value={profile.work_experience_summary} />
          <FieldRow label="Research" value={profile.research} />
          <FieldRow label="Publications" value={profile.publications_count} />
          <FieldRow label="GitHub" value={profile.github} />
          <FieldRow label="LinkedIn" value={profile.linkedin_url} />
        </InfoCard>

        <SectionLabel>Notes</SectionLabel>
        <InfoCard>
          <Text style={styles.bodyText}>{profile.notes}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Created: {formatDateTime(profile.created_at)}</Text>
            <Text style={styles.metaText}>Updated: {formatDateTime(profile.updated_at)}</Text>
          </View>
        </InfoCard>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.title,
    fontSize: 28,
    lineHeight: 32,
  },
  subhead: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 6,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  profileHero: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  headerText: {
    flex: 1,
  },
  form: {
    gap: 10,
  },
  bodyText: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  metaRow: {
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    color: colors.textSoft,
    fontFamily: fonts.body,
    fontSize: 12,
  },
});
