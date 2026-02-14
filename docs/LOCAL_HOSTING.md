# Local Hosting Guide (Ground-Up Rebuild)

This guide assumes you want to run and iterate on the app entirely on your own machine/server, with no AWS dependencies.

## 1) Prerequisites

- Docker + Docker Compose plugin
- 8 GB RAM recommended (ML model downloads can be heavy on first boot)
- Optional: Python 3.11 + Node 20 for non-container workflows

## 2) One-command clean rebuild

```bash
./scripts/rebuild-local.sh
```

What the script does:
1. Creates `.env` from `.env.example` if missing.
2. Stops and removes old containers + volumes.
3. Rebuilds and starts the local stack using:
   - `docker-compose.yml`
   - `docker-compose.local.yml`
4. Waits for backend health check.
5. Runs Alembic migrations.
6. Seeds starter data.

## 3) Local endpoints

- Frontend (Vite dev): `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`
- Adminer DB UI: `http://localhost:8080`
  - System: `PostgreSQL`
  - Server: `db`
  - User/Password/Database: from `.env`

## 4) Alternative run mode (production-like)

If you only want a static frontend served via Nginx (no hot reload):

```bash
docker compose up --build
```

Frontend will be available at `http://localhost:3000`.

## 5) Daily development commands

```bash
# Start stack

docker compose -f docker-compose.yml -f docker-compose.local.yml up -d

# View logs

docker compose -f docker-compose.yml -f docker-compose.local.yml logs -f backend

# Stop stack

docker compose -f docker-compose.yml -f docker-compose.local.yml down
```

## 6) Notes on legacy AWS files

The `terraform/` directory and AWS deployment workflows are kept for historical reference and can be removed later if your team fully commits to local/self-hosted operations.
