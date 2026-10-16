import { describe, expect, it } from 'vitest';
import { getGoogleDisplayName, getGoogleOAuthRedirectUrl } from './authUtils';

describe('Google OAuth helpers', () => {
  it('returns a callback URL without the hash-router fragment', () => {
    expect(getGoogleOAuthRedirectUrl({
      origin: 'https://sjkwon94.github.io',
      pathname: '/glyph/',
    })).toBe('https://sjkwon94.github.io/glyph/');
  });

  it('uses Google profile names safely', () => {
    expect(getGoogleDisplayName({ full_name: ' 권성준 ' })).toBe('권성준');
    expect(getGoogleDisplayName({ name: '가'.repeat(40) })).toHaveLength(30);
    expect(getGoogleDisplayName({})).toBe('');
  });
});
