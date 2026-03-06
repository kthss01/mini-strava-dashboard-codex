# Mini Strava Dashboard

Strava OAuth로 계정을 연결한 뒤, 최근 활동 목록/통계/지도/선택 상세 정보를 한 화면에서 확인할 수 있는 Next.js 대시보드입니다.

## 프로젝트 소개

이 프로젝트는 Strava API를 직접 노출하지 않고, **Next.js App Router의 서버 API 경유 방식**으로 최근 활동 데이터를 안전하게 조회합니다.

주요 목표:
- OAuth 로그인 흐름 학습
- 활동 목록 필터링(종류/기간)
- 통계 카드 및 지도 시각화
- 선택 활동 상세 정보 패널 제공

## 기술 스택

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI**: React 18, Tailwind CSS
- **Map**: Leaflet, React Leaflet
- **Runtime**: Node.js
- **배포**: Vercel (권장)

## 실행 방법

### 1) 의존성 설치

```bash
npm install
```

> 사내/보안 네트워크 정책에 따라 일부 패키지 설치가 차단될 수 있습니다.

### 2) 환경변수 설정

`.env.example`를 참고해 `.env.local` 파일을 생성합니다.

```bash
cp .env.example .env.local
```

### 3) 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 4) 프로덕션 빌드/실행

```bash
npm run build
npm run start
```

## 환경변수 설명

- `NEXT_PUBLIC_STRAVA_CLIENT_ID`
  - Strava 앱의 Client ID
  - 브라우저에서 OAuth 시작 URL 생성 시 사용
- `STRAVA_CLIENT_SECRET`
  - Strava 앱의 Client Secret
  - 서버에서 토큰 교환/갱신 시 사용
- `STRAVA_REDIRECT_URI`
  - Strava OAuth 콜백 URI
  - 예: `http://localhost:3000/api/auth/strava/callback`
- `STRAVA_SCOPES` (선택)
  - 기본값: `read,activity:read_all`
- `STRAVA_API_BASE_URL` (선택)
  - 기본값: `https://www.strava.com/api/v3`

## Strava 앱 설정 방법

1. [Strava API Settings](https://www.strava.com/settings/api) 접속
2. 애플리케이션 생성
3. 다음 정보 확인
   - Client ID
   - Client Secret
4. **Authorization Callback Domain** 설정
   - 로컬 개발: `localhost`
   - 배포: 실제 서비스 도메인
5. `.env.local`에 위 값 반영
6. `STRAVA_REDIRECT_URI`와 Strava 앱 콜백 설정이 정확히 일치하는지 확인

## OAuth 동작 방식 요약

1. 사용자 클릭으로 `/api/auth/strava` 호출
2. 서버가 state를 쿠키로 저장하고 Strava 인증 페이지로 리다이렉트
3. 인증 완료 후 `/api/auth/strava/callback`으로 복귀
4. 서버가 authorization code를 access token/refresh token으로 교환
5. 세션 쿠키(`strava_session`) 저장
6. `/api/activities/recent` 호출 시
   - 세션 유효성 검사
   - 만료 임박/만료면 refresh token으로 갱신
   - Strava 최근 활동 조회 후 필요한 필드만 프론트에 전달

## 주요 기능

- Strava OAuth 연결 버튼
- 최근 활동 리스트 조회
- 종류/기간 필터
- 통계 카드(활동 수, 총 거리, 총 이동 시간, 최근 30일 활동 수)
- 선택 활동 지도 표시(시작점/경로)
- **선택 활동 상세 패널**
  - 활동명
  - 운동 종류
  - 날짜
  - 거리
  - 이동 시간
  - elapsed time
  - 평균 속도(없으면 `-`)
  - 고도 상승(없으면 `-`)

## 개선한 점

- 선택 활동 상세 패널 추가로 지도와 함께 핵심 메타데이터를 바로 확인 가능
- API 응답 파싱/정규화 로직을 `lib/api/recent-activities.ts`로 분리해 클라이언트 컴포넌트 책임 축소
- `distance/time` 포맷터 중복 사용 방식을 정리해 meters/seconds 기반 포맷 함수 사용 일관화
- 날짜 파싱 실패 시 `-`를 반환하도록 포맷 함수 안정성 강화
- 사용되지 않는 `lib/types/strava.ts` 파일 제거

## 남아 있는 한계

- 현재 인증 상태는 헤더 버튼 텍스트에 충분히 반영되지 않음(`isLoggedIn` 자동 판별 미적용)
- 활동 상세 정보는 리스트에서 선택된 단일 활동 기준이며, 비교 뷰는 없음
- 지도 라이브러리 의존성 설치가 차단된 환경에서는 로컬 실행이 제한될 수 있음
- 테스트 코드(단위/통합/E2E)가 아직 없음

## 다음 확장 아이디어

- 주간/월간 트렌드 차트(거리, 시간, 고도)
- 운동 타입별 평균 페이스/속도 비교
- 활동 상세 모달 + Splits/심박/파워(권한 및 데이터 존재 시)
- 인증 상태/토큰 만료 UX 개선(재연결 안내)
- 테스트 자동화 추가 (Vitest/Playwright)
