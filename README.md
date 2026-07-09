# UzLab

The official digital platform for UzLab — membership, technical committee,
publications, equipment, career listings, and a cross-module global search.

See [CLAUDE.md](CLAUDE.md) for architecture conventions and how to run this
locally, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the reasoning
behind the stack, and [docs/ROADMAP.md](docs/ROADMAP.md) for the phased
build plan.

## Quick start

```bash
docker compose up -d
npm install
cp .env.example apps/api/.env   # then fill in real secrets
npm run prisma:migrate
npm run dev:api                  # http://localhost:4000/api
npm run dev:web                  # http://localhost:3000
```
