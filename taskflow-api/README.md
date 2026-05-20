# TaskFlow API — Backend Developer Intern Assignment

> **Scalable REST API with JWT Authentication, Role-Based Access Control & Full CRUD**  
> Built with Node.js · Express · In-Memory DB (PostgreSQL-ready schema) · Swagger Docs

---

## Quick Start (< 2 minutes)

```bash
# 1. Clone and install
cd backend
npm install

# 2. Run (uses in-memory DB, no setup needed)
npm start
# → API at http://localhost:5000
# → Swagger docs at http://localhost:5000/api-docs

# 3. Open frontend
# Open frontend/index.html in your browser
```

**Seeded admin account:**
- Email: `admin@taskflow.com`  
- Password: `Admin@123`

---

## Project Structure

```
taskflow-api/
├── backend/
│   ├── src/
│   │   ├── server.js              # Express app setup, middleware
│   │   ├── config/
│   │   │   └── jwt.config.js      # JWT generation & verification helpers
│   │   ├── controllers/
│   │   │   ├── auth.controller.js # Register, login, refresh, logout, me
│   │   │   ├── task.controller.js # Full CRUD for tasks
│   │   │   └── user.controller.js # Admin: user management
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js # JWT authenticate + RBAC authorize
│   │   │   └── error.middleware.js# Validation + global error handler
│   │   ├── models/
│   │   │   └── database.js        # In-memory DB (PostgreSQL schema-ready)
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── task.routes.js
│   │   │   └── user.routes.js
│   │   └── validators/
│   │       ├── auth.validator.js  # express-validator rules
│   │       └── task.validator.js
│   ├── docs/
│   │   └── swagger.yaml           # OpenAPI 3.0 spec
│   └── package.json
├── frontend/
│   └── index.html                 # Single-file React-like UI
└── README.md
```

---

## API Reference (v1)

Base URL: `http://localhost:5000/api/v1`

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ✗ | Register new user |
| POST | `/auth/login` | ✗ | Login, get JWT tokens |
| GET | `/auth/me` | ✓ | Current user profile |
| POST | `/auth/refresh` | ✗ | Rotate refresh token |
| POST | `/auth/logout` | ✗ | Revoke refresh token |

### Tasks (CRUD)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/tasks` | ✓ | user/admin | Get tasks (own/all) + filter + paginate |
| POST | `/tasks` | ✓ | user/admin | Create task |
| GET | `/tasks/:id` | ✓ | user/admin | Get task by ID |
| PUT | `/tasks/:id` | ✓ | user/admin | Update task |
| DELETE | `/tasks/:id` | ✓ | user/admin | Delete task |
| PATCH | `/tasks/:id/status` | ✓ | user/admin | Quick status update |

### Users (Admin Only)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/users` | ✓ | admin | List all users |
| GET | `/users/:id` | ✓ | admin/self | Get user by ID |
| PUT | `/users/:id/role` | ✓ | admin | Update user role |
| DELETE | `/users/:id` | ✓ | admin | Delete user |

---

## PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(50)  NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  role        VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);

-- Tasks table
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(100) NOT NULL,
  description TEXT,
  status      VARCHAR(20)  NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','in_progress','completed','cancelled')),
  priority    VARCHAR(10)  NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low','medium','high')),
  due_date    TIMESTAMPTZ,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status  ON tasks(status);

-- Refresh tokens table (for token rotation / revocation)
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
```

### To switch to real PostgreSQL

```bash
npm install pg
```

Replace `models/database.js` with a `pg.Pool` connection:

```js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
module.exports = pool;
```

Then update controllers to use `pool.query(sql, params)`.

---

## Security Practices

| Practice | Implementation |
|----------|----------------|
| Password hashing | bcryptjs, cost factor 12 |
| JWT access tokens | 15-minute expiry, signed HS256 |
| Refresh token rotation | Old token revoked on each refresh |
| Token storage | Refresh tokens stored as SHA-256 hash |
| Input sanitization | express-validator + `.escape()` |
| RBAC | `authorize('admin')` middleware per route |
| Security headers | Helmet.js (XSS, HSTS, etc.) |
| CORS | Configurable origin whitelist |
| Rate limiting | Add `express-rate-limit` for production |

---

## Environment Variables

```env
PORT=5000
JWT_SECRET=your_super_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
DATABASE_URL=postgresql://user:pass@localhost:5432/taskflow
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

---

## Scalability Note

### Current Architecture
Stateless JWT auth + clean module separation allows horizontal scaling from day 1.

### Path to Production Scale

**1. Database**
- PostgreSQL with connection pooling (`pg-pool`, min 5 / max 20 connections)
- Read replicas for GET-heavy traffic
- Indexes on `user_id`, `status`, `email`

**2. Caching (Redis)**
```
GET /tasks → cache per user_id, TTL 60s
GET /users/:id → cache per id, TTL 5min
Invalidate on write (create/update/delete)
```

**3. Horizontal Scaling**
- Stateless app → deploy N instances behind Nginx/ALB
- JWT decoded in-process, no shared session store needed
- Refresh tokens in shared Redis/DB (already hashed)

**4. Microservices (future)**
```
API Gateway → Auth Service (JWT issue/verify)
           → Task Service (CRUD)
           → User Service (profiles)
           → Notification Service (email/push)
```

**5. Infrastructure**
```
Docker → Kubernetes (HPA on CPU/RPS)
CI/CD: GitHub Actions → build → test → deploy
Monitoring: Prometheus + Grafana
Logging: Winston → CloudWatch / Datadog
```

**6. Docker Compose (ready to run)**
See `docker-compose.yml` for multi-container setup.

---

## Docker

```yaml
# docker-compose.yml
version: '3.9'
services:
  api:
    build: ./backend
    ports: ['5000:5000']
    environment:
      DATABASE_URL: postgresql://postgres:pass@db:5432/taskflow
      JWT_SECRET: change_in_production
    depends_on: [db]

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: taskflow
      POSTGRES_PASSWORD: pass
    volumes: [pgdata:/var/lib/postgresql/data]

volumes:
  pgdata:
```

```bash
docker-compose up --build
```

---

## API Versioning

Routes are versioned under `/api/v1/`. Adding v2:

```js
app.use('/api/v2/tasks', require('./routes/v2/task.routes'));
```

Both versions coexist. Clients migrate at their own pace.

---

## Example Requests

```bash
# Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email":"jane@test.com","password":"Test@1234"}'

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -d '{"email":"admin@taskflow.com","password":"Admin@123"}'

# Create task (replace TOKEN)
curl -X POST http://localhost:5000/api/v1/tasks \
  -H "Authorization: Bearer TOKEN" \
  -d '{"title":"Ship the feature","priority":"high","status":"in_progress"}'

# Get all tasks
curl http://localhost:5000/api/v1/tasks \
  -H "Authorization: Bearer TOKEN"
```

---

*Built for Primetrade.ai Backend Developer Intern Assignment*
