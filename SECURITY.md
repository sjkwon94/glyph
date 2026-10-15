# 보안 정책

취약점은 공개 이슈가 아니라 저장소 보안 탭의 **Private vulnerability reporting**으로 제보해 주세요. 운영 전 GitHub 저장소 설정에서 해당 기능을 켜야 합니다.

다음 정보는 저장소·브라우저 번들·로그에 넣지 않습니다.

- Supabase `service_role` 키
- 결제사 시크릿 키와 웹훅 서명 키
- 광고 사업자 SSV 서명 키
- 개인식별정보, 카드번호, 비밀번호 원문

운영 원칙은 [보안 체크리스트](docs/SECURITY-CHECKLIST.md)를 따릅니다.
