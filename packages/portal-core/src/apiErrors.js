// Django REST Framework returns serializer errors as fields/arrays rather than
// a top-level message. Convert those into readable text without losing details.
export function validationMessage(data) {
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data.map(validationMessage).filter(Boolean).join(' ');
  if (!data || typeof data !== 'object') return '';
  return Object.entries(data).map(([key, value]) => {
    const message = validationMessage(value);
    if (!message) return '';
    const label = ['message', 'error', 'detail', 'non_field_errors'].includes(key)
      ? '' : `${key.replaceAll('_', ' ')}: `;
    return label + message;
  }).filter(Boolean).join(' ');
}
