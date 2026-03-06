# Mini Strava Dashboard

배포 주소: https://mini-strava-dashboard-codex.vercel.app/?strava=connected

## Vercel 배포 안내
- 위 URL은 현재 Vercel에 배포된 서비스 주소입니다.
- `?strava=connected` 쿼리는 Strava OAuth 연결 성공 후 리다이렉트된 상태를 확인하기 위한 값입니다.
- 운영 환경(Vercel)에서는 아래 환경 변수를 반드시 설정해야 Strava API가 정상 동작합니다.
  - `NEXT_PUBLIC_STRAVA_CLIENT_ID`
  - `STRAVA_CLIENT_SECRET`
  - `STRAVA_REDIRECT_URI`
  - `STRAVA_SCOPES` (선택)
  - `STRAVA_API_BASE_URL` (선택, 기본값: `https://www.strava.com/api/v3`)

## 최근 활동 목록 API

### Endpoint
`GET /api/activities/recent`

### 동작
- 서버에서만 Strava API(`GET /athlete/activities`)를 호출합니다.
- 최근 활동 20개를 조회한 뒤, 프론트엔드에서 사용하기 쉬운 형태로 변환하여 반환합니다.
- 세션 토큰이 없으면 401 에러를 반환합니다.
- 액세스 토큰이 만료된 경우 refresh token으로 갱신을 시도하고, 실패 시 401 에러를 반환합니다.

### 성공 응답 예시
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": 1234567890,
        "name": "Morning Run",
        "type": "Run",
        "distance": 8200.5,
        "moving_time": 2875,
        "elapsed_time": 3012,
        "start_date": "2026-03-05T22:13:50Z",
        "start_latlng": [
          37.5511,
          126.9882
        ],
        "map": {
          "summary_polyline": "abcdEFGH..."
        }
      }
    ]
  }
}
```

### 에러 응답 형식
```json
{
  "success": false,
  "error": {
    "code": "STRAVA_TOKEN_MISSING",
    "message": "Strava access token is missing. Please connect your account first."
  }
}
```
