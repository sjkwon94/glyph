import { describe, expect, it } from 'vitest';
import { calculateCreatorRevenue } from './revenue';

describe('calculateCreatorRevenue', () => {
  it('applies the announced creator shares', () => {
    expect(calculateCreatorRevenue({ paidContentBase: 100_000, tipBase: 10_000, adNetRevenue: 20_000 })).toEqual({
      paidContent: 70_000,
      tips: 9_000,
      ads: 14_000,
      total: 93_000,
    });
  });

  it('never creates negative settlement amounts', () => {
    expect(calculateCreatorRevenue({ paidContentBase: -1, tipBase: -1, adNetRevenue: -1 }).total).toBe(0);
  });
});
