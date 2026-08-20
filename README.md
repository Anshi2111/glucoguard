# Glucoguard AI — Diabetes Support MVP

A full-stack diabetes management application with glucose tracking, meal logging, insulin documentation, and rule-based risk assessment.

**Status:** Phase 2 Complete - Backend & Database Setup Ready

---

## Project Structure

```
glucoguard/
├── frontend/                    # React frontend (SPA)
│   ├── index.html              # Main app
│   ├── login.html              # Auth page
│   ├── style.css               # Styling
│   ├── app.js                  # Main logic
│   └── ...
├── backend/                    # Node.js + Express API
│   ├── server.js               # Entry point
│   ├── package.json
│   ├── .env.example
│   ├── config/
│   │   └── database.js         # PostgreSQL connection
│   ├── migrations/
│   │   ├── 001_init_schema.js  # Schema definition
│   │   └── run.js              # Migration runner
│   ├── middleware/
│   │   └── auth.js             # JWT verification
│   ├── models/
│   │   ├── User.js
│   │   ├── Glucose.js
│   │   ├── Meal.js
│   │   └── Insulin.js
│   └── routes/                 # (Will be added in Phase 3)
├── .gitignore
└── README.md
```

---

## Prerequisites

### Required Software

- **Node.js** 14+ ([download](https://nodejs.org/))
- **MySQL** 5.7+ ([download](https://dev.mysql.com/downloads/mysql/))
- **npm** (comes with Node.js)

### Verify Installation

```bash
node --version
npm --version
mysql --version
```

---

## Setup Instructions

### 1. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

This installs:
- `express` — Web framework
- `pg` — PostgreSQL driver
- `bcryptjs` — Password hashing
- `jsonwebtoken` — JWT authentication
- `dotenv` — Environment variables
- `cors` — Cross-Origin Resource Sharing
- `body-parser` — Request parsing

### 2. MySQL Database Setup

Create a MySQL database and user:

```bash
# Connect to MySQL (on Windows/Linux with MySQL CLI)
mysql -u root -p

# In MySQL prompt:
CREATE DATABASE glucoguard_dev;
CREATE USER 'glucoguard_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON glucoguard_dev.* TO 'glucoguard_user'@'localhost';
FLUSH PRIVILEGES;
\q
```

Or use your MySQL GUI tool (MySQL Workbench, phpMyAdmin, etc.).

**Note:** On Windows, MySQL usually runs with user `root` and no password by default. You can either:
- Set a password for root (recommended)
- Use the existing `root` user without a password

### 3. Environment Configuration

Create `backend/.env` from the template:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your database credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=glucoguard_dev
DB_USER=root
DB_PASSWORD=your_mysql_password
JWT_SECRET=your_jwt_secret_key_change_this_in_production
NODE_ENV=development
PORT=5000
```

**Note:** If you have no MySQL password set, leave `DB_PASSWORD=` empty.

**Never commit `.env` — it contains credentials.**

---

## Database Setup

### Auto Migration

Migrations run automatically when the server starts. The schema includes:

- **users** — User accounts with password hashing
- **glucose_readings** — Blood glucose measurements
- **meals** — Food intake and carbohydrate estimates
- **insulin_logs** — Insulin administration records

### Manual Migration

If needed, run migrations explicitly:

```bash
cd backend
node migrations/run.js
cd ..
```

This creates all required tables and indexes.

---

## Starting the Application

### Start Backend Server

```bash
cd backend
npm start
```

Expected output:
```
✓ Database initialized
✓ Database connection verified
✓ Server running on http://localhost:5000
✓ Health check: GET http://localhost:5000/health
```

### Start Frontend (in another terminal)

```bash
# Option 1: Python HTTP server
cd frontend
python -m http.server 5500

# Option 2: Node.js http-server (if installed globally)
npx http-server frontend -p 5500

# Option 3: Open directly in browser
# Open file:///path/to/glucoguard/frontend/index.html
```

Access the app:
- **Frontend:** http://localhost:5500 (or open `frontend/index.html` directly)
- **Backend API:** http://localhost:5000/api

---

## Verification

### Health Check

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-08-18T10:30:00.000Z"
}
```

### Database Connection

The server logs "✓ Database connection verified" on startup. If you see an error:

1. Check MySQL is running
2. Verify credentials in `.env`
3. Confirm database exists: `mysql -u root -p glucoguard_dev -e "SHOW TABLES;"`

---

## API Endpoints (To Be Implemented in Phase 3)

Authentication:
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Get JWT token
- `GET /api/user` — Get logged-in user profile

Glucose:
- `POST /api/glucose` — Add reading
- `GET /api/glucose` — Get user's readings
- `DELETE /api/glucose/:id` — Delete reading

Meals:
- `POST /api/meals` — Add meal
- `GET /api/meals` — Get user's meals
- `DELETE /api/meals/:id` — Delete meal

Insulin:
- `POST /api/insulin` — Add insulin record
- `GET /api/insulin` — Get user's insulin history
- `DELETE /api/insulin/:id` — Delete record

Timeline & Risk:
- `GET /api/timeline` — Combined events
- `GET /api/risk` — Rule-based risk calculation

---

## Authentication Flow

1. **Register/Login** → Frontend sends credentials to `POST /api/auth/register` or `POST /api/auth/login`
2. **Backend Response** → Returns JWT token (valid 24 hours)
3. **Frontend Storage** → Token stored in `localStorage`
4. **API Calls** → Include token in `Authorization: Bearer <token>` header
5. **Logout** → Frontend removes token from localStorage

---

## Risk Engine (Prototype)

The risk engine is **rule-based, not ML-driven**. It analyzes:

- Recent glucose readings and trend
- Recent insulin administration and timing
- Recent meal carbohydrate intake
- Time of day

Output: `LOW`, `MODERATE`, or `ELEVATED` short-term hypoglycemia risk

**Important:** This is a prototype for demonstration only. It is NOT clinically validated and should never be used for medical decisions.

---

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `DB_HOST` | PostgreSQL server | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `glucoguard_dev` |
| `DB_USER` | Database user | `glucoguard_user` |
| `DB_PASSWORD` | Database password | `secure_password` |
| `JWT_SECRET` | Secret key for signing JWTs | `your_secret_key` |
| `NODE_ENV` | Environment | `development` or `production` |
| `PORT` | Backend port | `5000` |

---

## Troubleshooting

### "Cannot find module 'express'"

Solution: Run `npm install` in the `backend/` directory.

### "connect ECONNREFUSED 127.0.0.1:3306"

Solution: MySQL is not running. Start it:
- macOS: `brew services start mysql`
- Linux: `sudo systemctl start mysql` or `sudo service mysql start`
- Windows: Start MySQL service from Services app or use MySQL Command Line Client

### "Access denied for user 'root'@'localhost'"

Solution: Check your MySQL password in `.env`. If you have no password, leave `DB_PASSWORD=` empty.

### "CORS error" in browser console

Solution: Backend must be running on `http://localhost:5000` and frontend must send requests to that URL.

---

## Security Notes (MVP)

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens signed with `JWT_SECRET`
- Tokens expire after 24 hours
- Protected API routes verify JWT before responding
- `.env` file excluded from git
- CORS configured for frontend origin

**Production Considerations:**
- Use HTTPS only
- Rotate JWT_SECRET regularly
- Implement refresh tokens
- Add rate limiting
- Use environment-specific configs
- Set up logging and monitoring

---

## Frontend Features (Ready for Phase 3 Connection)

- User authentication (login/register)
- Dashboard with current glucose and risk
- Glucose logging and history
- Meal logging and history
- Insulin logging and history
- Combined timeline view
- Rule-based risk assessment display
- Safety & Privacy information
- Responsive mobile design

---

## Next Phase (Phase 3)

Phase 3 will implement:
1. Authentication routes (`/api/auth/register`, `/api/auth/login`)
2. User profile route (`/api/user`)
3. CRUD routes for glucose, meals, insulin
4. Timeline aggregation endpoint
5. Rule-based risk calculation endpoint
6. Full integration testing

---

## Support

For issues:
1. Check `.env` configuration
2. Verify PostgreSQL is running
3. Review server console logs
4. Check browser DevTools Network tab
5. Ensure backend and frontend ports are correct

---

**Last Updated:** August 18, 2024  
**Phase:** 2 (Backend Setup)  
**Status:** Ready for Phase 3 Implementation
