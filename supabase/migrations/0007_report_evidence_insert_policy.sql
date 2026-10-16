-- 신고 제출자가 자신이 올린 증거 메타데이터를 기록할 수 있도록 허용한다.
-- 원본 파일은 report-evidence 버킷 정책에서 같은 사용자 경로로 제한한다.
create policy "evidence_owner_insert" on public.content_report_evidence for insert to authenticated
with check (reporter_id = auth.uid());
