export const CREATOR_RATES = {
  paidContent: 0.7,
  tips: 0.9,
  rewardedAds: 0.7,
} as const;

export type RevenueInput = {
  paidContentBase: number;
  tipBase: number;
  adNetRevenue: number;
};

export function calculateCreatorRevenue(input: RevenueInput) {
  const paidContent = Math.floor(Math.max(0, input.paidContentBase) * CREATOR_RATES.paidContent);
  const tips = Math.floor(Math.max(0, input.tipBase) * CREATOR_RATES.tips);
  const ads = Math.floor(Math.max(0, input.adNetRevenue) * CREATOR_RATES.rewardedAds);
  return { paidContent, tips, ads, total: paidContent + tips + ads };
}
