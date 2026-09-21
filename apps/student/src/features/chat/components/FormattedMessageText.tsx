import { StyleSheet, Text } from 'react-native';
import { colors, fonts } from '../../../theme/tokens';

export function FormattedMessageText({
  text,
  formatBold,
  isUniversityResponse,
  question,
  answer,
}: {
  text: string;
  formatBold: boolean;
  isUniversityResponse: boolean;
  question?: string;
  answer?: string;
}) {
  if (isUniversityResponse && question) {
    const displayAnswer = (answer ?? text).trim();
    return (
      <Text style={styles.bubbleText}>
        <Text style={styles.boldText}>{question}</Text>
        {displayAnswer ? `\n\n${displayAnswer}` : ''}
      </Text>
    );
  }

  const segments = formatBold ? getBoldSegments(text) : [{ text, bold: false }];

  return (
    <Text style={styles.bubbleText}>
      {segments.map((segment, index) => (
        <Text key={`${segment.text}-${index}`} style={segment.bold ? styles.boldText : undefined}>
          {segment.text}
        </Text>
      ))}
    </Text>
  );
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
});
