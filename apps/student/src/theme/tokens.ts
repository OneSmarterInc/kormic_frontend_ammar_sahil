import { TextStyle } from 'react-native';

export const colors = {
  // Legacy token names remain so the existing screens keep their structure.
  ink: '#faf9f6',
  panelInk: '#f0f1eb',
  surface: '#ffffff',
  offWhite: '#242c29',
  text: '#242c29',
  coral: '#385a46',
  connectionBlue: '#385a46',
  muted: '#697267',
  line: '#e7e9e2',
  border: '#dce2d3',
  textSoft: '#536149',
  error: '#a23b32',
  accentSoft: '#eef2e9',
  onAccent: '#ffffff',
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  input: 12,
  card: 20,
  pill: 999,
};

export const fonts = {
  heading: 'Inter_600SemiBold',
  headingItalic: 'Fraunces_600SemiBold_Italic',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_600SemiBold',
};

export const type = {
  title: {
    fontFamily: fonts.heading,
    fontSize: 30,
    lineHeight: 34,
    color: colors.offWhite,
  } satisfies TextStyle,
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSoft,
  } satisfies TextStyle,
};
