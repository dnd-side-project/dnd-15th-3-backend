# dnd-15th-3-backend

DND 15기 3조 백엔드

## 📖 Docs

팀 컨벤션과 개발 문서는 [GitHub Wiki](https://github.com/dnd-side-project/dnd-15th-3-backend/wiki)에서 관리합니다.

## API 계약과 프론트엔드 Mocking

Swagger UI는 `http://localhost:3000/api/v1/docs`, OpenAPI JSON은
`http://localhost:3000/api/v1/docs-json`에서 확인할 수 있습니다. 프론트엔드는
이 계약의 요청·응답 타입과 예시를 기준으로 MSW 등의 방식으로 화면용 mocking을
구성합니다. 백엔드는 화면 개발용 fixture 서버를 제공하지 않습니다.

일반 서버는 `mise run dev-api`로 실행하며, dev PostgreSQL port-forward와
Kubernetes Secret 기반 DB 인증을 함께 설정합니다. DB client만 연결할 때는
`mise run db-forward-dev`를 사용합니다. 프로덕션 환경의 빌드·실행은
`mise run prod-api`로 실행하며, DB·OCI 관련 환경 변수가 설정된 배포 환경에서
사용합니다.

현재 모임·카탈로그의 DB 의존 API는 계약 문서만 제공하고 실제 데이터 연동 전까지
`501 Not Implemented`를 반환합니다. 첫 만남 장소 검색
(`GET /api/v1/places/firstmeeting_search?q=강남`)은 Kakao Local API를 사용하며,
`KAKAO_REST_API_KEY`가 없으면 `503`을 반환합니다.
