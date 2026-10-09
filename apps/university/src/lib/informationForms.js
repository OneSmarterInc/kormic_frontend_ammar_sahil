const field = (key, label, type = 'text', placeholder = '') => ({ key, label, type, placeholder });
const notes = field('notes', 'Additional details', 'textarea');
const eligibility = field('eligibility', 'Eligibility criteria', 'textarea');
const deadline = field('deadline', 'Application deadline', 'text', 'Date, time zone, or recurring deadline');
const year = field('academic_year', 'Academic year', 'text', 'e.g. 2026–2027');
const currency = field('currency', 'Currency', 'text', 'e.g. USD');
const duration = field('duration', 'Duration', 'text', 'e.g. 2 years / 4 semesters');
const url = field('application_url', 'Application link', 'url', 'https://');
const amount = field('amount', 'Amount / range', 'text', 'Include any conditions or ranges');
const period = field('billing_period', 'Charged per', 'text', 'Credit, semester, year, or full program');

export const OVERVIEW_FIELDS = [field('name', 'University name'), field('location', 'City / state'),
  field('admissions_office_address', 'Postal / admissions office address', 'textarea'),
  field('website_url', 'Official website', 'url'), field('contact_email', 'Contact email', 'email'),
  field('contact_phone', 'Contact phone', 'tel'), field('description', 'About the university', 'textarea')];

export const FORM_SECTIONS = [
  { id: 'overview', label: 'University details', description: 'Identity, address and contact information.', fields: OVERVIEW_FIELDS },
  { id: 'academics', label: 'Programs', collection: 'Courses', collectionDescription: 'Each course has its own qualification, duration, fees and entry requirements.', singular: 'course', category: 'academics', description: 'Degrees, study options, entry requirements and course duration.', fields: [
    field('name', 'Program / qualification name'), field('level', 'Degree level'), field('program_code', 'Program code'), field('department', 'Department / school'),
    duration, field('study_mode', 'Study mode', 'text', 'Full time, part time, online or hybrid'), field('campus', 'Campus'),
    field('intake', 'Available intakes'), year, field('start_date', 'Program start date'), deadline,
    field('tuition', 'Tuition / fees'), currency, period, field('additional_costs', 'Program-specific charges', 'textarea'), field('seats', 'Available places'), field('requirements', 'Entry requirements', 'textarea'),
    field('description', 'Program description', 'textarea'), notes] },
  { id: 'fees', label: 'University-wide fees', singular: 'fee', category: 'fees', description: 'Shared charges such as application, registration and transcript fees. Program tuition and housing costs are managed with their records.', fields: [
    field('name', 'Fee / charge name'), field('cost_owner', 'Cost belongs to', 'cost-owner'), field('program', 'Applicable program / level'), amount, currency, period, year,
    field('applicant_scope', 'Student category', 'text', 'Resident, nonresident, international, or all students'),
    field('payment_deadline', 'Payment due date'), field('additional_costs', 'Additional charges', 'textarea'),
    field('refund_policy', 'Refund policy', 'textarea'), notes] },
  { id: 'housing', label: 'Hostel & housing', singular: 'housing option', category: 'campus', description: 'Accommodation, room types, costs, facilities and contract dates.', fields: [
    field('name', 'Residence / hostel name'), field('description', 'Accommodation description', 'textarea'), field('campus', 'Campus / location'), field('room_type', 'Room type'),
    amount, currency, period, field('contract_duration', 'Contract duration'),
    field('contract_start', 'Contract start date'), field('contract_end', 'Contract end date'), deadline, eligibility,
    field('deposit', 'Housing deposit'), field('meal_plan', 'Meal plan / dining'), field('amenities', 'Facilities & amenities', 'textarea'),
    field('accessibility', 'Accessibility & support', 'textarea'), url, notes] },
  { id: 'scholarships', label: 'Scholarships', singular: 'scholarship', category: 'scholarships', description: 'Awards, detailed eligibility, application dates and renewal requirements.', fields: [
    field('name', 'Scholarship / aid name'), field('award_type', 'Award type', 'text', 'Merit, need based, assistantship, or grant'),
    field('amount', 'Amount / range', 'textarea'), currency, field('award_period', 'Award period', 'text', 'One time, per semester, or per academic year'), duration,
    field('applicant_scope', 'Eligible students / programs'), field('minimum_gpa', 'Minimum GPA'), eligibility,
    field('opening_date', 'Applications open'), deadline, field('renewable', 'Renewable?', 'select'),
    field('renewal_criteria', 'Renewal requirements', 'textarea'), field('award_tiers', 'Award tiers & conditions', 'textarea'), url, notes] },
  { id: 'admissions', label: 'Admissions', singular: 'admission requirement', category: 'admissions', description: 'Requirements, supporting documents and application timelines by intake.', fields: [
    field('name', 'Admission route / requirement'), field('program', 'Program / degree level'), field('intake', 'Intake / term'), year,
    field('opening_date', 'Applications open'), deadline, field('start_date', 'Classes start'), eligibility,
    field('minimum_gpa', 'Minimum GPA'), field('test_scores', 'Required test scores', 'textarea'),
    field('documents', 'Required documents', 'textarea'), url, notes] },
  { id: 'international', label: 'International students', singular: 'international requirement', category: 'international', description: 'Language requirements, visa documentation and arrival information.', fields: [
    field('name', 'Requirement / service name'), field('applicant_scope', 'Applicable students'),
    field('language_requirements', 'English / language requirements', 'textarea'), field('visa_documents', 'Visa & immigration documents', 'textarea'),
    field('financial_evidence', 'Financial evidence', 'textarea'), deadline, field('arrival_date', 'Arrival / orientation dates'), notes] },
  { id: 'campus', label: 'Campus & services', singular: 'campus service', category: 'campus', description: 'Facilities, student support and service availability.', fields: [
    field('name', 'Facility / service name'), field('location', 'Location'), field('opening_hours', 'Opening hours'),
    field('contact', 'Contact details'), field('cost', 'Cost / access charges'), eligibility,
    field('description', 'Service description', 'textarea'), notes] },
  { id: 'careers', label: 'Careers & outcomes', singular: 'career service', category: 'careers', description: 'Career support, internships and documented graduate outcomes.', fields: [
    field('name', 'Service / outcome name'), field('program', 'Applicable programs'),
    field('reporting_period', 'Reporting period'), field('contact', 'Contact details'),
    field('description', 'Details & outcomes', 'textarea'), notes] },
  { id: 'other', label: 'Other information', singular: 'information record', category: 'other', description: 'Information that does not fit the sections above.', fields: [
    field('name', 'Information label'), field('description', 'Details', 'textarea'), field('effective_date', 'Effective date / period'), notes] },
];

