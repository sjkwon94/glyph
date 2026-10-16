import { Ban, Flag, ShieldCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, type ModerationReport } from '../state/AppContext';
import { Modal } from './Modal';

type Reason = ModerationReport['reason'];

export function ContentSafetyActions({
  targetId,
  targetType,
  author,
  authorId,
}: {
  targetId: string;
  targetType: ModerationReport['targetType'];
  author: string;
  authorId?: string;
}) {
  const { reportContent, blockUser, blockedUsers } = useApp();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>('abuse');
  const [details, setDetails] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const isBlocked = blockedUsers.includes(author);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await reportContent({ targetId, targetType, targetAuthor: author, reason, details: details.trim().slice(0, 1000) });
    if (!result.ok) { setMessage(result.reason ?? '신고를 접수하지 못했습니다.'); return; }
    setSent(true);
  };

  return (
    <div className="safety-actions">
      <button type="button" onClick={() => { setOpen(true); setSent(false); }}><Flag size={14} /> 신고</button>
      {author !== '나' && <button type="button" disabled={isBlocked} onClick={() => void blockUser(author, authorId)}><Ban size={14} /> {isBlocked ? '차단됨' : '차단'}</button>}
      {open && <Modal title="콘텐츠 신고" onClose={() => setOpen(false)}>
        {sent ? <div className="report-success"><ShieldCheck /><h3>신고가 접수되었습니다</h3><p>운영팀 검토 전까지 같은 내용을 반복 신고할 필요가 없습니다. 긴급한 위험이 있다면 관계 기관에 먼저 도움을 요청해 주세요.</p><button className="primary-button" type="button" onClick={() => setOpen(false)}>확인</button></div> : <form className="report-form" onSubmit={submit}>
          <p><strong>{author}</strong>님의 콘텐츠를 신고합니다.</p>
          <label>신고 사유<select value={reason} onChange={(event) => setReason(event.target.value as Reason)}><option value="abuse">욕설·괴롭힘</option><option value="spam">스팸·도배</option><option value="spoiler">악의적 스포일러</option><option value="copyright">저작권 침해</option><option value="other">기타</option></select></label>
          <label>상세 내용<textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} placeholder="운영팀이 판단할 수 있도록 상황을 적어주세요." /></label>
          {message && <p className="form-message" role="status">{message}</p>}
          <small>처리 기준은 <Link to="/community-policy" onClick={() => setOpen(false)}>커뮤니티 운영정책</Link>에서 확인할 수 있습니다.</small>
          <div className="form-actions"><button className="secondary-button" type="button" onClick={() => setOpen(false)}>취소</button><button className="primary-button" type="submit">신고 접수</button></div>
        </form>}
      </Modal>}
    </div>
  );
}
