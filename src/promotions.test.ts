import { describe, expect, it } from 'vitest';
import { COOKIE_EVENT_MULTIPLIER, EVENT_AD_REWARD, promotionalCookies } from './promotions';

describe('cookie double event', () => {
  it('doubles paid cookie packages', () => {
    expect(COOKIE_EVENT_MULTIPLIER).toBe(2);
    expect(promotionalCookies(55)).toBe(110);
  });

  it('doubles the base rewarded-ad grant', () => {
    expect(EVENT_AD_REWARD).toBe(4);
  });
});
