# SPEC-API-TESTS.md — Backend Integration Tests

## 1. Objective

Add automated integration tests for the PHP REST API. Tests run against a real PHP+Apache+MySQL stack via Docker Compose. Every test makes actual HTTP requests to the running API and asserts on status codes, response bodies, and headers.

**Goal:** Catch regressions in API behavior — routing, validation, business logic, error responses — without manual curl testing.

**Non-goal:** Unit-testing individual PHP functions. The API is thin enough that integration tests cover the important surface.

## 2. Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Test runner | PHPUnit 10+ | Same language as backend, proper assertions, lifecycle hooks |
| HTTP client | PHP `curl` functions or Guzzle | Send real HTTP requests to the running API |
| Containers | Docker Compose | PHP 8.1+Apache (with `mod_rewrite`), MySQL 8.0 |
| DB reset | Truncate tables in `setUp()` | Fast, no need to recreate schema per test |

## 3. Docker Compose Setup

File: `docker-compose.test.yml`

### Services

**`api`** — PHP 8.1 + Apache container serving the `api/` directory.
- Image: `php:8.1-apache`
- Mounts `./api` to `/var/www/html/api`
- Apache `DocumentRoot` at `/var/www/html/api` with `AllowOverride All` (enables `.htaccess`)
- Installs `pdo_mysql` extension
- Enables `mod_rewrite`
- Environment: `DB_HOST=db`, `DB_NAME=erdbeer_test`, `DB_USER=root`, `DB_PASS=test`, `ALLOWED_ORIGIN=http://localhost:5173`
- Depends on `db`
- Healthcheck: `curl -f http://localhost/group/00000000000000000000000000000000 || exit 1` (expects a 404 JSON response, proving PHP+Apache+MySQL are wired up)

**`db`** — MySQL 8.0 container.
- Image: `mysql:8.0`
- Environment: `MYSQL_ROOT_PASSWORD=test`, `MYSQL_DATABASE=erdbeer_test`
- Mounts `./sql/schema.sql` to `/docker-entrypoint-initdb.d/schema.sql` (auto-runs on first start)
- Healthcheck: `mysqladmin ping -h localhost`

**`tests`** — PHPUnit test runner.
- Build from a Dockerfile that extends `php:8.1-cli`, installs Composer, then `composer install`.
- Mounts `./tests` (test source) and `./composer.json` / `./composer.lock`.
- Depends on `api` (with healthcheck condition)
- Runs: `vendor/bin/phpunit --colors=always`
- Network: same Docker network as `api` and `db`

### Run command

```sh
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from tests
```

Teardown:
```sh
docker compose -f docker-compose.test.yml down -v
```

## 4. Project Structure

New files (nothing in `api/` is modified):

```
composer.json                   # PHPUnit + Guzzle dependencies (dev only)
docker-compose.test.yml         # Test stack definition
tests/
├── bootstrap.php               # Shared setup: base URL, HTTP client factory, DB connection, seed helpers
├── Api/
│   ├── GroupTest.php           # GET /api/group/:token
│   ├── LeaderboardTest.php    # GET /api/leaderboard/:token
│   ├── PurchaseReadTest.php   # GET /api/purchases/:token, GET /api/purchases/:token/:id
│   ├── PurchaseWriteTest.php  # POST, PUT, DELETE /api/purchases/:token/:id
│   └── ValidationTest.php     # Cross-cutting validation & error cases
└── phpunit.xml                 # PHPUnit config
```

## 5. Test Infrastructure

### bootstrap.php

- Reads `API_BASE_URL` from env (default: `http://api`), so the test container reaches the `api` service by Docker DNS.
- Creates a PDO connection to the `db` service directly (`DB_HOST=db`) for:
  - Seeding test data (insert seasons, groups with known tokens)
  - Truncating all tables in `tearDown()` (order: `purchase_items`, `purchases`, `groups`, `seasons`)
