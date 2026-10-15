# 글리프

읽기·연재·장르별 커뮤니티를 한곳에 묶은 모바일 우선 웹소설 PWA입니다.

## 현재 구현

- 반응형 홈, 장르/검색 탐색, 작품 상세와 회차 목록
- 모바일 뷰어: 좌/우 탭, 스와이프, 키보드, 페이지/스크롤 모드, 글자·줄간격·밝기·테마·글꼴, 목차, 책갈피, 전체화면
- 무료/유료 회차와 쿠키 소장 흐름
- 30초 보상형 광고 데모, 쿠키 결제 데모
- 댓글, 좋아요/싫어요, `전체` 없이 장르별로 분리된 커뮤니티와 글쓰기
- 요일·장르 단독 및 복합 작품 필터
- 포트폴리오/원고 예시 제출 → 운영 심사 → 승인 후 연재하는 작가 스튜디오
- 이메일 회원가입·로그인 UI와 Supabase 세션 연결, 계정·차단 관리 화면
- 게시글·댓글 신고와 사용자 차단, 작가 심사·신고 처리 운영자 화면
- 작가 수익정책(유료 회차 70%, 후원 90%, 보상형 광고 70%)과 정산 데이터 모델
- 이용약관·개인정보·커뮤니티·작가 정책 초안 페이지
- 2026.10.31까지 충전·광고 보상을 두 배로 지급하는 쿠키 이벤트 데모
- PWA 설치, GitHub Pages 자동 배포, CodeQL·Dependabot
- Supabase RLS, 관리자 RPC, 비공개 심사 원고, 원자적 쿠키 원장을 포함한 운영용 SQL
- 서명·멱등 처리를 포함한 결제/광고 Edge Function 공급자 연동 골격

기본 설정은 데모 모드이며 데이터와 쿠키는 브라우저 `localStorage`에 저장됩니다. 이는 체험용일 뿐 보안 경계가 아닙니다. 운영 환경에서는 두 Supabase 마이그레이션을 적용하고 `VITE_DEMO_MODE=false`로 전환해야 합니다.

## 실행

```bash
npm install
npm run dev
```

검증:

```bash
npm test
npm run typecheck
npm run build
```

## GitHub Pages

1. 저장소를 GitHub에 연결하고 `main` 또는 `master` 브랜치에 푸시합니다.
2. GitHub 저장소의 **Settings → Pages → Source**를 **GitHub Actions**로 지정합니다.
3. `.github/workflows/deploy-pages.yml`가 테스트와 빌드 후 `dist`를 배포합니다.

HashRouter와 상대 `base`를 사용하므로 프로젝트 저장소 Pages 경로에서도 새로고침 오류 없이 동작합니다.

## 실제 서비스 연결 순서

1. Supabase 프로젝트 생성 후 `0001`, `0002` 마이그레이션 적용
2. `.env.local`에 URL과 공개 anon 키 설정 (`service_role` 금지)
3. 국내 PG·웹 광고 공급자를 선정하고 제공사 서명 규격을 Edge Function 골격에 연결
4. 운영자 정보와 정책 문서의 출시 전 자리표시자를 실제 정보로 교체
5. [운영 아키텍처](docs/ARCHITECTURE.md)와 [보안 체크리스트](docs/SECURITY-CHECKLIST.md) 검토
6. [출시 체크리스트](docs/RELEASE-CHECKLIST.md)에 따라 웹을 단계적으로 출시

계정 소유자가 해야 할 일은 [외부 설정 목록](docs/EXTERNAL-SETUP.md), 운영 절차는 [운영 런북](docs/OPERATIONS-RUNBOOK.md), 작가 수익 기준은 [정산 정책](docs/AUTHOR-REVENUE-POLICY.md)에 정리했습니다.
