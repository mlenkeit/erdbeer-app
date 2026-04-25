# SPEC-BACKEND.md — Erdbeer App Backend

## 1. Objective

Build a JSON API for the Erdbeer App — a mobile-first PWA where family groups compete to consume the most strawberries during the season. The backend serves data for purchase logging, group info, and a season leaderboard.

**Target users:** The React frontend consumes this API exclusively. Admin actions (season/group creation) happen via phpMyAdmin.

**Success criteria:**
- All endpoints respond in < 200ms
- Invite token validation on every request
- Correct leaderboard ranking after every purchase mutation

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | PHP 8.1+ | Existing server, typed properties, enums, match |
| Database | MySQL | Existing server infrastructure |
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

### `groups`

| Column | Type | Description |
|--------|------|-------------|
| id | INT AUTO_INCREMENT PK | |
| season_id | INT FK → seasons.id | |
| name | VARCHAR(100) | e.g. "Max & Anna" |
| invite_token | VARCHAR(32) UNIQUE | Random token for shareable link |
| created_at | TIMESTAMP | |

### `purchases`

| Column | Type | Description |
|--------|------|-------------|
| id | INT AUTO_INCREMENT PK | |
| group_id | INT FK → groups.id | |
| purchased_at | DATE | Date of purchase |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### `purchase_items`

| Column | Type | Description |
|--------|------|-------------|
| id | INT AUTO_INCREMENT PK | |
| purchase_id | INT FK → purchases.id (CASCADE DELETE) | |
| bag_size_grams | INT | 250 or 500 |
| quantity | INT | Number of bags |
| price_cents | INT | Price as entered, in euro cents |
| price_unit | ENUM('kg', '500g', '250g') | Unit the price refers to |

**Price normalization:** Computed on read. `price_per_kg_cents = price_cents * (1000 / unit_grams)` where unit_grams maps from price_unit (kg=1000, 500g=500, 250g=250).

**Total grams per purchase:** `SUM(bag_size_grams * quantity)` across all items in a purchase.

### SQL Schema

```sql
CREATE TABLE seasons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    season_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    invite_token VARCHAR(32) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (season_id) REFERENCES seasons(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    purchased_at DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE purchase_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT NOT NULL,
    bag_size_grams INT NOT NULL,
    quantity INT NOT NULL,
    price_cents INT NOT NULL,
    price_unit ENUM('kg', '500g', '250g') NOT NULL,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 4. API Endpoints

Base path: `/api/`

All responses are JSON. The invite token is used in every request to scope access — no cookies, no sessions, no auth headers.

### GET `/api/group/:token`

Returns group info, season info, and summary stats.

Response (200):
```json
{
  "group": {
    "id": 1,
    "name": "Max & Anna",
    "season": {
      "id": 1,
      "name": "Saison 2026",
      "startDate": "2026-04-01",
      "endDate": "2026-07-31"
    },
    "totalGrams": 3500,
    "purchaseCount": 5
  }
}
```

### GET `/api/leaderboard/:token`

Returns the season leaderboard (all groups, ranked by total grams). Token identifies the season via the group's season_id.

Response (200):
```json
{
  "season": {
    "id": 1,
    "name": "Saison 2026"
  },
  "currentGroupId": 1,
  "leaderboard": [
    { "groupId": 3, "name": "Eltern", "totalGrams": 5000, "purchaseCount": 8 },
    { "groupId": 1, "name": "Max & Anna", "totalGrams": 3500, "purchaseCount": 5 },
    { "groupId": 2, "name": "Tom & Lisa", "totalGrams": 2000, "purchaseCount": 3 }
  ]
}
```

### GET `/api/purchases/:token`

Lists all purchases for this group, newest first.

Response (200):
```json
{
  "purchases": [
    {
      "id": 12,
      "purchasedAt": "2026-05-10",
      "items": [
        { "id": 23, "bagSizeGrams": 500, "quantity": 2, "priceCents": 399, "priceUnit": "kg" }
      ],
      "totalGrams": 1000,
      "totalPriceCents": 399
    }
  ]
}
```

### POST `/api/purchases/:token`

Creates a new purchase.

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
  "purchase": {
    "id": 12,
    "purchasedAt": "2026-05-10",
    "items": [
      { "id": 23, "bagSizeGrams": 500, "quantity": 2, "priceCents": 399, "priceUnit": "kg" },
      { "id": 24, "bagSizeGrams": 250, "quantity": 1, "priceCents": 249, "priceUnit": "500g" }
    ],
    "totalGrams": 1250,
    "createdAt": "2026-05-10T14:30:00Z"
  }
}
```

