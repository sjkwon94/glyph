import { FileImage, Flag, ShieldCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, type ModerationReport } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';

type Reason = ModerationReport['reason'];

export function ReportsPage() {
  const { viewer, loading } = useAuth();
  const { reportContent } = useApp();
  const [reason, setReason] = useState<Reason>('copyright');
  const [details, setDetails] = useState('');
  const [evidence, setEvidence] = useState<File | null>(null);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');

  if (loading) return <div className="page-container inner-page empty-state">신고마당을 준비하고 있습니다.</div>;
  if (!viewer) return <div className="page-container inner-page empty-state"><Flag /><h1>로그인이 필요합니다</h1><p>신고 접수와 증거 보존은 로그인 후 이용할 수 있습니다.</p><Link className="primary-button" to="/auth">로그인</Link></div>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanDetails = details.trim().slice(0, 1000);
    if (!cleanDetails) {
      setMessage('신고 내용을 입력해 주세요.');
      return;
    }
    const result = await reportContent({
      targetId: crypto.randomUUID(),
      targetType: 'general',
      targetAuthor: '신고마당 접수',
      reason,
      details: cleanDetails,
      evidence,
    });
    if (!result.ok) {
      setMessage(result.reason ?? '신고를 접수하지 못했습니다.');
      return;
    }
    setSent(true);
  };

  return <div className="page-container inner-page report-page">
    <header className="page-title"><span className="section-kicker"><Flag size={15} /> 신고마당</span><h1>신고 내용을 보내주세요</h1><p>저작권 침해, 외부 유출 의심, 커뮤니티 문제를 운영팀에 알려주세요.</p></header>
    <section className="account-card report-card">
      {sent ? <div className="report-success"><ShieldCheck /><h2>신고가 접수되었습니다</h2><p>운영팀이 내용을 확인하고 필요한 경우 증거 사진의 워터마크를 서버 발급 이력과 대조합니다.</p><Link className="primary-button" to="/account">내 계정으로 돌아가기</Link></div> : <form className="report-form" onSubmit={submit}>
        <label>신고 유형<select value={reason} onChange={(event) => setReason(event.target.value as Reason)}><option value="copyright">저작권 침해·외부 유출</option><option value="abuse">욕설·괴롭힘</option><option value="spam">스팸·도배</option><option value="spoiler">악의적 스포일러</option><option value="other">기타</option></select></label>
        <label>신고 내용<textarea value={details} onChange={(event) => { setDetails(event.target.value); setMessage(''); }} maxLength={1000} placeholder="문제가 발생한 작품·게시글·계정과 상황을 적어주세요." required /><small className="field-counter">{details.length}/1000</small></label>
        <label className="report-file-field"><span><FileImage size={16} /> 증거 이미지 <small>JPG·PNG·WEBP, 최대 10MB · 워터마크 자동 분석</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setEvidence(event.target.files?.[0] ?? null)} />{evidence && <em>{evidence.name}</em>}</label>
        {message && <p className="form-message" role="status">{message}</p>}
        <small>신고 내용과 첨부 파일은 운영자 검토와 저작권 보호를 위해 보안 저장됩니다. 허위 신고나 타인의 개인정보가 포함된 자료는 제출하지 마세요.</small>
        <div className="form-actions"><Link className="secondary-button" to="/account">취소</Link><button className="primary-button" type="submit">신고 접수</button></div>
      </form>}
    </section>
  </div>;
}
