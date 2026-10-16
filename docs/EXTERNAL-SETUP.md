# 계정 소유자가 완료할 외부 설정

코드로 대신할 수 없는 출시 단계만 모았습니다.

## GitHub

1. GitHub 연결 또는 새 저장소 URL을 준비합니다.
2. Git 작성자 이름과 이메일을 설정하고 현재 소스를 첫 커밋으로 푸시합니다.
3. 저장소 Pages 소스를 GitHub Actions로 지정하고 `main` 브랜치를 보호합니다.
4. 사용자 도메인을 연결한 뒤 HTTPS 강제를 켭니다.

## Supabase

1. 운영·스테이징 프로젝트를 각각 만들고 `0001_initial.sql`, `0002_launch_controls.sql`, `0003_public_catalog_and_application_rpc.sql`, `0004_readable_chapter_content_rpc.sql` 순으로 적용합니다.
2. 사이트 URL과 허용 Redirect URL을 실제 HTTPS 도메인으로만 제한합니다.
3. `.env.local` 또는 GitHub Actions 변수에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`를 넣고 `VITE_DEMO_MODE=false`로 설정합니다.
4. 관리자 계정에 MFA를 적용한 뒤 `admin_roles`는 SQL 편집기 또는 서버 운영 도구로만 부여합니다.
5. Edge Function 비밀에 `PAYMENT_WEBHOOK_SECRET`, `AD_REWARD_WEBHOOK_SECRET`을 설정합니다. `SUPABASE_SERVICE_ROLE_KEY`는 프런트엔드·GitHub 저장소에 두지 않습니다.

## Google 로그인

1. Google Cloud의 Google Auth Platform에서 앱 이름을 `글리프`로 설정하고 웹 OAuth 클라이언트를 만듭니다.
2. 승인된 JavaScript 원본에 `https://sjkwon94.github.io`를 추가합니다.
3. 승인된 리디렉션 URI에 Supabase 대시보드의 Google 공급자 화면에 표시되는 Callback URL을 추가합니다.
4. 발급된 Client ID와 Client Secret은 코드나 GitHub 변수에 넣지 말고 Supabase `Authentication > Sign In / Providers > Google`에만 저장합니다.
5. Google의 기본 `openid`, `email`, `profile` 범위만 사용하고 민감한 추가 범위는 요청하지 않습니다.
6. Supabase URL Configuration에는 `https://sjkwon94.github.io/glyph/`를 허용 URL로 유지합니다.
7. 운영 공개 전 Google 동의 화면의 지원 이메일, 홈페이지, 개인정보처리방침 URL을 실제 정보로 확인합니다.

## 사업자·결제·광고

1. 운영자 상호, 대표자, 사업자등록번호, 통신판매업 신고, 주소, 고객센터, 개인정보보호 책임자를 확정합니다.
2. 국내 PG와 계약하고 제공사의 실제 서명 규격에 맞게 두 Edge Function의 헤더·본문 매핑을 수정한 뒤 테스트 웹훅을 검증합니다.
3. 웹 보상형 광고 공급자를 계약하고 SSV의 nonce, 이벤트 ID, 만료 검증 규격을 연결합니다.
4. 환불, 무료·유상 쿠키 사용 순서, 유효기간, 이벤트 지급분 회수 기준을 법률 검토 후 화면·약관·서버에 동일하게 반영합니다.
5. 작가 계약서, 지급일, 최소 지급액, 세금 처리와 지급계좌 확인 절차를 확정합니다.

## 출시 전 실기기 점검

- Android Chrome, iPhone Safari, 데스크톱 Chrome·Edge에서 회원가입, 로그인, 회차 소장, 다음 화, 댓글, 신고, 차단을 실제 계정으로 점검합니다.
- 결제 성공·실패·취소·중복 웹훅, 광고 완료·중단·중복 SSV, 잔액 부족, 세션 만료를 스테이징에서 재현합니다.
