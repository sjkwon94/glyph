# 글리프 운영 아키텍처

```text
GitHub 저장소 ── Actions ──> GitHub Pages (React PWA)
                                  │ 공개 anon key + 사용자 JWT
                                  ▼
                            Supabase Auth/API
                         ┌────────┴────────┐
                    Postgres + RLS      Storage
                         ▲
                         │ 서버에서만
              Edge Functions / 결제·광고 웹훅
                 │                    │
              결제 PG              광고 SSV
```

## 보안 경계

- GitHub Pages는 정적 프런트만 담당합니다. 비밀 키, 쿠키 잔액 계산, 결제 승인, 광고 보상 검증을 두지 않습니다.
- `VITE_SUPABASE_ANON_KEY`는 공개 키이며 RLS가 실제 접근 통제입니다. `service_role` 키는 Edge Function 환경 변수에만 둡니다.
- 유료 회차 본문은 공개 목록 API와 분리합니다. `chapter_catalog`에는 본문이 없고, `chapters` 본문 조회는 작가·소장자·무료 회차에만 허용됩니다.
- 쿠키 차감은 `unlock_chapter()` 트랜잭션에서 지갑 행을 잠근 뒤 소장 기록과 원장을 함께 기록합니다. 브라우저에는 잔액 수정 권한이 없습니다.
- 결제/광고 웹훅은 공급자 서명을 검증하고 `provider_order_id`, `provider_event_id`, `idempotency_key`로 중복 지급을 막아야 합니다.
- 댓글과 본문은 일반 텍스트로 렌더링합니다. 운영 API에서도 길이·금칙어·요청 속도를 검증합니다.

## 운영 권한과 감사

- 관리자 권한은 사용자가 수정할 수 있는 프로필 메타데이터가 아니라 `admin_roles`에 둡니다.
- 작가 승인과 신고 종료는 브라우저의 직접 업데이트가 아니라 권한 확인 RPC를 거치며 `admin_audit_logs`에 남습니다.
- 심사 원고는 비공개 `author-samples` 버킷의 사용자별 경로에 저장하고 소유자와 작가 심사 담당자만 읽습니다.
- 작가 수익 이벤트와 월 정산서는 작성자가 읽을 수 있지만 생성·수정은 서버 역할만 수행합니다.
