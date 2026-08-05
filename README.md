# dnd-15th-3-backend

DND 15기 3조 백엔드

## 📖 Docs

팀 컨벤션과 개발 문서는 [GitHub Wiki](https://github.com/dnd-side-project/dnd-15th-3-backend/wiki)에서 관리합니다.

## 프론트엔드 화면 개발용 Mock API

로컬 DB 없이 Figma 화면을 구현하려면 아래처럼 실행합니다.

```bash
mise run mock-api
```

Mock 모드에서는 DB·OCI 스토리지를 초기화하지 않으며, Swagger(`http://localhost:3000/api/docs`)와 고정 fixture를 제공합니다.

일반 서버는 `mise run dev-api`로 실행하며, dev PostgreSQL port-forward와 Kubernetes Secret 기반 DB 인증을 함께 설정합니다. DB client만 연결할 때는 `mise run db-forward-dev`를 사용합니다. 프로덕션 환경의 빌드·실행은 `mise run prod-api`로 실행하며, DB·OCI 관련 환경 변수가 설정된 배포 환경에서 사용합니다.

- `GET /api/profile-avatars`: 프로필 캐릭터 목록
- `GET /api/meeting-types`, `GET /api/categories`, `GET /api/places/search?keyword=성수`: 모임 생성 입력 화면
- `POST /api/meetings/invitation/preview` (`{ "accessToken": "DNDFOR" }`): 초대 코드 검증 및 모임 미리보기
- `GET /api/meeting/1?accessToken=host-session-token`: 방장용 모임 상세 화면
- `GET /api/meeting/1?accessToken=member-session-token`: 참여원용 모임 상세 화면

`DNDFOR`는 유효한 fixture 초대 코드이며, 다른 코드는 `404`를 반환합니다. `host-session-token`과 `member-session-token`은 참여자별 재접속 토큰입니다. 생성·참여 요청은 데이터를 저장하지 않고 성공 화면용 고정 응답을 반환합니다.
