import { Linking, StyleSheet, Text } from 'react-native';
import { colors, fonts } from '../../../theme/tokens';

export function FormattedMessageText({
  text,
  formatBold,
  isUniversityResponse,
  question,
  answer,
  sourceCards = false,
}: {
  text: string;
  formatBold: boolean;
  isUniversityResponse: boolean;
  question?: string;
  answer?: string;
  sourceCards?: boolean;
}) {
  const displayText = (value: string) => sourceCards
    ? value.replace(/\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)/g, '').replace(/^\s*-\s*$/gm, '').replace(/(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?Official sources used:?(?:\*\*)?\s*$/i, '').replace(/\n{3,}/g, '\n\n').trim()
    : value;
  if (isUniversityResponse && question) {
    const displayAnswer = (answer ?? text).trim();
    return (
      <Text style={styles.bubbleText}>
        <Text style={styles.boldText}>{question}</Text>
        {displayAnswer ? '\n\n' : ''}
        {renderSegments(displayText(displayAnswer), true)}
      </Text>
    );
  }

  return (
    <Text style={styles.bubbleText}>
      {renderSegments(displayText(text), formatBold)}
    </Text>
  );
}

export function getLinkSegments(text: string) {
  const segments: Array<{ text: string; url?: string }> = [];
  const links = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let cursor = 0;
  for (const match of text.matchAll(links)) {
    const start = match.index ?? 0;
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ text: match[1]!, url: match[2]! });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

function renderSegments(text: string, formatBold: boolean) {
  const readable = formatBold ? text.replace(/^#{1,6}\s+(.+)$/gm, '**$1**').replace(/^[-*]\s+/gm, '• ') : text;
  const bold = formatBold ? getBoldSegments(readable) : [{ text: readable, bold: false }];
  return bold.flatMap((part, i) => getLinkSegments(part.text).map((segment, j) => (
    <Text key={`${i}-${j}`} style={[part.bold && styles.boldText, segment.url ? styles.sourceLink : undefined]}
      accessibilityRole={segment.url ? 'link' : undefined}
      accessibilityLabel={segment.url ? `${segment.text}, source link` : undefined}
      onPress={segment.url ? () => { void Linking.openURL(segment.url!).catch(() => undefined); } : undefined}>
      {segment.text}
    </Text>
  )));
}

export function getBoldSegments(text: string) {
  const segments: Array<{ text: string; bold: boolean }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    const start = text.indexOf('**', cursor);
    if (start === -1) {
      segments.push({ text: text.slice(cursor), bold: false });
      break;
    }

    const end = text.indexOf('**', start + 2);
    if (end === -1) {
      segments.push({ text: text.slice(cursor), bold: false });
      break;
    }

    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), bold: false });
    }

    segments.push({ text: text.slice(start + 2, end), bold: true });
    cursor = end + 2;
  }

  return segments.length ? segments : [{ text, bold: false }];
}

const styles = StyleSheet.create({
  bubbleText: {
    color: colors.offWhite,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
  },
  boldText: {
    fontFamily: fonts.bodyMedium,
  },
  sourceLink: {
    color: '#245b49',
    textDecorationLine: 'underline',
  },
});
