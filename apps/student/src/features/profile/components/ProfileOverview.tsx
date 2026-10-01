import { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { AuthSession } from '../../../models/onboarding';
import { colors, fonts } from '../../../theme/tokens';
import { formatDateTime } from '../profileValues';
import { StudentProfile } from '../types';
import { ProfileAvatar } from './ProfileAvatar';
import { GithubProfilePanel } from '../../github/GithubProfilePanel';

export type ProfileOverviewProps = {
  profile: StudentProfile;
  skills: string[];
  profileImageUrl: string;
  profileImageLoading: boolean;
  session?: AuthSession;
  onGithubConnect?: () => void;
  onEdit?: () => void;
};

function CvSection({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}>
    <View style={styles.sectionHeading}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      <View style={styles.rule} />
    </View>
    {children}
  </View>;
}
function Tags({ items }: { items: string[] }) {
  return <View style={styles.tags}>{Array.from(new Set(items.filter(Boolean))).map(item =>
    <View key={item} style={styles.tag}><Text style={styles.tagText}>{item}</Text></View>)}</View>;
}
function Empty({ children }: { children: string }) {
  return <Text style={styles.empty}>{children}</Text>;
}

export function ProfileOverview({ profile, skills, profileImageUrl, profileImageLoading, session, onGithubConnect, onEdit }: ProfileOverviewProps) {
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 380 || fontScale > 1.25;
  const scores = [
    ['GPA', profile.gpa != null ? `${profile.gpa}${profile.gpa_scale ? ` / ${profile.gpa_scale}` : ''}` : profile.gpa_text],
    ['GRE Quant', profile.gre_quant], ['GRE Verbal', profile.gre_verbal],
    ['TOEFL', profile.toefl], ['IELTS', profile.ielts],
    ['English score', profile.english_score || profile.english_score_text],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');
  const hasExperience = Boolean(profile.work_experience_summary || profile.work_months);
  const hasResearch = Boolean(profile.research || profile.research_interests?.length || profile.publications_count);
  return <View style={styles.container}>
    <View style={styles.toolbar}>
      <View style={styles.toolbarLabel}><MaterialIcons name="description" size={18} color={colors.coral} />
        <Text style={styles.eyebrow}>MY PROFILE</Text></View>
      {onEdit ? <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={onEdit}
        style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
        <MaterialIcons name="edit" size={16} color={colors.coral} /><Text style={styles.editText}>Edit profile</Text>
      </Pressable> : null}
    </View>
    <View style={styles.paper}>
      <View style={styles.accent} />
      <View style={[styles.identity, compact && styles.identityCompact]}>
        <ProfileAvatar name={profile.name || profile.email || ''} imageUrl={profileImageUrl}
          accessToken={session?.access} loading={profileImageLoading} />
        <View style={styles.identityText}>
          <Text accessibilityRole="header" style={styles.name}>{profile.name || 'Your profile'}</Text>
          {profile.major ? <Text style={styles.headline}>{profile.major}</Text> : null}
          {profile.email ? <Text selectable style={styles.contact}>{profile.email}</Text> : null}
          {profile.country ? <Text style={styles.contact}>{profile.country}</Text> : null}
        </View>
      </View>
      <View style={styles.body}>
        <CvSection title="Education">
          {profile.institution || profile.major ? <View style={styles.entry}>
            <Text style={styles.entryTitle}>{profile.institution || 'Institution not added yet'}</Text>
            {profile.major ? <Text style={styles.bodyText}>{profile.major}</Text> : null}
            {profile.graduation_year ? <Text style={styles.detail}>Graduation · {profile.graduation_year}</Text> : null}
          </View> : <Empty>Add your institution and field of study to complete this section.</Empty>}
          {scores.length ? <View style={styles.scores}>{scores.map(([label, value]) =>
            <View key={String(label)} style={styles.score}>
              <Text style={styles.scoreLabel}>{label}</Text><Text style={styles.scoreValue}>{value}</Text>
            </View>)}</View> : null}
        </CvSection>
        <CvSection title="Skills">
          {skills.length ? <Tags items={skills} /> : <Empty>Your skills will appear here once added to your profile.</Empty>}
        </CvSection>
        <CvSection title="Projects">
          {profile.projects?.length ? profile.projects.map((project, index) => <View key={`${project.title}-${index}`} style={styles.entry}>
            <View style={styles.projectHeading}><Text style={styles.projectNumber}>{String(index + 1).padStart(2, '0')}</Text>
              <Text style={[styles.entryTitle, styles.flex]}>{project.title}</Text></View>
            {project.description ? <Text style={styles.bodyText}>{project.description}</Text> : null}
            {project.technologies?.length ? <Text style={styles.technology}>{project.technologies.join(' · ')}</Text> : null}
          </View>) : <Empty>Add projects to showcase what you have built.</Empty>}
        </CvSection>
        <CvSection title="Experience">
          {hasExperience ? <View style={styles.entry}>
            {profile.work_months ? <Text style={styles.detail}>{profile.work_months} months of experience</Text> : null}
            {profile.work_experience_summary ? <Text style={styles.bodyText}>{profile.work_experience_summary}</Text> : null}
          </View> : <Empty>Add internships or work experience to tell your story.</Empty>}
        </CvSection>
        {hasResearch ? <CvSection title="Research">
          {profile.research ? <Text style={styles.bodyText}>{profile.research}</Text> : null}
          {profile.publications_count > 0 ? <Text style={styles.detail}>{profile.publications_count} {profile.publications_count === 1 ? 'publication' : 'publications'}</Text> : null}
          {profile.research_interests?.length ? <Tags items={profile.research_interests} /> : null}
        </CvSection> : null}
        {profile.program || profile.disciplines?.length || profile.career_goals?.length || profile.budget != null || profile.budget_text ?
          <CvSection title="Study & career goals">
            {profile.program ? <Text style={styles.entryTitle}>{profile.program}</Text> : null}
            {profile.disciplines?.length ? <Tags items={profile.disciplines} /> : null}
            {profile.career_goals?.map((goal, index) => <Text key={index} style={styles.bodyText}>• {goal}</Text>)}
            {profile.budget != null || profile.budget_text ? <Text style={styles.detail}>Study budget · {profile.budget != null ? `$${profile.budget}` : profile.budget_text}</Text> : null}
          </CvSection> : null}
        {profile.github || profile.linkedin_url ? <CvSection title="Online profiles">
          {profile.github ? <View style={styles.linkRow}><Text style={styles.linkLabel}>GitHub</Text><Text selectable style={styles.linkValue}>{profile.github}</Text></View> : null}
          {profile.linkedin_url ? <View style={styles.linkRow}><Text style={styles.linkLabel}>LinkedIn</Text><Text selectable style={styles.linkValue}>{profile.linkedin_url}</Text></View> : null}
        </CvSection> : null}
        {profile.notes ? <CvSection title="Additional information"><Text style={styles.bodyText}>{profile.notes}</Text></CvSection> : null}
      </View>
      {profile.updated_at ? <View style={styles.footer}><MaterialIcons name="update" size={15} color={colors.muted} />
        <Text style={styles.footerText}>Updated {formatDateTime(profile.updated_at)}</Text></View> : null}
    </View>
    {session && onGithubConnect ? <View style={styles.connected}><GithubProfilePanel compact session={session} onConnect={onGithubConnect} /></View> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: 14, paddingBottom: 24 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  toolbarLabel: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  eyebrow: { fontFamily: fonts.bodyMedium, color: colors.muted, fontSize: 11, letterSpacing: 1.6 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#eaf0e9' },
  editText: { color: colors.coral, fontFamily: fonts.bodyMedium, fontSize: 13 },
  pressed: { opacity: 0.65 },
  paper: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e5de', borderRadius: 18, overflow: 'hidden' },
  accent: { height: 5, backgroundColor: colors.coral },
  identity: { padding: 22, gap: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f7f2', borderBottomWidth: 1, borderBottomColor: '#e4e9df' },
  identityCompact: { flexDirection: 'column', alignItems: 'flex-start' },
  identityText: { flex: 1, minWidth: 0, gap: 5, alignSelf: 'stretch', justifyContent: 'center' },
  name: { color: '#23382c', fontFamily: fonts.heading, fontSize: 27, lineHeight: 35 },
  headline: { color: colors.coral, fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 21 },
  contact: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 19, flexShrink: 1 },
  body: { paddingHorizontal: 20, paddingVertical: 6 },
  section: { paddingVertical: 18, gap: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionTitle: { fontFamily: fonts.heading, color: '#23382c', fontSize: 16, lineHeight: 23, flexShrink: 1 },
  rule: { height: 1, backgroundColor: '#e5e9e1', flex: 1 },
  entry: { gap: 6, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#dbe4d7', marginBottom: 4 },
  entryTitle: { fontFamily: fonts.bodyMedium, color: colors.text, fontSize: 15, lineHeight: 23 },
  bodyText: { fontFamily: fonts.body, color: '#48544c', fontSize: 14, lineHeight: 23 },
  detail: { fontFamily: fonts.body, color: colors.muted, fontSize: 12, lineHeight: 20 },
  scores: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  score: { backgroundColor: '#f5f7f2', borderRadius: 10, padding: 12, minWidth: 105, flexGrow: 1, gap: 4 },
  scoreLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 17 },
  scoreValue: { color: '#23382c', fontFamily: fonts.bodyMedium, fontSize: 16, lineHeight: 24 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: { backgroundColor: '#f1f4ee', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '100%' },
  tagText: { color: '#38523f', fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
  projectHeading: { flexDirection: 'row', gap: 8, alignItems: 'baseline' },
  projectNumber: { color: '#7b8b78', fontFamily: fonts.bodyMedium, fontSize: 11 },
  flex: { flex: 1 },
  technology: { color: colors.coral, fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 19 },
  empty: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 21 },
  linkRow: { gap: 3 },
  linkLabel: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 11 },
  linkValue: { color: colors.coral, fontFamily: fonts.body, fontSize: 13, lineHeight: 21, flexShrink: 1 },
  footer: { paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#edf0e9', flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, flexShrink: 1 },
  connected: { marginTop: 6 },
});
