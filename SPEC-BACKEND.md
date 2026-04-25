# SPEC-BACKEND.md — Erdbeer App Backend

## 1. Objective

Build a JSON API for the Erdbeer App — a mobile-first PWA where family groups compete to consume the most strawberries during the season. The backend serves data for purchase logging, group info, and a season leaderboard.

**Target users:** The React frontend consumes this API exclusively. Admin actions (season/group creation) happen via phpMyAdmin.

**Success criteria:**
- All endpoints respond in < 200ms (the leaderboard aggregation query is the most expensive — see index guidance in section 3)
- Invite token validation on every request
- Correct leaderboard ranking after every purchase mutation

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | PHP 8.1+ | Existing server, typed properties, enums, match |
| Database | MySQL 8.0+ / MariaDB 10.2+ | Existing server infrastructure. Either is compatible; note which is actually deployed. |
| Style | Plain scripts, no framework | Minimal overhead, simple JSON API |
| ORM | None — direct PDO | Fewer abstractions, full control |
| Deployment | Subdomain `/api/*` | e.g. `erdbeeren.example.com/api/` |
| Admin | phpMyAdmin | Season/group creation via direct DB inserts |

## 3. Data Model

### `seasons`

| Column | Type | Description |
|--------|------|-------------|
| id | INT AUTO_INCREMENT PK | |
| name | VARCHAR(100) | e.g. "Saison 2026" |
| start_date | DATE | Season start |
| end_date | DATE | Season end |
| created_at | TIMESTAMP | |

Constraint: `CHECK (end_date > start_date)`

### `groups`

| Column | Type | Description |
|--------|------|-------------|
| id | INT AUTO_INCREMENT PK | |
| season_id | INT FK → seasons.id (RESTRICT) | Prevents accidental season deletion |
| name | VARCHAR(100) | e.g. "Max & Anna". Should not contain sensitive information — visible to all groups in the season. |
| invite_token | VARCHAR(32) UNIQUE | 32 hex chars (128-bit), generated via `bin2hex(random_bytes(16))`. Treat as a secret — HTTPS only. |
| created_at | TIMESTAMP | |

Index: `INDEX (season_id)`

### `purchases`

| Column | Type | Description |
|--------|------|-------------|
| id | INT AUTO_INCREMENT PK | |
| group_id | INT FK → groups.id (RESTRICT) | Prevents accidental group deletion |
| purchased_at | DATE | Date of purchase |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

Index: `INDEX (group_id)`

### `purchase_items`

| Column | Type | Description |
|--------|------|-------------|
| id | INT AUTO_INCREMENT PK | |
| purchase_id | INT FK → purchases.id (CASCADE DELETE) | Items deleted when purchase is deleted |
| bag_size_grams | INT | 250 or 500 |
| quantity | INT | Number of bags |
| price_cents | INT | Price as entered, in euro cents |
| price_unit | ENUM('kg', '500g', '250g') | Unit the price refers to. Adding a new value requires `ALTER TABLE ... MODIFY COLUMN` which rewrites the table — acceptable at this scale. |

Constraints:
- `CHECK (bag_size_grams IN (250, 500))`
- `CHECK (quantity BETWEEN 1 AND 99)`
- `CHECK (price_cents BETWEEN 1 AND 99999)`

Index: `INDEX (purchase_id, bag_size_grams, quantity)` — covering index for leaderboard aggregation

**Price normalization:** Computed on read and returned in API responses. `price_per_kg_cents = price_cents * (1000 / unit_grams)` where unit_grams maps from price_unit (kg=1000, 500g=500, 250g=250).

**Total grams per purchase:** `SUM(bag_size_grams * quantity)` across all items in a purchase.

**Total price per purchase:** `SUM(price_cents * quantity * bag_size_grams / unit_grams)` — the total cost in cents, normalizing each item's price to its actual weight.

### SQL Schema

