export const REQUIRED_POLICY_VERSION = '2026-10-15';
export const GOOGLE_CONSENT_STORAGE_KEY = 'glyph:google-policy-consent';

type BrowserLocation = Pick<Location, 'origin' | 'pathname'>;

export function getGoogleOAuthRedirectUrl(location: BrowserLocation = window.location) {
  return `${location.origin}${location.pathname}`;
}

export function getGoogleDisplayName(metadata: Record<string, unknown>) {
  const candidate = metadata.display_name ?? metadata.full_name ?? metadata.name;
  if (typeof candidate !== 'string') return '';
  return candidate.trim().slice(0, 30);
}
