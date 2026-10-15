export function paginateParagraphs(paragraphs: string[], charBudget: number, firstPageBudget = charBudget): string[][] {
  if (paragraphs.length === 0) return [[]];
  const pages: string[][] = [];
  let current: string[] = [];
  let count = 0;

  paragraphs.forEach((paragraph) => {
    const weight = paragraph.length + 36;
    const activeBudget = pages.length === 0 ? firstPageBudget : charBudget;
    if (current.length > 0 && count + weight > activeBudget) {
      pages.push(current);
      current = [];
      count = 0;
    }
    current.push(paragraph);
    count += weight;
  });

  if (current.length > 0) pages.push(current);
  return pages;
}

export function safePercent(current: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
}