```sql
CREATE TABLE seasons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_date > start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    season_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    invite_token VARCHAR(32) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_season_id (season_id),
    FOREIGN KEY (season_id) REFERENCES seasons(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    purchased_at DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_group_id (group_id),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE purchase_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT NOT NULL,
    bag_size_grams INT NOT NULL,
    quantity INT NOT NULL,
    price_cents INT NOT NULL,
    price_unit ENUM('kg', '500g', '250g') NOT NULL,
    INDEX idx_purchase_agg (purchase_id, bag_size_grams, quantity),
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    CHECK (bag_size_grams IN (250, 500)),
    CHECK (quantity BETWEEN 1 AND 99),
    CHECK (price_cents BETWEEN 1 AND 99999)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 4. API Endpoints

Base path: `/api/`

### Common Behaviors

- All responses set `Content-Type: application/json; charset=utf-8`.
- All POST/PUT requests **must** send `Content-Type: application/json`. Requests with any other content type are rejected with 415 Unsupported Media Type.
- The invite token is passed in the URL path. It scopes every request to a group/season. No cookies, no sessions, no auth headers.
- Error responses use a structured format with machine-readable codes (see Error Responses below).
- All POST/PUT/DELETE requests that modify purchases are wrapped in a database transaction.

### CORS

Set in `config.php`, applied to all responses:
- `Access-Control-Allow-Origin`: exact frontend origin (e.g. `https://erdbeeren.example.com`). Never `*`, never reflect the request Origin.
- `Access-Control-Allow-Methods`: `GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type`
- `Access-Control-Max-Age`: `86400`

**OPTIONS preflight:** Every endpoint must respond to `OPTIONS` with a `204 No Content` and the CORS headers above. Handle this in a shared handler before endpoint dispatch.

### HTTP Security Headers