- Defines helper functions:
  - `seedSeason(PDO $pdo, array $overrides = []): int` — inserts a season, returns ID
  - `seedGroup(PDO $pdo, int $seasonId, string $token, array $overrides = []): int` — inserts a group with a known invite token, returns ID
  - `seedPurchase(PDO $pdo, int $groupId, string $date, array $items): int` — inserts a purchase with items, returns purchase ID

### Base test class

`ApiTestCase extends \PHPUnit\Framework\TestCase`:
- `setUp()`: truncates all tables (reverse FK order), seeds a default season (active, today within range) and a default group with a known token `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`.
- Provides `$this->http` (Guzzle client with `base_uri`, `http_errors => false` so we can assert on 4xx/5xx).
- Provides `$this->pdo` for direct DB access in assertions.
- Provides `$this->token` (the default test token).

## 6. Test Cases

Derived from the acceptance criteria in SPEC-BACKEND.md section 8, plus additional edge cases.

### GroupTest

| Test | Method | Endpoint | Assert |
|------|--------|----------|--------|
| Returns group info for valid token | GET | `/api/group/{token}` | 200, `data.name`, `data.season.startDate`, `data.totalGrams` = 0 |
| Returns 404 for invalid token | GET | `/api/group/invalidtoken00000000000` | 404, `error.code` = `GROUP_NOT_FOUND` |
| Returns group info for ended season (read-only) | GET | `/api/group/{token}` | 200, season dates in the past |
| Stats reflect purchases | GET | `/api/group/{token}` | Seed 2 purchases, verify `totalGrams`, `purchaseCount`, `avgPricePerKgCents` |
| Rejects non-GET methods | POST | `/api/group/{token}` | 405 |

### LeaderboardTest

| Test | Method | Endpoint | Assert |
|------|--------|----------|--------|
| Returns all groups ranked by totalGrams | GET | `/api/leaderboard/{token}` | 200, entries sorted desc, rank numbers correct |
| Includes currentGroupId | GET | `/api/leaderboard/{token}` | `data.currentGroupId` matches token's group |
| Gap calculation correct | GET | `/api/leaderboard/{token}` | First entry `gapToNextGrams` = null, others correct |
| Tied groups share rank | GET | `/api/leaderboard/{token}` | Two groups with equal grams have same rank |
| Empty season (no purchases) | GET | `/api/leaderboard/{token}` | All groups show 0 grams |

### PurchaseReadTest

| Test | Method | Endpoint | Assert |
|------|--------|----------|--------|
| List purchases (empty) | GET | `/api/purchases/{token}` | 200, `data.purchases` = [], summary all zeros |
| List purchases with data | GET | `/api/purchases/{token}` | Seed 2 purchases, verify order (newest first), summary totals |
| Get single purchase | GET | `/api/purchases/{token}/{id}` | 200, items with `pricePerKgCents`, totals |
| Get purchase includes updatedAt after edit | GET | `/api/purchases/{token}/{id}` | Seed + update via API, verify `updatedAt` present |
| Get non-existent purchase | GET | `/api/purchases/{token}/99999` | 404, `PURCHASE_NOT_FOUND` |
| Get purchase from another group | GET | `/api/purchases/{token}/{otherId}` | 404, `PURCHASE_NOT_FOUND` |

### PurchaseWriteTest

