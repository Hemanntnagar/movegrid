#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}/backend"
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:?}"
