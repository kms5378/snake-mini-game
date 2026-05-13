# Snake Mini Game

Vercel 배포를 목표로 만든 Next.js 기반 Snake 게임입니다. 게임 종료 후 닉네임과 점수를 제출하면 Upstash Redis에 글로벌 랭킹으로 저장됩니다.

## Tech Stack

- Next.js App Router
- TypeScript
- Canvas 기반 게임 화면
- Upstash Redis 랭킹 저장
- Vitest 단위 테스트

## Local Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

`.env.local`에는 Upstash Redis REST 값을 설정합니다.

```bash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

환경변수가 없으면 로컬 개발용 메모리 저장소로 동작하지만, Vercel 배포에서 랭킹을 유지하려면 Upstash Redis가 필요합니다.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

## Git Remote

```bash
git remote add origin https://github.com/kms5378/snake-mini-game.git
git push -u origin main
```
