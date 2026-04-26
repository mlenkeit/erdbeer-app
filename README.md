# Erdbeer App

A mobile-first Progressive Web App for family groups to compete in tracking strawberry purchases during the season. Built with React and PHP on a traditional LAMP stack.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4
- **Backend:** PHP 8.1+, plain scripts (no framework)
- **Database:** MySQL 8.0+ / MariaDB 10.3+
- **Server:** Apache with mod_rewrite

## Local Development

Start the backend (MySQL + PHP API) and frontend dev server:

```bash
docker compose up -d
cd frontend
npm install
npm run dev
```

Open http://localhost:5173/aaaabbbbccccddddeeeeffffgggghhhh in your browser. The seed data in `sql/seed.sql` creates a test group with that token.

To start fresh, remove the database volume:

```bash
docker compose down -v
```

### Running Tests

```bash
# Frontend (unit tests)
cd frontend
npm test

# Frontend (lint)
npm run lint

# Backend (integration tests via Docker)
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from tests
```

## Deployment

Deployment is handled by a GitHub Actions workflow that uploads files to the web server via SFTP.

### Prerequisites

- Apache web server with mod_rewrite and PHP 8.1+ (mod_php or PHP-FPM)
- MySQL 8.0+ or MariaDB 10.3+ database (created beforehand)
- SFTP access to the web server
- `.htaccess` processing enabled (`AllowOverride All`)

### GitHub Secrets

Configure these in **Settings > Secrets and variables > Actions**:

| Secret | Required | Description |
|--------|----------|-------------|
| `SFTP_HOST` | Yes | Server hostname or IP |
| `SFTP_USERNAME` | Yes | SFTP username |
| `SFTP_PASSWORD` | Yes* | SFTP password |
| `SFTP_PRIVATE_KEY` | Yes* | SSH private key (alternative to password) |
| `SFTP_PORT` | No | SFTP port (defaults to 22) |
| `SFTP_REMOTE_PATH` | Yes | Absolute path on the server, e.g. `/var/www/erdbeer-app` |
| `DB_HOST` | Yes | Database host (often `localhost`) |
| `DB_NAME` | Yes | Database name |
| `DB_USER` | Yes | Database username |
| `DB_PASS` | Yes | Database password |
| `ALLOWED_ORIGIN` | Yes | Production URL for CORS, e.g. `https://example.com` |
| `SETUP_TOKEN` | Yes | 64-char hex token for schema setup (see below) |

\* Provide either `SFTP_PASSWORD` or `SFTP_PRIVATE_KEY`, not both.

### GitHub Environment

The workflow uses a `production` environment. Create it in **Settings > Environments > New environment** with the name `production`. You can optionally add protection rules (required reviewers, wait timer) to gate deployments.

### Generating the Setup Token

```bash
openssl rand -hex 32
```

Store the output as the `SETUP_TOKEN` secret.

### Running a Deploy

1. Go to **Actions > Deploy > Run workflow**
2. Click **Run workflow** on the `main` branch (or whichever branch you want to deploy)
3. The workflow will lint, test, and build the frontend, then upload all files via SFTP

### First Deploy: Database Setup

After the first deploy, the database tables need to be created. The app includes a one-time setup endpoint protected by your setup token:

```
https://your-domain.com/api/setup/<SETUP_TOKEN>
```

Open this URL in your browser. It will return:
- `{"status": "created"}` — tables were created successfully
- `{"status": "already_exists"}` — tables already exist (safe to call again)

### Creating a Season and Group

After the schema is set up, create your first season and group via your database admin tool (e.g. phpMyAdmin):

```sql
-- Create a season
INSERT INTO seasons (name, start_date, end_date)
VALUES ('2026', '2026-05-01', '2026-08-31');

-- Create a group with an invite token
INSERT INTO `groups` (season_id, name, invite_token)
VALUES (1, 'Familie Müller', HEX(RANDOM_BYTES(16)));

-- Retrieve the invite token
SELECT invite_token FROM `groups` WHERE id = 1;
```

Share the invite link with your group: `https://your-domain.com/<invite_token>`

## Project Structure

```
├── api/                  # PHP backend
│   ├── config.php        # PDO connection, CORS, security headers
│   ├── helpers.php       # Validation, computed fields, rate limiting
│   ├── group.php         # GET /api/group/:token
│   ├── leaderboard.php   # GET /api/leaderboard/:token
│   ├── purchases.php     # CRUD /api/purchases/:token[/:id]
│   └── setup.php         # One-time schema provisioning
├── frontend/             # React SPA
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route pages
│   │   ├── hooks/        # Custom hooks (useApi)
│   │   ├── context/      # TokenContext
│   │   └── utils/        # Formatting helpers
│   └── public/           # Static assets, manifest, .htaccess
├── sql/
│   ├── schema.sql        # Database schema (4 tables)
│   └── seed.sql          # Dev seed data (season + group)
├── tests/                # PHPUnit integration tests
└── .github/workflows/
    ├── ci.yml            # Lint, test, build on push/PR
    └── deploy.yml        # Manual SFTP deploy to production
```
