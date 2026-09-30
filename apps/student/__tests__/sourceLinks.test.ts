import { getLinkSegments } from '../src/features/chat/components/FormattedMessageText';

test('source links show compact labels and retain their destination', () => {
  expect(getLinkSegments('Fees\n[Source 1](https://example.edu/tuition)')).toEqual([
    { text: 'Fees\n' },
    { text: 'Source 1', url: 'https://example.edu/tuition' },
  ]);
});

test('non-web links remain plain text', () => {
  expect(getLinkSegments('[Run](javascript:alert)')).toEqual([{ text: '[Run](javascript:alert)' }]);
});
