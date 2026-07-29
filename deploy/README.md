# k3s GitOps deployment

운영 대상은 OCI의 **k3s 클러스터**다. ArgoCD는 이 레포를 직접 감시해 표준 Kubernetes 매니페스트를
k3s에 반영한다. 팀원은 `atlas-infra`가 아니라 이 디렉터리만 수정한다.

| Branch | Kustomize overlay | k3s namespace | Public hostname |
|---|---|---|---|
| `develop` | `k8s/overlays/develop` | `dnd-15th-3-dev` | `momo-dev.jinmu.me` |
| `main` | `k8s/overlays/main` | `dnd-15th-3` | `momo.jinmu.me` |

`image.yml`은 arm64 이미지를 GHCR에 push한 뒤, 같은 브랜치의 overlay `newTag`를
불변 SHA 태그로 갱신한다. ArgoCD가 그 커밋을 감지해 배포한다.

## Secrets

평문 `.env`나 Secret yaml은 커밋하지 않는다. SealedSecret이 필요한 경우에는
`sealed-secrets.pub.pem`으로 암호화한 결과만 `k8s/overlays/<environment>/`에 커밋한다.

```sh
kubeseal --format=yaml --cert deploy/sealed-secrets.pub.pem \
  < secret.plain.yaml > deploy/k8s/overlays/develop/secret.sealed.yaml
rm secret.plain.yaml
```

DB나 Redis를 실제로 코드에서 사용하기 전에는 관련 Secret, PVC, Deployment를 추가하지 않는다.
