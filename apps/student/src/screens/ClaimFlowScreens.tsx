// Compatibility exports for existing callers. Claim state and UI live in features/claim.
export type { ClaimPrefill, ClaimEditableField } from '../features/claim/types';
export { ClaimLandingScreen } from '../features/claim/components/ClaimLandingScreen';
export { ClaimCodeScreen } from '../features/claim/components/ClaimCodeScreen';
export { ClaimReviewScreen } from '../features/claim/components/ClaimReviewScreen';
export { ClaimPasswordScreen } from '../features/claim/components/ClaimPasswordScreen';
export { ClaimTotpBridgeScreen } from '../features/claim/components/ClaimTotpBridgeScreen';