### GET `/api/purchases/:token/:id`

Returns a single purchase with its items.

### PUT `/api/purchases/:token/:id`

Same request format as POST. Replaces all items (delete existing + insert new).

### DELETE `/api/purchases/:token/:id`

Response (200):
```json
{ "deleted": true }
```

### Error Responses

```json
{ "error": "Gruppe nicht gefunden" }
```

HTTP status codes: 400 (validation), 404 (not found), 500 (server error).

## 5. Validation Rules

- `invite_token` must exist and map to a group in an active season (current date between start_date and end_date)
- `purchasedAt` must be a valid date within the season date range
- `items` array must have at least 1 item
- `bagSizeGrams` must be 250 or 500
- `quantity` must be a positive integer (1-99)
- `priceCents` must be a positive integer (1-99999)
- `priceUnit` must be one of: 'kg', '500g', '250g'
- On PUT/DELETE: purchase must belong to the group identified by the token

## 6. Project Structure

```
api/
├── config.php              # DB connection (PDO), constants
├── helpers.php             # JSON response helpers, validation utilities
├── group.php               # GET /api/group/:token
├── leaderboard.php         # GET /api/leaderboard/:token
└── purchases.php           # CRUD /api/purchases/:token[/:id]
sql/
└── schema.sql              # CREATE TABLE statements
```

### Routing

`.htaccess` rewrite rules map URLs to PHP files:
- `/api/group/:token` → `api/group.php`
- `/api/leaderboard/:token` → `api/leaderboard.php`
- `/api/purchases/:token[/:id]` → `api/purchases.php`

Each PHP file reads the token (and optional id) from the rewritten URL, validates it, and dispatches based on `$_SERVER['REQUEST_METHOD']`.

## 7. Code Style

- PHP 8.1+ features: typed properties, enums, match expressions, named arguments
- Prepared statements for all SQL queries (PDO)
- camelCase for variables and functions
- No framework, no ORM — direct PDO queries
- Each API endpoint in its own file
- CORS headers set in `config.php` for the frontend origin

## 8. Testing Strategy

- Manual testing via curl during development
- No automated test framework (scope: MVP, ship fast)
- SQL schema tested by running the migration on a fresh database

### Acceptance Criteria

- [ ] GET `/api/group/:token` returns group info for a valid token
- [ ] GET `/api/group/:token` returns 404 for an invalid token
- [ ] GET `/api/leaderboard/:token` returns all groups ranked by total grams
- [ ] POST `/api/purchases/:token` creates a purchase and returns it with computed totalGrams
- [ ] PUT `/api/purchases/:token/:id` replaces all items
- [ ] DELETE `/api/purchases/:token/:id` removes the purchase and its items
- [ ] Validation rejects invalid bagSizeGrams, quantity, priceCents, priceUnit
- [ ] Validation rejects purchasedAt outside the season date range
- [ ] PUT/DELETE on a purchase belonging to a different group returns 404

## 9. Boundaries

### Always Do
- Validate invite tokens on every API request
- Use prepared statements for all SQL queries
- Return proper HTTP status codes
- Store prices in cents (integers) to avoid floating-point issues
- Set CORS headers for the frontend origin

### Ask First
- Any changes to the data model
- Adding new API endpoints

### Never Do
- Build an admin UI
- Add user authentication beyond invite tokens
- Add session management or cookies