| Test | Method | Endpoint | Assert |
|------|--------|----------|--------|
| Create purchase | POST | `/api/purchases/{token}` | 201, `Location` header, response has computed fields |
| Create purchase with multiple items | POST | `/api/purchases/{token}` | 201, all items in response, totals correct |
| Update purchase (full replace) | PUT | `/api/purchases/{token}/{id}` | 200, date and items replaced |
| Delete purchase | DELETE | `/api/purchases/{token}/{id}` | 204, no body, subsequent GET returns 404 |
| Delete cascades items | DELETE | `/api/purchases/{token}/{id}` | 204, verify via direct DB query that items are gone |
| Create on ended season | POST | `/api/purchases/{token}` | 403, `SEASON_ENDED` |
| Update on ended season | PUT | `/api/purchases/{token}/{id}` | 403, `SEASON_ENDED` |
| Delete on ended season | DELETE | `/api/purchases/{token}/{id}` | 403, `SEASON_ENDED` |
| Update purchase from another group | PUT | `/api/purchases/{token}/{otherId}` | 404, `PURCHASE_NOT_FOUND` |
| Delete purchase from another group | DELETE | `/api/purchases/{token}/{otherId}` | 404, `PURCHASE_NOT_FOUND` |

### ValidationTest

| Test | Method | Endpoint | Assert |
|------|--------|----------|--------|
| Missing Content-Type header | POST | `/api/purchases/{token}` | 415, `UNSUPPORTED_MEDIA_TYPE` |
| Invalid JSON body | POST | `/api/purchases/{token}` | 400, `VALIDATION_ERROR` |
| Empty items array | POST | `/api/purchases/{token}` | 400, `VALIDATION_ERROR` |
| More than 20 items | POST | `/api/purchases/{token}` | 400, `VALIDATION_ERROR` |
| Invalid bagSizeGrams (not 250/500) | POST | `/api/purchases/{token}` | 400, `VALIDATION_ERROR` |
| Invalid quantity (0, 100, negative) | POST | `/api/purchases/{token}` | 400, `VALIDATION_ERROR` |
| Invalid priceCents (0, 100000) | POST | `/api/purchases/{token}` | 400, `VALIDATION_ERROR` |
| Invalid priceUnit | POST | `/api/purchases/{token}` | 400, `VALIDATION_ERROR` |
| purchasedAt outside season range | POST | `/api/purchases/{token}` | 400, `VALIDATION_ERROR` |
| purchasedAt invalid date (2026-02-30) | POST | `/api/purchases/{token}` | 400, `VALIDATION_ERROR` |
| OPTIONS preflight returns 204 + CORS headers | OPTIONS | `/api/purchases/{token}` | 204, `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods` |
| CORS origin header for allowed origin | GET | `/api/group/{token}` | `Access-Control-Allow-Origin` = allowed origin |
| Security headers present | GET | `/api/group/{token}` | `X-Content-Type-Options: nosniff`, etc. |

## 7. Computed Value Verification

At least one test per endpoint must verify a non-trivial computation:

- **`pricePerKgCents`:** POST a purchase with `priceCents=399, priceUnit=500g` → expect `pricePerKgCents=798`
- **`totalGrams`:** POST with 2 items (500g x 2, 250g x 3) → expect `totalGrams=1750`
- **`totalPriceCents`:** POST with `priceCents=399, priceUnit=kg, bagSizeGrams=500, quantity=2` → expect per-item cost `round(399*500/1000)*2 = 200*2 = 400`, verify `totalPriceCents`
- **`avgPricePerKgCents`:** Seed multiple purchases, GET group, verify weighted average

## 8. Running the Tests

### One command

```sh
docker compose -f docker-compose.test.yml run --rm --build tests
```

### Teardown

```sh
docker compose -f docker-compose.test.yml down -v
```

### CI integration (future)

The `docker compose ... run` command exits with the PHPUnit exit code, so it integrates directly with any CI system.

## 9. Boundaries

### Always Do
- Run tests against the real PHP+Apache+MySQL stack (no mocks)
- Truncate and re-seed between tests for isolation
- Assert on HTTP status codes AND response body structure
- Keep test data deterministic (fixed tokens, known dates)

### Ask First
- Adding Composer dependencies beyond PHPUnit and Guzzle
- Changing any existing `api/` files

### Never Do
- Mock the database
- Test against PHP's built-in server (needs Apache for .htaccess rewrite rules)
- Modify the production API code to make it "more testable"