Set on all responses (in `config.php`):
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`
- `Cache-Control: no-store`
- `Strict-Transport-Security: max-age=31536000` (if served over HTTPS, which it should be)

### GET `/api/group/:token`

Returns group info, season info, and summary stats.

Response (200):
```json
{
  "data": {
    "id": 1,
    "name": "Max & Anna",
    "season": {
      "id": 1,
      "name": "Saison 2026",
      "startDate": "2026-04-01",
      "endDate": "2026-07-31"
    },
    "totalGrams": 3500,
    "purchaseCount": 5,
    "avgPricePerKgCents": 598
  }
}
```

### GET `/api/leaderboard/:token`

Returns the season leaderboard (all groups, ranked by total grams). Token identifies the season via the group's season_id. Includes rank numbers and gap to next group for motivational UX.

Response (200):
```json
{
  "data": {
    "season": {
      "id": 1,
      "name": "Saison 2026",
      "startDate": "2026-04-01",
      "endDate": "2026-07-31"
    },
    "currentGroupId": 1,
    "leaderboard": [
      { "groupId": 3, "name": "Eltern", "totalGrams": 5000, "purchaseCount": 8, "rank": 1, "gapToNextGrams": null },
      { "groupId": 1, "name": "Max & Anna", "totalGrams": 3500, "purchaseCount": 5, "rank": 2, "gapToNextGrams": 1500 },
      { "groupId": 2, "name": "Tom & Lisa", "totalGrams": 2000, "purchaseCount": 3, "rank": 3, "gapToNextGrams": 1500 }
    ]
  }
}
```

### GET `/api/purchases/:token`

Lists all purchases for this group, newest first. Includes a summary object.

Response (200):
```json
{
  "data": {
    "summary": {
      "totalGrams": 2250,
      "totalPriceCents": 1197,
      "avgPricePerKgCents": 532
    },
    "purchases": [
      {
        "id": 12,
        "purchasedAt": "2026-05-10",
        "createdAt": "2026-05-10T14:30:00Z",
        "items": [
          { "id": 23, "bagSizeGrams": 500, "quantity": 2, "priceCents": 399, "priceUnit": "kg", "pricePerKgCents": 399 }
        ],
        "totalGrams": 1000,
        "totalPriceCents": 399
      }
    ]
  }
}
```

**`totalPriceCents` per purchase:** The total cost in cents, computed as `SUM(price_cents * quantity * bag_size_grams / unit_grams)` for each item — i.e., the actual cost for the actual weight purchased.

### POST `/api/purchases/:token`

Creates a new purchase. Maximum 20 items per purchase.

Request:
```json
{
  "purchasedAt": "2026-05-10",
  "items": [
    { "bagSizeGrams": 500, "quantity": 2, "priceCents": 399, "priceUnit": "kg" },
    { "bagSizeGrams": 250, "quantity": 1, "priceCents": 249, "priceUnit": "500g" }
  ]
}
```

Response (201):
```json
{
  "data": {
    "id": 12,
    "purchasedAt": "2026-05-10",
    "createdAt": "2026-05-10T14:30:00Z",
    "items": [
      { "id": 23, "bagSizeGrams": 500, "quantity": 2, "priceCents": 399, "priceUnit": "kg", "pricePerKgCents": 399 },
      { "id": 24, "bagSizeGrams": 250, "quantity": 1, "priceCents": 249, "priceUnit": "500g", "pricePerKgCents": 498 }
    ],
    "totalGrams": 1250
  }
}
```

Returns `Location` header: `/api/purchases/:token/12`

### GET `/api/purchases/:token/:id`

Returns a single purchase with its items.

Response (200):
```json
{
  "data": {
    "id": 12,
    "purchasedAt": "2026-05-10",
    "createdAt": "2026-05-10T14:30:00Z",
    "items": [
      { "id": 23, "bagSizeGrams": 500, "quantity": 2, "priceCents": 399, "priceUnit": "kg", "pricePerKgCents": 399 },
      { "id": 24, "bagSizeGrams": 250, "quantity": 1, "priceCents": 249, "priceUnit": "500g", "pricePerKgCents": 498 }
    ],
    "totalGrams": 1250,
    "totalPriceCents": 648
  }
}
```

### PUT `/api/purchases/:token/:id`

Full replace — replaces both `purchasedAt` and all items. Same request format as POST. Implemented as delete-all-items + re-insert within a transaction.

Ownership check: the purchase must belong to the group identified by the token. This check must be in the same SQL query (WHERE clause with JOIN), not a separate fetch-then-check.

### DELETE `/api/purchases/:token/:id`

Deletes the purchase and all its items (via CASCADE). Same ownership check as PUT.

Response (200):
```json
{ "data": { "deleted": true } }
```

### Error Responses

All errors use a structured format with a machine-readable code and a human-readable German message:

```json
{ "error": { "code": "GROUP_NOT_FOUND", "message": "Gruppe nicht gefunden" } }
```

Error codes:
- `GROUP_NOT_FOUND` (404) — invalid or expired invite token
- `PURCHASE_NOT_FOUND` (404) — purchase ID doesn't exist or doesn't belong to this group
- `VALIDATION_ERROR` (400) — request body fails validation
- `UNSUPPORTED_MEDIA_TYPE` (415) — missing or wrong Content-Type header
- `INTERNAL_ERROR` (500) — unexpected server error (no details exposed)

## 5. Validation Rules

- `invite_token` must exist and map to a group in an active season (current date between start_date and end_date)
- `purchasedAt` must be a valid date within the season date range
- `items` array must have at least 1 item and at most 20 items
- `bagSizeGrams` must be exactly 250 or 500 (integer type, not string — reject via `is_int()` after JSON decode)
- `quantity` must be a positive integer (1-99)
- `priceCents` must be a positive integer (1-99999)
- `priceUnit` must be one of: 'kg', '500g', '250g'
- On PUT/DELETE: purchase must belong to the group identified by the token, verified in the same SQL query (JOIN/WHERE), not a separate fetch

## 6. Project Structure

```
api/
├── .htaccess               # Rewrite rules + deny direct access to internals
├── config.php              # DB connection (PDO), CORS, security headers
├── helpers.php             # JSON response helpers, validation, error handler
├── group.php               # GET /api/group/:token
├── leaderboard.php         # GET /api/leaderboard/:token
└── purchases.php           # CRUD /api/purchases/:token[/:id]
sql/
└── schema.sql              # CREATE TABLE statements
```

### Routing

`.htaccess` rewrite rules extract the token and optional ID into query parameters:

```apache
RewriteEngine On

# Deny direct access to config and helpers
<Files "config.php">
    Require all denied
</Files>
<Files "helpers.php">
    Require all denied
</Files>

