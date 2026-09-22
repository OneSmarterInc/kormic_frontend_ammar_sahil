import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, fonts, radii } from '../theme/tokens';

interface DateOfBirthFieldProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

const monthOptions = [
  { label: 'Jan (01)', value: '01' },
  { label: 'Feb (02)', value: '02' },
  { label: 'Mar (03)', value: '03' },
  { label: 'Apr (04)', value: '04' },
  { label: 'May (05)', value: '05' },
  { label: 'Jun (06)', value: '06' },
  { label: 'Jul (07)', value: '07' },
  { label: 'Aug (08)', value: '08' },
  { label: 'Sep (09)', value: '09' },
  { label: 'Oct (10)', value: '10' },
  { label: 'Nov (11)', value: '11' },
  { label: 'Dec (12)', value: '12' },
];

const dayOptions = Array.from({ length: 31 }, (_, i) => {
  const val = String(i + 1).padStart(2, '0');
  return { label: String(i + 1), value: val };
});

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 75 }, (_, i) => {
  const y = String(currentYear - i);
  return { label: y, value: y };
});

export function DateOfBirthField({ value, error, onChange }: DateOfBirthFieldProps) {
  const parsed = parseDateParts(value);
  const [localMonth, setLocalMonth] = useState(parsed.month);
  const [localDay, setLocalDay] = useState(parsed.day);
  const [localYear, setLocalYear] = useState(parsed.year);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const p = parseDateParts(value);
    setLocalMonth(p.month);
    setLocalDay(p.day);
    setLocalYear(p.year);
  }, [value]);

  const handleMonthChange = (m: string) => {
    setLocalMonth(m);
    onChange(`${m}/${localDay}/${localYear}`);
  };

  const handleDayChange = (d: string) => {
    setLocalDay(d);
    onChange(`${localMonth}/${d}/${localYear}`);
  };

  const handleYearChange = (y: string) => {
    setLocalYear(y);
    onChange(`${localMonth}/${localDay}/${y}`);
  };

  const maxDateString = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

  return (
    <View style={styles.dateField}>
      <Text style={styles.fieldLabel}>
        Date of birth <Text style={styles.requiredMark}>*</Text>
      </Text>

      <View style={styles.row}>
        {/* Month Dropdown */}
        <View style={styles.dropdownFlexMonth}>
          <Dropdown
            style={[styles.dropdown, error ? styles.errorBorder : undefined]}
            placeholderStyle={styles.placeholder}
            selectedTextStyle={styles.selected}
            itemTextStyle={styles.itemText}
            containerStyle={styles.menu}
            activeColor="rgba(91,141,239,0.18)"
            data={monthOptions}
            labelField="label"
            valueField="value"
            placeholder="Month"
            value={localMonth}
            onChange={(item) => handleMonthChange(item.value)}
          />
        </View>

        {/* Day Dropdown */}
        <View style={styles.dropdownFlexDay}>
          <Dropdown
            style={[styles.dropdown, error ? styles.errorBorder : undefined]}
            placeholderStyle={styles.placeholder}
            selectedTextStyle={styles.selected}
            itemTextStyle={styles.itemText}
            containerStyle={styles.menu}
            activeColor="rgba(91,141,239,0.18)"
            data={dayOptions}
            labelField="label"
            valueField="value"
            placeholder="Day"
            value={localDay}
            onChange={(item) => handleDayChange(item.value)}
          />
        </View>

        {/* Year Dropdown */}
        <View style={styles.dropdownFlexYear}>
          <Dropdown
            style={[styles.dropdown, error ? styles.errorBorder : undefined]}
            placeholderStyle={styles.placeholder}
            selectedTextStyle={styles.selected}
            itemTextStyle={styles.itemText}
            containerStyle={styles.menu}
            activeColor="rgba(91,141,239,0.18)"
            data={yearOptions}
            labelField="label"
            valueField="value"
            placeholder="Year"
            search
            searchPlaceholder="Search year..."
            inputSearchStyle={styles.searchInput}
            value={localYear}
            onChange={(item) => handleYearChange(item.value)}
          />
        </View>

        {/* Calendar Picker Button */}
        {React.createElement(
          'div',
          {
            style: webCalendarButtonStyle,
            onClick: () => {
              try {
                inputRef.current?.showPicker?.();
              } catch {
                inputRef.current?.focus();
              }
            },
          },
          React.createElement(MaterialIcons, {
            name: 'calendar-today',
            size: 18,
            color: colors.offWhite,
          }),
          React.createElement('input', {
            ref: inputRef,
            type: 'date',
            value: toInputDate(value),
            max: maxDateString,
            min: '1950-01-01',
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
              const val = event.target.value;
              if (val) {
                const formatted = fromInputDate(val);
                const p = parseDateParts(formatted);
                setLocalMonth(p.month);
                setLocalDay(p.day);
                setLocalYear(p.year);
                onChange(formatted);
              }
            },
            style: webDateInputStyle,
          }),
        )}
      </View>

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function parseDateParts(value: string) {
  if (!value) return { month: '', day: '', year: '' };
  const parts = value.split('/');
  if (parts.length === 3) {
    const [m = '', d = '', y = ''] = parts;
    return {
      month: m,
      day: d,
      year: y,
    };
  }

  const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return {
      month: String(m).padStart(2, '0'),
      day: String(d).padStart(2, '0'),
      year: String(y),
    };
  }

  return { month: '', day: '', year: '' };
}

function toInputDate(value: string): string {
  const { month, day, year } = parseDateParts(value);
  if (month && day && year && month.length === 2 && day.length === 2 && year.length === 4) {
    return `${year}-${month}-${day}`;
  }
  return '';
}

function fromInputDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`;
  }
  return value;
}

const webCalendarButtonStyle: React.CSSProperties = {
  alignItems: 'center',
  backgroundColor: colors.panelInk,
  borderColor: colors.line,
  borderRadius: 12,
  borderStyle: 'solid',
  borderWidth: 1,
  boxSizing: 'border-box',
  cursor: 'pointer',
  display: 'flex',
  height: 52,
  justifyContent: 'center',
  minWidth: 48,
  overflow: 'hidden',
  position: 'relative',
  width: 48,
};

const webDateInputStyle: React.CSSProperties = {
  cursor: 'pointer',
  inset: 0,
  opacity: 0,
  outline: 'none',
  position: 'absolute',
  width: '100%',
};

const styles = StyleSheet.create({
  dateField: {
    gap: 6,
  },
  fieldLabel: {
    color: '#B9B8CC',
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dropdownFlexMonth: {
    flex: 1.3,
  },
  dropdownFlexDay: {
    flex: 1,
  },
  dropdownFlexYear: {
    flex: 1.3,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.input,
    paddingHorizontal: 10,
    height: 52,
    backgroundColor: colors.panelInk,
  },
  placeholder: {
    color: '#666783',
    fontFamily: fonts.body,
    fontSize: 14,
  },
  selected: {
    color: colors.offWhite,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  itemText: {
    color: colors.offWhite,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  menu: {
    backgroundColor: colors.panelInk,
    borderColor: colors.line,
    borderRadius: radii.input,
  },
  searchInput: {
    borderColor: colors.line,
    borderRadius: radii.input,
    color: colors.offWhite,
    fontFamily: fonts.body,
  },
  errorBorder: {
    borderColor: colors.error,
  },
  fieldError: {
    color: colors.error,
    fontFamily: fonts.body,
    fontSize: 12,
  },
  requiredMark: {
    color: colors.coral,
  },
});
