# 💳 사주꿈 결제(토스페이먼츠) + AI 전문가 풀이 설정 가이드

2,900원 유료 상세 풀이(사주·꿈해몽)를 켜기 위한 설정입니다.
결제가 승인되면 **Claude(claude-opus-4-8)** 가 사용자가 고른 언어(50+개)로
**깊이 있는 AI 전문가 풀이**를 생성해 보여줍니다.
**구조: Cloudflare Pages(사이트) + Pages Functions(결제 승인 + AI 풀이 서버) + 토스페이먼츠 + Claude API**

> 🌐 **언어 50+개**: 상단 언어 선택창에 64개 언어가 있습니다. 무료 화면(사주 계산·꿈해몽 사전)은
> 한국어·English·日本語·中文로 표시되고(그 외 언어는 영어로 폴백), **유료 AI 전문가 풀이는
> 선택한 언어 그대로 원어민처럼** 생성됩니다. (아랍어·히브리어 등은 자동 우→좌 정렬)

---

## 1. 토스페이먼츠 키 발급
1. <https://developers.tosspayments.com> 로그인 → **내 개발정보**
2. **클라이언트 키**와 **시크릿 키**를 확인 (테스트/실결제 각각 존재)
   - 클라이언트 키: `test_ck_...` / `live_ck_...`  → **프론트에 넣음(공개 OK)**
   - 시크릿 키: `test_sk_...` / `live_sk_...`  → **서버에만! 절대 코드/깃허브에 넣지 말 것**

## 2. 클라이언트 키 넣기 (pay.js)
`pay.js` 맨 위:
```js
const TOSS_CLIENT_KEY = "test_ck_YOUR_TOSS_CLIENT_KEY"; // ← 여기에 본인 클라이언트 키
```
→ 발급받은 **클라이언트 키**로 교체.

## 3. Cloudflare Pages로 배포
1. Cloudflare → **Workers & Pages → Create → Pages**
2. **Connect to Git** (parkkweonje/virtualspace) 또는 **Upload assets**(이 폴더 통째로 업로드)
   - 빌드 명령: 없음 / 출력 디렉토리: `/` (루트)
   - `functions/` 폴더가 있으면 Pages가 자동으로 서버 함수로 인식합니다.
3. 배포 완료 후 **Settings → Environment variables** 에 추가:
   ```
   TOSS_SECRET_KEY   = (토스 시크릿 키, test_sk_... 또는 live_sk_...)
   ANTHROPIC_API_KEY = (Claude API 키, sk-ant-...)   ← AI 전문가 풀이용
   ```
   → 저장 후 **재배포(Retry deployment)**
   - `ANTHROPIC_API_KEY` 는 <https://console.anthropic.com> → API Keys 에서 발급.
   - **두 키 모두 서버 환경변수로만** 두세요. 코드/깃허브에 절대 넣지 마세요.

### 💡 AI 풀이 비용 안내
- AI 전문가 풀이는 결제(2,900원)가 **실제 승인된 경우에만** 호출됩니다
  (서버가 paymentKey를 토스에 재조회해 DONE·2,900원인지 확인 → 무료 남용 방지).
- 풀이 1건당 Claude API 요금(대략 수십~수백 원)이 발생합니다. 판매가(2,900원) 안에서
  충분히 남는 구조지만, 원가가 걱정되면 `functions/api/reading.js` 의 `MODEL` 을
  `claude-sonnet-5` 등 더 저렴한 모델로 바꿔도 됩니다(기본값: `claude-opus-4-8`).

## 4. 도메인 연결
- 이 Pages 프로젝트 → **Custom domains** → `www.sajukkum.com` 추가
- (기존 옛 Worker 도메인 연결은 이미 제거됨)

## 5. 테스트
1. 사이트에서 사주/꿈 풀이 실행 → **"2,900원 결제하고 자세히 보기"** 클릭
2. 토스 **테스트 결제창**에서 테스트 카드로 결제
3. 결제 성공 → `/success.html` → 서버 승인(`/api/confirm`) → **상세 풀이 해제**
4. 잘 되면 토스 키를 **실결제(live_) 키**로 바꾸고, 토스 관리자에서 실결제 계약을 완료

---

## 파일 구조
```
index.html, style.css, saju.js, i18n.js   # 사이트(64개 언어 선택)
pay.js                                     # 결제 프론트 + 프리미엄 잠금 + AI 풀이 호출
dream.js                                   # 내 꿈 자유서술 풀이 + 로또번호
success.html, fail.html                    # 결제 완료/실패 페이지
functions/api/confirm.js                   # 결제 승인 서버(토스 시크릿 키)
functions/api/reading.js                   # AI 전문가 풀이 서버(Claude + 결제 재검증)
ads.txt, robots.txt, sitemap.xml
```

## 주의(법·정책)
- 실결제 서비스는 **전자상거래법상 표시**(사업자정보, 환불정책, 이용약관)가 필요합니다.
- 유료 콘텐츠는 "재미로 보는 운세"임을 명시하고, 환불 기준을 안내하세요.
- 시크릿 키는 **환경변수로만** — 코드/깃허브에 올리면 안 됩니다.