# API routes
RewriteRule ^group/([a-f0-9]{32})$ group.php?token=$1 [L,QSA]
RewriteRule ^leaderboard/([a-f0-9]{32})$ leaderboard.php?token=$1 [L,QSA]
RewriteRule ^purchases/([a-f0-9]{32})$ purchases.php?token=$1 [L,QSA]
RewriteRule ^purchases/([a-f0-9]{32})/([0-9]+)$ purchases.php?token=$1&id=$2 [L,QSA]
```

PHP files read parameters via `$_GET['token']` and `$_GET['id']`, then dispatch based on `$_SERVER['REQUEST_METHOD']`.

### File Security

- `config.php` and `helpers.php` are denied direct access via `.htaccess` (see above). They are only included by endpoint files.
- Production PHP config must set `display_errors = Off` and `log_errors = On`.

## 7. Code Style

### PHP
- PHP 8.1+ features: typed properties, enums, match expressions, named arguments
- Prepared statements for all SQL queries (PDO)
- camelCase for variables and functions
- No framework, no ORM — direct PDO queries
- Each API endpoint in its own file

### PDO Configuration (in `config.php`)

```php
$pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
]);
```

- `ERRMODE_EXCEPTION`: errors throw instead of silently returning false
- `EMULATE_PREPARES = false`: uses real prepared statements, prevents charset-based injection

### JSON Input Parsing

All POST/PUT endpoints read the request body via:

```php
$input = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
```

- `true`: decode to associative array
- `512`: max nesting depth (prevents stack exhaustion)
- `JSON_THROW_ON_ERROR`: malformed JSON throws instead of returning null
- After decode, assert the result is an array before accessing fields

### Error Handling

`config.php` registers a global exception handler that catches all uncaught exceptions and returns a JSON error response with code `INTERNAL_ERROR`. No stack traces, file paths, or DB details are ever exposed in responses.

### Transactions

All POST, PUT, and DELETE operations that touch multiple tables are wrapped in `$pdo->beginTransaction()` / `$pdo->commit()` with a `catch` that calls `$pdo->rollBack()`.

## 8. Testing Strategy

- Manual testing via curl during development
- No automated test framework (scope: MVP, ship fast)
- SQL schema tested by running the migration on a fresh database

### Acceptance Criteria

- [ ] GET `/api/group/:token` returns group info for a valid token
- [ ] GET `/api/group/:token` returns 404 with `GROUP_NOT_FOUND` code for an invalid token
- [ ] GET `/api/leaderboard/:token` returns all groups ranked by total grams with rank and gapToNextGrams
- [ ] POST `/api/purchases/:token` creates a purchase and returns it with computed totalGrams and pricePerKgCents per item
- [ ] POST returns `Location` header pointing to the new resource
- [ ] PUT `/api/purchases/:token/:id` replaces date and all items
- [ ] DELETE `/api/purchases/:token/:id` removes the purchase and its items
- [ ] Validation rejects invalid bagSizeGrams, quantity, priceCents, priceUnit
- [ ] Validation rejects purchasedAt outside the season date range
- [ ] Validation rejects more than 20 items per purchase
- [ ] PUT/DELETE on a purchase belonging to a different group returns 404
- [ ] OPTIONS preflight returns 204 with correct CORS headers
- [ ] POST/PUT without `Content-Type: application/json` returns 415
- [ ] Direct access to `/api/config.php` is denied
- [ ] Error responses never contain stack traces or DB details

## 9. Boundaries

### Always Do
- Validate invite tokens on every API request
- Use prepared statements for all SQL queries (with `EMULATE_PREPARES = false`)
- Wrap multi-table writes in transactions
- Return proper HTTP status codes with structured error codes
- Store prices in cents (integers) to avoid floating-point issues
- Set CORS headers for the exact frontend origin
- Set security headers (nosniff, no-referrer, no-store, HSTS)
- Handle OPTIONS preflight requests
- Enforce `Content-Type: application/json` on POST/PUT
- Keep `display_errors = Off` in production
- Generate invite tokens via `bin2hex(random_bytes(16))`

### Ask First
- Any changes to the data model
- Adding new API endpoints

### Never Do
- Build an admin UI
- Add user authentication beyond invite tokens
- Add session management or cookies
- Expose stack traces, file paths, or DB details in error responses
- Use `*` as CORS origin
- Use PDO emulated prepares
