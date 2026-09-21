import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fonts, radii } from '../theme/tokens';

interface DateOfBirthFieldProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

const MIN_DATE = new Date(1950, 0, 1);
const DEFAULT_DATE = new Date(2000, 0, 1);

export function DateOfBirthField({ value, error, onChange }: DateOfBirthFieldProps) {
  const pickerValue = value ? parseStored(value) : DEFAULT_DATE;

  const openPicker = () => {
    if (Platform.OS === 'android') {
      // Imperative API — creates ONE fresh dialog each tap.
      DateTimePickerAndroid.open({
        value: pickerValue,
        mode: 'date',
        display: 'default',
        minimumDate: MIN_DATE,
        maximumDate: new Date(),
        onChange: (event, date) => {
          if (event.type === 'set' && date) {
            onChange(formatDate(date));
          }
        },
      });
      return;
    }

    setShowIOSPicker(true);
  };

  // iOS state
  const [showIOSPicker, setShowIOSPicker] = React.useState(false);

  const handleIOSChange = (_event: DateTimePickerEvent, date?: Date) => {
    setShowIOSPicker(false);
    if (date) onChange(formatDate(date));
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        Date of birth <Text style={styles.star}>*</Text>
      </Text>

      <Pressable onPress={openPicker} style={[styles.button, error ? styles.errorBorder : undefined]}>
        <Text style={value ? styles.valueText : styles.placeholderText}>
          {value ? value : 'Select date of birth'}
        </Text>
        <MaterialIcons name="calendar-today" size={18} color={colors.offWhite} />
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {Platform.OS === 'ios' && showIOSPicker && (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="spinner"
          maximumDate={new Date()}
          minimumDate={MIN_DATE}
          onChange={handleIOSChange}
        />
      )}

      {Platform.OS === 'web' && (
        <input
          type="date"
          value={value ? toInputDate(value) : ''}
          min="1950-01-01"
          max={toInputDate(formatDate(new Date()))}
          onChange={(e) => {
            if (e.target.value) onChange(fromInputDate(e.target.value));
          }}
          style={webInputStyle}
        />
      )}
    </View>
  );
}

function parseStored(value: string): Date {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, m, d, y] = match;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  return DEFAULT_DATE;
}

function formatDate(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const y = date.getFullYear();
  return `${m}/${d}/${y}`;
}

function toInputDate(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';
  const [, m, d, y] = match;
  return `${y}-${m}-${d}`;
}

function fromInputDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const [, y, m, d] = match;
  return `${m}/${d}/${y}`;
}

const webInputStyle = {
  marginTop: 8,
  width: '100%',
  padding: 12,
  borderRadius: 12,
  border: `1px solid ${colors.line}`,
  background: colors.panelInk,
  color: colors.offWhite,
  fontFamily: fonts.body,
};

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { color: '#B9B8CC', fontFamily: fonts.bodyMedium, fontSize: 13 },
  star: { color: colors.coral },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.input,
    backgroundColor: colors.panelInk,
  },
  valueText: { color: colors.offWhite, fontFamily: fonts.body, fontSize: 15 },
  placeholderText: { color: '#666783', fontFamily: fonts.body, fontSize: 15 },
  errorBorder: { borderColor: colors.error },
  error: { color: colors.error, fontFamily: fonts.body, fontSize: 12 },
});
