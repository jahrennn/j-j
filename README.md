# Jahren & John LPG Trading

Web app for managing LPG refill and tank sales, inventory, and business settings.

## Stack

- **Frontend:** React 19, Vite, Tailwind CSS
- **Backend:** Java 21, Spring Boot 3, Spring Security (JWT)
- **Database:** PostgreSQL 16 (Docker)

## Prerequisites

Install once on macOS:

```bash
brew install openjdk@21 maven colima docker docker-compose
colima start
```

Add Java to your shell profile if needed:

```bash
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
```

## Local development

### 1. Start PostgreSQL

```bash
docker compose up -d
```

Database credentials (local dev only):

| Setting  | Value   |
|----------|---------|
| Host     | localhost:5432 |
| Database | jjlpg   |
| User     | jjlpg   |
| Password | jjlpg   |

### 2. Start the backend

```bash
cd backend
mvn spring-boot:run
```

API runs at `http://localhost:8080/api`.

### 3. Start the frontend

```bash
cp .env.example .env   # if .env does not exist yet
pnpm install
pnpm dev
```

App runs at `http://localhost:3000`.

### Default login

| Username | Password  |
|----------|-----------|
| admin    | admin123  |

## Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Frontend API base URL (default: `http://localhost:8080/api`) |
| `JWT_SECRET` | Backend JWT signing secret (optional in dev) |

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Sign in |
| GET | `/sales` | JWT | Sales report (optional `startDate`, `endDate`) |
| GET | `/inventory` | JWT | Product stock list |
| GET | `/settings` | JWT | Business profile and username |
| PUT | `/settings` | JWT | Update profile and optional password |

## Project structure

```
├── src/                  # React frontend
├── backend/              # Spring Boot API
├── docker-compose.yml    # PostgreSQL for local dev
└── .env.example          # Frontend env template
```
