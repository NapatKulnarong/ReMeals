# syntax=docker/dockerfile:1
# Backend (Django + Python)
FROM python:3.12-slim AS backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        netcat-traditional \
        fontconfig \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ /app/backend/

EXPOSE 8000

CMD ["sh", "-c", "fc-cache -f >/dev/null 2>&1 || true && python manage.py runserver 0.0.0.0:8000"]

# Frontend (Next.js + Node)
FROM node:20-slim AS frontend

WORKDIR /app/frontend

ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends fontconfig \
    && rm -rf /var/lib/apt/lists/*

COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ .

EXPOSE 3000

CMD ["sh", "-c", "npm install --no-audit --no-fund && npm run dev -- -H 0.0.0.0"]
