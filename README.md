# dnd-15th-3-backend

DND 15기 3조 백엔드

## 📖 Docs

팀 컨벤션과 개발 문서는 [GitHub Wiki](https://github.com/dnd-side-project/dnd-15th-3-backend/wiki)에서 관리합니다.

## LLM 설정

기본 provider는 Cloudflare Workers AI이며 기본 모델은
`@cf/meta/llama-3.3-70b-instruct-fp8-fast`입니다.

`.env`에 `CLOUDFLARE_ACCOUNT_ID`와 `CLOUDFLARE_API_TOKEN`을 설정합니다.
Cloudflare 대신 NVIDIA NIM을 사용하려면 `LLM_PROVIDER=nvidia`로 설정하고
기존 `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` 값을 사용합니다.

Cloudflare Promptfoo live 테스트는 다음 명령으로 실행합니다.

```bash
pnpm run test:prompt:cloudflare
```
