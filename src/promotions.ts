export const COOKIE_EVENT_MULTIPLIER = 2;
export const COOKIE_EVENT_END_DATE = '2026.10.31';
export const BASE_AD_REWARD = 2;
export const EVENT_AD_REWARD = BASE_AD_REWARD * COOKIE_EVENT_MULTIPLIER;

export function promotionalCookies(baseCookies: number) {
  return Math.max(0, Math.trunc(baseCookies)) * COOKIE_EVENT_MULTIPLIER;
}
