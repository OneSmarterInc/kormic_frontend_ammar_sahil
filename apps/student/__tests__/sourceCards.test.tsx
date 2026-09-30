import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { UniversityReferences } from '../src/features/chat/components/UniversityReferences';
import { FormattedMessageText } from '../src/features/chat/components/FormattedMessageText';
jest.mock('../src/services/api', () => ({ readUniversityResearch: jest.fn() }));

test('source destinations render as cards even without university metadata', () => {
  const view = render(<UniversityReferences text="[Official website](https://www.princeton.edu/)" />);
  expect(view.queryByRole('link')).toBeNull();
  fireEvent.press(view.getByRole('button'));
  expect(view.getByText('www.princeton.edu')).toBeTruthy();
  expect(view.getByRole('link')).toBeTruthy();
  expect(view.queryByText('Official website research pending')).toBeNull();
  fireEvent.press(view.getByRole('button'));
  expect(view.queryByRole('link')).toBeNull();
});

test('card mode removes inline links while keeping the answer', () => {
  const view = render(<FormattedMessageText text={'Verified details.\n\n**Official sources used**\n[Source 1](https://example.edu/)'} formatBold isUniversityResponse={false} sourceCards />);
  expect(view.getByText('Verified details.')).toBeTruthy();
  expect(view.queryByRole('link')).toBeNull();
});
