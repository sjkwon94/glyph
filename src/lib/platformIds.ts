const novelEntries = [
  ['ash-sword', '11111111-1111-4111-8111-111111111111'],
  ['winter-orbit', '22222222-2222-4222-8222-222222222222'],
  ['monster-cafe', '33333333-3333-4333-8333-333333333333'],
  ['our-temperature', '44444444-4444-4444-8444-444444444444'],
  ['missing-floor', '55555555-5555-4555-8555-555555555555'],
  ['laundry', '66666666-6666-4666-8666-666666666666'],
] as const;

const chapterPrefixes = [
  ['ash', '11'],
  ['winter', '22'],
  ['cafe', '33'],
  ['temp', '44'],
  ['floor', '55'],
  ['laundry', '66'],
] as const;

export const NOVEL_UUID_BY_SLUG = Object.fromEntries(novelEntries) as Record<string, string>;
export const NOVEL_SLUG_BY_UUID = Object.fromEntries(novelEntries.map(([slug, id]) => [id, slug])) as Record<string, string>;

export const CHAPTER_UUID_BY_KEY = Object.fromEntries(
  chapterPrefixes.flatMap(([prefix, code]) => [1, 2, 3].map((number) => [
    `${prefix}-${number}`,
    `${code}${code}${code}${code}-000${number}-4000-8000-00000000000${number}`,
  ])),
) as Record<string, string>;

export const CHAPTER_KEY_BY_UUID = Object.fromEntries(
  Object.entries(CHAPTER_UUID_BY_KEY).map(([key, id]) => [id, key]),
) as Record<string, string>;

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
