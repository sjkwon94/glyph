-- 프로필의 신고마당에서 직접 접수하는 신고를 위한 대상 유형.
-- target_id는 실제 콘텐츠를 가리키지 않고 신고 건별 UUID를 사용한다.
alter table public.content_reports
  drop constraint if exists content_reports_target_type_check;

alter table public.content_reports
  add constraint content_reports_target_type_check
  check (target_type in ('community_post', 'comment', 'general'));
