# NOCT 광고 관리 대시보드

1인 운영자를 위한 메타 광고 자동 모니터링 시스템입니다.

## 무엇을 해주나?

- **실시간 지표 조회**: ROAS, CTR, CPC, 빈도, LP 조회율 등 모든 지표를 한 화면에
- **자동 알림**: ROAS 손익분기 미달, 빈도 초과, CTR 급락 등 이상 감지 시 즉시 표시
- **지표별 설명**: 각 지표가 왜 중요한지, 지금 뭘 해야 하는지까지 설명
- **일일 자동 체크**: 매일 오전 9시 지표를 확인하고 문제 있을 때만 알림 발송
- **1인 운영 루틴**: 매일/주 1회/월 1회 체크리스트

---

## 배포 방법 (Vercel, 무료)

### 1단계: 코드 GitHub에 올리기

```bash
# GitHub에 새 repository 생성 후
git init
git add .
git commit -m "init"
git remote add origin https://github.com/내계정/noct-ads.git
git push -u origin main
```

### 2단계: Vercel 배포

1. [vercel.com](https://vercel.com) 접속 → GitHub 계정으로 로그인
2. "New Project" → 방금 만든 repository 선택
3. 그냥 Deploy 클릭 (Next.js 자동 감지)

### 3단계: 환경변수 설정

Vercel 프로젝트 → Settings → Environment Variables에 아래 값 입력:

```
META_ACCESS_TOKEN      = 메타 액세스 토큰 (아래 발급 방법 참고)
META_AD_ACCOUNT_ID     = act_123456789 (광고 계정 ID)
KAKAO_ACCESS_TOKEN     = 카카오 토큰 (선택)
CRON_SECRET            = 아무 랜덤 문자열 (예: mySecret123)
```

환경변수 설정 후 Vercel에서 Redeploy 한 번 해주면 완료.

---

## 메타 액세스 토큰 발급 방법

1. [developers.facebook.com](https://developers.facebook.com) 접속
2. 내 앱 → 앱 만들기 → "비즈니스" 선택
3. 앱 만들고 나서: 도구 → 그래프 API 탐색기
4. 오른쪽 상단 "사용자 토큰 생성" 클릭
5. 권한에서 `ads_read`, `read_insights` 체크 후 토큰 생성
6. 생성된 토큰을 META_ACCESS_TOKEN에 입력

> ⚠️ 기본 토큰은 1시간 후 만료됩니다. 장기 토큰으로 교환하려면:
> `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=앱ID&client_secret=앱시크릿&fb_exchange_token=단기토큰`
> 브라우저에서 호출하면 60일짜리 토큰을 받을 수 있습니다.

## 광고 계정 ID 찾기

메타 비즈니스 관리자 → 광고 계정 → 계정 설정에서 "광고 계정 ID" 확인
`act_` 를 앞에 붙여서 입력 (예: `act_1234567890`)

---

## 카카오 알림 설정 (선택)

1. [developers.kakao.com](https://developers.kakao.com) → 내 앱 → 앱 만들기
2. 플랫폼 → 웹 → 사이트 도메인에 Vercel URL 입력
3. 카카오 로그인 활성화
4. [developers.kakao.com/tool/rest-api/open/get/v2-user-me](https://developers.kakao.com/tool/rest-api/open/get/v2-user-me) 에서 액세스 토큰 발급

---

## 로컬에서 개발/테스트

```bash
npm install
cp .env.example .env.local
# .env.local에 값 입력 (없어도 목 데이터로 동작)
npm run dev
# http://localhost:3000 에서 확인
```

환경변수 없으면 이어플러그 캠페인 실제 데이터가 목 데이터로 자동 로드됩니다.

---

## 파일 구조

```
noct-ads/
├── pages/
│   ├── index.tsx          # 메인 대시보드
│   └── api/
│       ├── campaigns.ts   # 메타 API 호출 + 알림 생성
│       └── daily-check.ts # Vercel Cron — 매일 9시 자동 실행
├── lib/
│   ├── types.ts           # 타입 정의 + 지표 설명 사전
│   ├── calc.ts            # 손익 계산 유틸
│   ├── meta.ts            # 메타 Graph API 클라이언트
│   └── alerts.ts          # 알림 감지 엔진
├── styles/
│   └── globals.css
└── vercel.json            # Cron 스케줄 설정
```

---

## 다음 개선 계획

- [ ] 상품 원가/판매가 UI에서 직접 수정
- [ ] 3D 안대 상품 추가
- [ ] 주간 성과 트렌드 차트
- [ ] 테스트 기록 저장 (Vercel KV 사용)
- [ ] 카카오 알림 → 텔레그램 봇으로 확장
