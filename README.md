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

현재 모임 생성·초대 미리보기·참여·상세 조회·코스 계획 API는 실제 DB와 연동되어
동작합니다. 첫 만남 장소 검색
(`GET /api/v1/places/first-meeting?q=강남`)은 Kakao Local API를 사용하며,
`KAKAO_REST_API_KEY`가 없으면 `503`을 반환합니다.

모임 참여 흐름은 다음 API를 사용합니다.

- `POST /api/v1/meetings`: 모임 생성 및 방장 참여
- `POST /api/v1/meetings/invitation/preview`: 초대 코드 미리보기
- `POST /api/v1/meetings/join`: 게스트 참여 및 참여자 토큰 발급
- `GET /api/v1/meeting/:meetingId`: 참여자 전용 모임 상세 조회
- `GET|PUT /api/v1/meetings/:meetingId/course-plan`: 코스 계획 조회·수정

코스 계획 수정은 응답의 `version`을 요청에 포함하는 낙관적 동시성 제어를
사용합니다. 다른 사용자가 먼저 저장하면 `409 Conflict`가 반환됩니다.

주변 장소 검색
(`GET /api/v1/places/search?meetingId=123&accessToken=...`)은 PostGIS가 설치된 PostgreSQL의
로컬 장소 데이터만 조회합니다. migration은 다음 명령으로 실행합니다.

```bash
pnpm migration:run
```

`DB_SYNCHRONIZE=false` 환경에서는 migration을 먼저 실행해야 하며, 장소 검색은
외부 Kakao·Google API를 fallback으로 호출하지 않습니다.

모임 생성 시 장소 수집 작업이 PostgreSQL에 등록되고, 별도
`momo-place-sync-worker`가 Google Places Nearby Search로 기본 장소 정보를
수집합니다. Worker가 수집한 데이터는 `(source, provider_place_id)`로 중복을
제거하며, 동일한 1km coverage tile은 30일 동안 재사용합니다. Worker를
사용하려면 `GOOGLE_PLACES_API_KEY`를 API와 Worker가 함께 읽는 Secret에
설정해야 합니다.

이번 단계의 Google 수집 범위는 장소 기본 정보이며, 이미지와 리뷰 요약은
허가된 소스와 저장 정책이 확정된 후 별도 Worker로 추가합니다.

Kubernetes PostgreSQL은 PostGIS 확장이 포함된 arm64 이미지를 사용해야 합니다.
기존 `postgres:17-alpine` 이미지는 확장을 제공하지 않으므로, 이미지 교체와
백업 검증 후 migration을 실행해야 합니다. 공식 PostGIS Dockerfile과 초기화
스크립트는 `.github/workflows/postgis-image.yml`에서 특정 커밋으로 고정해
네이티브 `ubuntu-24.04-arm` runner에서 빌드하고 내부 GHCR에 게시합니다.

PostGIS 배포 순서는 다음과 같습니다.

1. 기존 PostgreSQL 백업이 정상 생성되는지 확인합니다.
2. PostGIS 이미지 workflow가 `17-3.5.7-arm64-2bcd236e3af9ec6e668db51eb37162a79f0eaeaa` 태그를 게시했는지 확인합니다.
3. Argo CD가 PostgreSQL StatefulSet을 새 이미지로 교체하도록 합니다. 기존 PVC는 삭제하지 않습니다.
4. DB 연결 환경 변수를 설정한 상태에서 `pnpm migration:run`을 실행합니다.
5. `SELECT PostGIS_Version();`와 `pnpm migration:show`로 확장과 migration 상태를 확인합니다.

로컬에서 production build 결과를 사용해 migration을 실행할 때는 먼저
`pnpm build`를 수행한 뒤 `pnpm migration:run:prod`를 사용합니다. Kubernetes
컨테이너 안에서는 `node node_modules/typeorm/cli.js migration:run -d
dist/database/data-source.js`를 실행합니다. 기존 DB가
동기화 방식으로 생성되어 migration 이력이 없다면 초기 스키마 migration을
먼저 운영 DB에 적용할 수 있는지 확인한 뒤 PostGIS migration을 실행해야 하며,
운영 DB의 PVC나 데이터를 삭제해 migration을 맞추면 안 됩니다.
