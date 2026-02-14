#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

echo "Stopping existing stack and removing local volumes..."
docker compose -f docker-compose.yml -f docker-compose.local.yml down -v

echo "Building and starting local development stack..."
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build

echo "Waiting for backend to become healthy..."
for i in {1..60}; do
  if curl -sf http://localhost:8000/health >/dev/null; then
    echo "Backend is ready"
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    echo "Backend health check timed out" >&2
    exit 1
  fi
  sleep 2
done

echo "Applying database migrations..."
docker compose -f docker-compose.yml -f docker-compose.local.yml exec -T backend alembic upgrade head

echo "Seeding starter data..."
docker compose -f docker-compose.yml -f docker-compose.local.yml exec -T backend python /data/scripts/seed_db.py

echo "Local rebuild complete."
echo "Frontend:  http://localhost:5173"
echo "Backend:   http://localhost:8000"
echo "API docs:  http://localhost:8000/docs"
echo "Adminer:   http://localhost:8080"
