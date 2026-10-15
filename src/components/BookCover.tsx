import type { Novel } from '../data';

export function BookCover({ novel, className = '' }: { novel: Novel; className?: string }) {
  return (
    <div className={`book-cover ${className}`} style={{ '--cover': novel.color, '--accent': novel.accent } as React.CSSProperties} aria-label={`${novel.title} 표지`}>
      <span className="cover-category">{novel.categoryLabel}</span>
      <div className="cover-ornament" aria-hidden="true"><i /><i /><i /></div>
      <strong>{novel.title}</strong>
      <small>{novel.author}</small>
    </div>
  );
}
