import { describe, expect, it } from 'vitest';
import { paginateParagraphs, safePercent } from './readerUtils';

describe('paginateParagraphs', () => {
  it('preserves paragraph order without dropping content', () => {
    const input = ['가'.repeat(40), '나'.repeat(40), '다'.repeat(40)];
    const pages = paginateParagraphs(input, 100);
    expect(pages.flat()).toEqual(input);
    expect(pages.length).toBeGreaterThan(1);
  });

  it('returns one empty page for empty chapters', () => {
    expect(paginateParagraphs([], 100)).toEqual([[]]);
  });

  it('allows a smaller first page for the chapter heading', () => {
    const input = ['가'.repeat(30), '나'.repeat(30), '다'.repeat(30), '라'.repeat(30)];
    const pages = paginateParagraphs(input, 160, 80);
    expect(pages[0]).toEqual([input[0]]);
    expect(pages.flat()).toEqual(input);
  });
});

describe('safePercent', () => {
  it('clamps progress to the expected range', () => {
    expect(safePercent(1, 4)).toBe(25);
    expect(safePercent(7, 4)).toBe(100);
    expect(safePercent(-1, 4)).toBe(0);
  });
});
