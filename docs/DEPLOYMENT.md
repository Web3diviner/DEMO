# Deployment

Skylora ships as a self-contained container image. CI proves every commit, and CD publishes a
runnable image to **GitHub Container Registry (GHCR)** on every green push to `main`.

## Pipeline at a glance

```
push / PR ─▶ CI (.github/workflows/ci.yml)
              typecheck · lint · format · unit tests · build · e2e
                                   │  success on main
                                   ▼
            CD (.github/workflows/cd.yml)
              build Docker image (output: standalone)
              push ghcr.io/web3diviner/demo:{latest,<sha>}
                                   │
                                   ▼
              deploy → notify DEPLOY_WEBHOOK_URL (if configured)
```

- **CI** runs on every push and pull request. It is the quality gate.
- **CD** is triggered by a _successful_ CI run on `main` (`workflow_run`), so a red build never
  ships. It can also be run manually (`workflow_dispatch`) for re-runs or rollbacks.
- Images are tagged `latest`, the long commit SHA, and the short SHA — pin to a SHA in production
  and roll back by redeploying a previous one.

## Run the image

```sh
docker run -p 3000:3000 ghcr.io/web3diviner/demo:latest
# health: curl localhost:3000/api/health  ->  {"status":"ok",...}
```

The image runs Next.js in `standalone` mode as a non-root user on port `3000`, with a built-in
`HEALTHCHECK` against `/api/health`.

## Configuration (runtime env)

Set these on your host; defaults point at placeholder origins for the mock-backed build.

| Variable                    | Purpose                                                          |
| --------------------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_API_ORIGIN`    | Backend API origin (also allow-listed in the CSP `connect-src`). |
| `NEXT_PUBLIC_MEDIA_ORIGIN`  | Media/CDN origin for video + images.                             |
| `NEXT_PUBLIC_UPLOAD_ORIGIN` | Resumable-upload (tus) endpoint origin.                          |
| `NEXT_PUBLIC_USE_MOCK`      | `false` to hit the real API instead of the in-app mock.          |
| `PORT`                      | Listen port (default `3000`).                                    |

> Public origins are baked into the client bundle at **build** time. To point at real backends,
> set them as build args/CI variables before `pnpm build`, not just at container runtime.

## Enabling automatic rollout

The `deploy` job calls a generic webhook so it works with any host (Cloud Run, Render, Coolify,
Fly, a VPS pull-and-restart hook, etc.):

1. Add a repo secret **`DEPLOY_WEBHOOK_URL`** (Settings → Secrets and variables → Actions).
2. On each deploy it receives `POST {"image": "...", "digest": "..."}`.

With no secret set, the image still publishes to GHCR — only the host notification is skipped.

Optional hardening: add required reviewers to the **`production`** GitHub Environment to turn the
auto-deploy into a manual-approval promotion without touching the workflow.
