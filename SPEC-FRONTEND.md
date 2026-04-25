# SPEC-FRONTEND.md — Erdbeer App Frontend

## 1. Objective

Build a mobile-first PWA for the Erdbeer App — a strawberry purchase tracker where family groups compete for the highest total consumption during the season. The frontend consumes a PHP/MySQL JSON API.

**Target users:** Non-technical family members logging purchases on their phones at supermarkets and farmers' markets. The app must feel native, fast, and obvious.

**Success criteria:**
- A group member can log a purchase in under 10 seconds
- The leaderboard updates immediately after a purchase is logged
- The app feels native on mobile (smooth transitions, no jank)

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React 19 + Vite | Modern DX, fast builds, PWA plugin available |
| Styling | Tailwind CSS | Utility-first, mobile-first, rapid iteration |
| Routing | React Router v7 | Client-side routing for SPA |
| HTTP | `fetch` | No axios — keep dependencies minimal |
| Language | German | All UI text hardcoded (no i18n library) |
| PWA | vite-plugin-pwa | manifest.json, icons, installability |

## 3. API Contract

The frontend consumes the backend API documented in SPEC-BACKEND.md. Key points:

- **Base path:** `/api/`
- **Auth:** Invite token passed as a URL path segment in every request. No cookies, no headers.
- **Responses:** JSON. Errors: `{"error": "message"}` with standard HTTP status codes.

### Endpoints Used

| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/api/group/:token` | GroupHome — load group info + stats |
| GET | `/api/leaderboard/:token` | Leaderboard, GroupHome mini-leaderboard |
| GET | `/api/purchases/:token` | History — list all purchases |
| POST | `/api/purchases/:token` | NewPurchase — create purchase |
| GET | `/api/purchases/:token/:id` | EditPurchase — load existing purchase |
| PUT | `/api/purchases/:token/:id` | EditPurchase — save changes |
| DELETE | `/api/purchases/:token/:id` | EditPurchase — delete purchase |

### Key Data Formats

- **Prices:** Sent/received as integer cents (`priceCents: 399` = 3,99 €)
- **Dates:** ISO format strings (`"2026-05-10"`)
- **Bag sizes:** Integer grams (`250` or `500`)
- **Price units:** String enum (`"kg"`, `"500g"`, `"250g"`)

## 4. Routes

| Route | Page Component | Description |
|-------|---------------|-------------|
| `/:token` | GroupHome | Entry point via invite link. Group info, stats, quick-log button, mini leaderboard |
| `/:token/erfassen` | NewPurchase | Log a new purchase |
| `/:token/einkauf/:id` | EditPurchase | Edit or delete an existing purchase |
| `/:token/verlauf` | History | Purchase history for this group |
| `/:token/rangliste` | Leaderboard | Full season leaderboard |

The invite token is the top-level path segment. Extracted from the URL via React Router params and passed to the API client.

## 5. UI Screens

All screens are mobile-first (max-width ~480px primary target, responsive up to tablet). German text throughout.

### 5.1 Group Home (`/:token`)

The landing page after tapping the invite link. Shows:
- Group name as header (e.g. "Max & Anna")
- Season name and date range
- Quick stats card: total grams consumed by this group, number of purchases
- **"Einkauf erfassen" button** — prominent, primary action
- Mini leaderboard preview: top 3 groups with their totals, this group highlighted
- Links to full "Rangliste" and "Verlauf"

### 5.2 Purchase Form (`/:token/erfassen`)

The core interaction — must be completable in under 10 seconds.

**Fields:**
- **Datum** (date): defaults to today, date picker available
- **Einkaufspositionen** (line items): repeatable section
  - Beutelgröße (bag size): toggle between 250g and 500g
  - Anzahl (quantity): number stepper, starts at 1
  - Preis (price): numeric input in euros (e.g. "3,99")
  - Preiseinheit (price unit): toggle between "pro kg", "pro 500g", "pro 250g"
- **"+ Weitere Position"** button to add another line item (most purchases will be 1 item)
- **"Speichern"** button

**Optimized for the common case:** Buy 1 type of strawberry bag → set size, quantity, price, save. One line item, four taps + one number entry.

### 5.3 Edit Purchase (`/:token/einkauf/:id`)

Same form as 5.2, pre-filled with existing data. Additional "Löschen" button with confirmation dialog.

### 5.4 Purchase History (`/:token/verlauf`)

Chronological list (newest first) of all purchases for this group.

Each row shows:
- Date
- Summary: e.g. "2× 500g, 1× 250g" (total bags and sizes)
- Total grams
- Total price
- Tap to edit

### 5.5 Leaderboard (`/:token/rangliste`)

Ranked list of all groups in the season by total grams consumed.

Each row shows:
- Rank (1, 2, 3, ...)
- Group name
- Total grams (formatted: e.g. "4,5 kg" or "750 g")
- Number of purchases

The current group is visually highlighted. The ranking should feel alive — consider showing the gap to the next group (e.g. "+250g vor Platz 3").

## 6. Frontend Validation

Validation is for UX — the backend is the source of truth.

- Price input accepts comma as decimal separator (German format: "3,99"), converted to cents before API call
- Date defaults to today, cannot be set outside the season date range
- Bag size must be 250 or 500
- Quantity must be a positive integer (1-99)
- Price must be a positive number (0,01-999,99)
- At least 1 line item required

## 7. Project Structure

```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── public/
│   ├── manifest.json
│   └── icons/
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── api.js                  # API client (fetch wrapper, token-scoped)
    ├── routes.jsx              # React Router config
    ├── components/
    │   ├── Layout.jsx          # Shell: header, nav
    │   ├── LeaderboardCard.jsx # Mini leaderboard for GroupHome
    │   ├── PurchaseForm.jsx    # Shared form for new + edit
    │   ├── PurchaseList.jsx    # Purchase history list
    │   └── StatsCard.jsx       # Group stats display
    └── pages/
        ├── GroupHome.jsx
        ├── NewPurchase.jsx
        ├── EditPurchase.jsx
        ├── History.jsx
        └── Leaderboard.jsx
