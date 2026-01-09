# HelixCRM Deployment Guide

## Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15 (via Docker)
- Redis 7 (via Docker)

## Local Deployment
1. Clone repository
2. Run: `.\dev.ps1 docker-up`
3. Run: `cd apps/api && npm install && npm run start:dev`
4. Verify: `http://localhost:3000/health`

## Production Notes
- Set environment variables in `.env`
- Use `npm run build` then `node dist/main.js`
- Configure reverse proxy (Nginx, Apache)
- Set up SSL certificates