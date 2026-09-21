export interface ClaimPrefill {
  full_name: string;
  email: string;
  field_of_study: string;
  degree_level: string;
  expected_graduation: string;
  phone: string;
  year_in_college: string;
  program_name: string;
  city: string;
  country: string;
  region: string;
  state: string;
  institute_id?: string;
  institute_name?: string;
}

export type ClaimEditableField = Exclude<keyof ClaimPrefill, 'email' | 'institute_id' | 'institute_name'>;

export interface ClaimLandingScreenProps {
  token?: string;
  loading?: boolean;
  error?: string;
  onTokenChange: (token: string) => void;
  onRequestCode: () => void;
  onBackToWelcome: () => void;
}

export interface ClaimCodeScreenProps {
  maskedEmail: string;
  loading?: boolean;
  resending?: boolean;
  error?: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
}

export interface ClaimReviewScreenProps {
  value: ClaimPrefill;
  loading?: boolean;
  error?: string;
  onChange: (field: ClaimEditableField, value: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}

export interface ClaimPasswordScreenProps {
  email: string;
  fullName: string;
  loading?: boolean;
  error?: string;
  onCreateAccount: (password: string) => void;
  onBack: () => void;
}