```

### Deployment

- Built with `vite build`, output to `dist/`
- Served as static files at the subdomain root
- Server config (`.htaccess` or nginx) routes everything except `/api/*` to `index.html` for SPA fallback

## 8. Code Style

- Functional components with hooks
- React Router v7 for routing
- `fetch` for API calls (no axios)
- German text hardcoded in components (no i18n library for a single-language app)
- Tailwind CSS for all styling — no custom CSS files unless necessary
- Price formatting: German locale (`de-DE`), comma separator, euro sign

## 9. Testing Strategy

- Vitest for unit tests on utility functions (price normalization, euro formatting, gram formatting)
- Manual testing on mobile devices (Chrome on Android, Safari on iOS)
- Lighthouse audit for PWA compliance

### Acceptance Criteria

- [ ] Opening an invite link loads the group home page with correct group name
- [ ] Logging a purchase with 1 item completes in under 10 seconds
- [ ] Logging a purchase with 2 items works correctly
- [ ] Editing a purchase pre-fills all fields correctly
- [ ] Deleting a purchase shows confirmation and removes it from history
- [ ] Leaderboard shows all groups ranked by total grams
- [ ] Current group is highlighted on the leaderboard
- [ ] Invalid invite token shows a German error message
- [ ] Price input accepts German comma format (e.g. "3,99")
- [ ] Date defaults to today and cannot be set outside the season
- [ ] App is installable as PWA on mobile

## 10. Boundaries

### Always Do
- Default the date to today on the purchase form
- Format grams as "X,X kg" (above 1000g) or "X g" (below)
- Format prices in German locale with euro sign
- Show loading states during API calls
- Navigate back to group home after successful save/delete

### Ask First
- Significant changes to the UI flow or screen layout
- Adding new pages or routes
- Changes to the component structure

### Never Do
- Add user authentication UI (login, signup, profile)
- Add offline support or service worker caching of data
- Add push notification UI or permission requests
- Add non-German language support
- Add an admin interface
