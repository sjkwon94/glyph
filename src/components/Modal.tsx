import { X } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', close);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', close);
      document.body.classList.remove('modal-open');
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal-card ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header><h2 id="modal-title">{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="닫기"><X size={21} /></button></header>
        {children}
      </section>
    </div>
  );
}