export function sectionFor(record) {
  const kind = record.details?.information_type;
  if (kind === 'fees') return record.cost_placement?.target_id ? null : record.cost_placement?.scope === 'university' || record.details?.cost_owner === 'university' ? 'fees' : 'other';
  if (FORM_SECTIONS.some(section => section.id === kind && kind !== 'overview')) return kind;
  return null;
}

const stringValue = value => value == null ? '' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
export function valuesFor(record, section) {
  const details = record?.details || {};
  const values = Object.fromEntries(section.fields.map(f => [f.key, stringValue(details[f.key])]));
  values.name ||= record?.topic || '';
  if (section.id === 'fees' && !values.cost_owner) values.cost_owner = record?.cost_placement?.target_id ? `${record.cost_placement.scope}:${record.cost_placement.target_id}` : record?.cost_placement?.scope === 'university' ? 'university' : 'review';
  return values;
}

export function formPayload(record, section, values) {
  const fields = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
  const content = section.fields.filter(f => fields[f.key]).map(f => `${f.label}: ${fields[f.key]}`).join('\n');
  return { topic: fields.name, content, category: section.category,
    details: { ...(record?.details || {}), ...fields, information_type: section.id },
    ...(record ? { expected_revision: record.revision } : {}) };
}

export const COURSE_LEVELS = [
  { id: 'undergraduate', label: 'Undergraduate', description: 'Bachelor’s and associate degrees.', defaultLevel: 'Undergraduate' },
  { id: 'masters', label: 'Master’s', description: 'Master’s degrees and taught or research postgraduate programs.', defaultLevel: 'Master’s' },
  { id: 'doctoral', label: 'PhD & doctoral', description: 'Doctoral degrees and PhD programs.', defaultLevel: 'Doctoral' },
  { id: 'other', label: 'Other', description: 'Certificates, minors, combined programs and courses with an unconfirmed level.', defaultLevel: '' },
];

export function courseLevel(record) {
  const name = record.details?.name || record.topic || '';
  const level = record.details?.level || '';
  // Broad source headings such as "Graduate" do not distinguish a master's
  // degree from a doctorate. Prefer the qualification named by the source.
  if (/\b(certificate|certification|minor|combined|dual degree)\b/i.test(name) || /combined/i.test(level)) return 'other';
  if (/\b(ph\.?\s?d\.?|doctor(?:al|ate)?|edd|ed\.d\.?|dnp|psyd|md)\b/i.test(name) || /ph\.?\s?d|doctor/i.test(level)) return 'doctoral';
  if (/\b(master(?:s|’s|'s)?|m\.?s\.?|m\.?a\.?|mba|mfa|mph|macc|med|ms[a-z]{1,5}|m[a-z]{1,4}eng)\b/i.test(name) || /master/i.test(level)) return 'masters';
  if (/\b(bachelor(?:s|’s|'s)?|associate|b\.?a\.?|b\.?s\.?|bfa)\b/i.test(name) || /\bB[A-Z][A-Za-z]{0,5}\b/.test(name) || /undergraduate|bachelor|associate/i.test(level)) return 'undergraduate';
  return 'other';
}

export function missingFields(record, section) {
  const values = valuesFor(record, section);
  return section.fields.filter(field => {
    if (field.key === 'notes') return false;
    if (field.key === 'renewal_criteria' && values.renewable === 'No') return false;
    const value = values[field.key].trim();
    return !value || /^(not provided|unknown|not available|tbd|to be confirmed)$/i.test(value);
  });
}

export function matchesMissingFilter(record, section, filter) {
  const missing = missingFields(record, section);
  if (filter === 'all') return true;
  if (filter === 'any') return missing.length > 0;
  if (filter === 'complete') return missing.length === 0;
  return missing.some(field => field.key === filter);
}
