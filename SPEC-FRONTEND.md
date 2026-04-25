# SPEC-FRONTEND.md — Erdbeer App Frontend

## 1. Objective

Build a mobile-first PWA for the Erdbeer App — a strawberry purchase tracker where family groups compete for the highest total consumption during the season. The frontend consumes a PHP/MySQL JSON API.

**Target users:** Non-technical family members logging purchases on their phones at supermarkets and farmers' markets. The app must feel native, fast, and obvious.

**Success criteria:**
- A group member can log a purchase in under 10 seconds (measured from tapping "Einkauf erfassen" to save confirmation, on a 4G connection)
- The leaderboard updates immediately after a purchase is logged
- The app feels native on mobile (smooth transitions, no jank)

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React 19 + Vite | Modern DX, fast builds, PWA plugin available |
| Styling | Tailwind CSS | Utility-first, mobile-first, rapid iteration |
| Routing | React Router v7 | Client-side routing for SPA, layout routes, error boundaries |
| HTTP | `fetch` | No axios — keep dependencies minimal |
| Language | German | All UI text hardcoded (no i18n library) |
| PWA | vite-plugin-pwa | Manifest, icons, installability. Configured for static-asset precaching only — no runtime caching, no navigation caching, never cache API responses or token-bearing URLs. |
| Font | System font stack | Tailwind default `font-sans` (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...`) — native feel, zero loading cost |

## 3. API Contract

The frontend consumes the backend API documented in SPEC-BACKEND.md. Key points:

- **Base path:** `/api/` (configurable via `VITE_API_BASE_URL` env var, defaults to `/api`)
- **Auth:** Invite token passed as a URL path segment in every request. No cookies, no headers.
- **Response envelope:** All successful responses wrap data in `{ "data": ... }`. Errors use `{ "error": { "code": "...", "message": "..." } }` with machine-readable codes and German messages.
- **Content-Type:** All requests with a body must send `Content-Type: application/json`.
- **Success status codes:** POST returns **201 Created** (not 200) with a `Location` header. GET/PUT/DELETE return 200. Use `response.ok` to check for success (covers both 200 and 201).
- **Computed fields:** The backend computes `totalPriceCents`, `totalGrams`, `pricePerKgCents`, and `avgPricePerKgCents`. The frontend should always use backend-returned values and never compute these locally.

### API Client (`api.js`)

The API client module provides a consistent interface for all API calls:

- Accepts the invite token and builds the full URL
- Sets `Content-Type: application/json` on all POST/PUT requests
- On success (2xx): unwraps the `{ "data": ... }` envelope and returns the inner data
- On error (4xx/5xx): throws a typed error object with `{ code, message }` from the error envelope
- Sets a 15-second fetch timeout via `AbortController`

### Endpoints Used

| Method | Endpoint | Used By |
|--------|----------|---------|
| GET | `/api/group/:token` | GroupHome — load group info + stats + avgPricePerKgCents |
| GET | `/api/leaderboard/:token` | Leaderboard, GroupHome mini-leaderboard. Returns rank, gapToNextGrams, and full season dates. |
| GET | `/api/purchases/:token` | History — list all purchases with summary totals and per-item pricePerKgCents |
| POST | `/api/purchases/:token` | NewPurchase — create purchase |
| GET | `/api/purchases/:token/:id` | EditPurchase — load existing purchase |
| PUT | `/api/purchases/:token/:id` | EditPurchase — full replace (date + all items) |
| DELETE | `/api/purchases/:token/:id` | EditPurchase — delete purchase |

### Key Data Formats

- **Prices:** Sent/received as integer cents (`priceCents: 399` = 3,99 EUR). Normalized `pricePerKgCents` is computed by the backend and returned on each item.
- **Dates:** ISO format strings (`"2026-05-10"`)
- **Bag sizes:** Integer grams (`250` or `500`)
- **Price units:** String enum (`"kg"`, `"500g"`, `"250g"`)
- **German number formatting:** Period as thousands separator (`1.500 g`), comma as decimal separator (`4,5 kg`). Euro amounts use German locale with comma decimal (`3,99 EUR`).

### Error Handling

The API returns structured errors. The frontend should switch on `error.code` (not the German message) for control flow:

| Code | HTTP | Meaning |
|------|------|---------|
| `GROUP_NOT_FOUND` | 404 | Invalid or expired invite token |
| `PURCHASE_NOT_FOUND` | 404 | Purchase doesn't exist or doesn't belong to this group |
| `VALIDATION_ERROR` | 400 | Request body fails validation |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Missing or wrong Content-Type header (should never occur if `api.js` is used correctly — falls through to generic error display) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

Display `error.message` to the user (it's already in German). Always render error messages as text content, never as raw HTML.

**Backend dependency — season expiry:** The current backend rejects ALL requests (including reads) when the season ends, returning `GROUP_NOT_FOUND`. This means users lose access to their data the day after the season ends. The backend should be updated to either allow read-only access to ended seasons or return a distinct `SEASON_INACTIVE` error code. The frontend should handle both cases: display "Die Saison ist beendet!" with read-only data when possible, or a clear German message explaining the season has ended (not the misleading "Gruppe nicht gefunden").

## 4. Routes

| Route | Page Component | Description |
|-------|---------------|-------------|
| `/:token` | Layout (with TokenProvider + Outlet) | Layout route — validates token, provides group/season context |
| `/:token` (index) | GroupHome | Entry point via invite link. Group info, stats, quick-log button, mini leaderboard |
| `/:token/erfassen` | NewPurchase | Log a new purchase |
| `/:token/einkauf/:id` | EditPurchase | Edit or delete an existing purchase |
| `/:token/verlauf` | History | Purchase history for this group |
| `/:token/rangliste` | Leaderboard | Full season leaderboard |
| `/:token/*` | NotFound | Catch-all — "Seite nicht gefunden" with link back to group home |

The invite token is the top-level path segment. `/:token` is a **layout route** that wraps all child routes:

1. Extracts the token from `useParams()`
2. Fetches group/season data via `GET /api/group/:token`
3. Provides `{ token, group, season }` via `TokenContext` to all descendants
4. Renders `Layout` component (header, navigation) with `<Outlet />`

### Error Boundaries

- **Root level (`/:token`):** `GROUP_NOT_FOUND` renders a full-page error: "Ungültiger Einladungslink" — no navigation, since nothing can function without a valid token.
- **Route level (`/:token/einkauf/:id`):** `PURCHASE_NOT_FOUND` navigates back to history with an error toast.
- **Generic fallback:** `INTERNAL_ERROR` or unexpected errors render "Etwas ist schiefgelaufen" with a "Nochmal versuchen" retry button.

## 5. Design System

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#E53935` (strawberry red) | Primary buttons, active states, rank highlights, navigation accent |
| Secondary | `#43A047` (leaf green) | Success indicators, positive deltas, season progress |
| Background | `#FFF8F5` (warm off-white) | Page background |
| Surface | `#FFFFFF` (white) | Cards, input backgrounds |
| Text | `#1A1A1A` (near-black) | Body text |
| Text Secondary | `#6B7280` (medium gray) | Labels, captions, secondary info |
| Accent | `#FFB300` (gold/amber) | Rank #1 badge/trophy |
| Error | `#D32F2F` (deep red) | Error states, destructive actions (distinct from primary red) |

Map to Tailwind config `extend.colors` for consistent usage.

### Typography

- **Font family:** System font stack (`font-sans` in Tailwind) — native feel, zero loading cost
- **Type scale:**
  - Page title: 24px / `text-2xl` bold
  - Section header: 18px / `text-lg` semibold
  - Card title: 16px / `text-base` semibold
  - Body: 14px / `text-sm`
  - Caption/label: 12px / `text-xs` medium
- **Numeric display:** Use `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`) for leaderboard totals, stats, and prices — ensures aligned columns

### Spacing

- **Page padding:** 16px horizontal (`px-4`), consistent across all screens
- **Card padding:** 12px internal (`p-3`), 12px gap between cards (`space-y-3`)
- **Section gaps:** 24px between major sections (`space-y-6`)
- **Max width:** Content constrained to 480px centered (`max-w-md mx-auto`) on larger screens
- **Safe areas:** Apply `env(safe-area-inset-*)` padding for notched devices, especially bottom (navigation bar) and top (standalone PWA status bar)

### Component Inventory

| Component | Spec |
|-----------|------|
| Primary button ("Einkauf erfassen", "Speichern") | Full-width, 48px min height, strawberry-red bg, white text, `rounded-xl`, subtle shadow |
| Secondary button ("+ Weitere Position") | Ghost/outline style, same height |
| Destructive button ("Löschen") | Red outline or red text — not filled, prevents accidental taps |
| Form inputs | 48px min height, `rounded-lg`, light gray border, 16px font size (prevents iOS auto-zoom on focus) |
| Bag size toggle | Segmented control — two large buttons side by side, selected state filled with primary color. NOT a dropdown. |
| Price unit toggle | Segmented control — three buttons ("pro kg" / "pro 500g" / "pro 250g"). NOT a dropdown. |
| Number stepper | -/+ buttons flanking a centered number, minimum 44x44px touch targets per button |
| Cards | White background, `rounded-xl`, `shadow-sm`, 12-16px padding |
| All interactive elements | Minimum 44x44px touch targets (iOS guideline) |

## 6. UI Screens

All screens are mobile-first (max-width ~480px primary target, responsive up to tablet). German text throughout. Use everyday, informal language — this is a fun family app, not a business tool.

### 6.1 Group Home (`/:token`)

The landing page after tapping the invite link.

**Visual hierarchy (top to bottom):**
1. **Header:** Group name (e.g. "Max & Anna") + season name and date range — compact, not a card
2. **Welcome text (first visit / 0 purchases):** "Wer kauft die meisten Erdbeeren? Trag deinen Einkauf ein und finde es heraus!" — disappears once purchases exist
3. **CTA hero:** "Einkauf erfassen" button — the most visually dominant element, strawberry-red, prominent
4. **Stats row:** Three compact inline stats — total grams, number of purchases, average price per kg. Bold numbers with labels beneath.
5. **Mini leaderboard:** Top 3 groups with totals and ranks, current group highlighted (strawberry-red accent). Gap to next group (e.g. "500g hinter Platz 2!"). See leaderboard edge cases below.
6. **Season progress:** Thin progress bar with "noch X Tage" countdown
7. **Links** to full "Rangliste" and "Verlauf"

**Leaderboard edge cases on GroupHome:**
- Current group is rank 1: show "Platz 1!" or "Ihr führt!" — omit gap text
- `gapToNextGrams` is `0` (tied): show "Gleichauf auf Platz X!"
- Only 1 group in season: show the group normally, omit gap metric
- Less than 3 groups: show however many exist without looking broken
- Gap text always refers to the next rank up (from API `gapToNextGrams`), NOT always rank 1

**Empty state (0 purchases):**
"Noch keine Einkäufe — los geht's!" with the CTA button prominently featured.

**Season states:**
- Before season start: "Die Saison startet am [date]" — hide the purchase CTA, show leaderboard/stats as empty
- After season end: "Die Saison ist beendet!" banner — display final leaderboard and history as read-only, hide the purchase CTA
- Season countdown: shows "noch X Tage" during season, "Saison beendet" after end date

**Success toast:** After redirect from save/delete, show a toast: "Einkauf gespeichert!" or "Einkauf gelöscht!"

### 6.2 Purchase Form (`/:token/erfassen`)

The core interaction — must be completable in under 10 seconds for the common case.

The form must load group/season data (from `TokenContext`) before rendering, to enforce date range validation.

**Fields:**
- **Datum** (date): defaults to today, native `<input type="date">` (acceptable cross-platform differences). Cannot be set outside the season date range.
- **Was hast du gekauft?** (line items): repeatable section, 1 item shown by default
  - Beutelgröße (bag size): segmented control, 250g and 500g. Defaults to **500g** (most common German supermarket size).
  - Anzahl (quantity): number stepper, starts at 1. Uses `inputmode="numeric"`.
  - Preis (price): text input with `inputmode="decimal"` (NOT `type="number"` — comma won't work). Shows "EUR" suffix. Accepts both comma and period as decimal separator. Converted to cents before API call via `Math.round(parseFloat(value.replace(',', '.')) * 100)`.
  - Preis gilt für... (price unit): segmented control, "pro kg" / "pro 500g" / "pro 250g". Defaults to **"pro 500g"**.
- **"+ Weitere Position"** button to add another line item (most purchases will be 1 item). Remove item via X button (hidden when only 1 item remains).
- **"Speichern"** button — fixed to bottom of viewport (always thumb-reachable)

**Optimized for the common case:** Buy 1 type of strawberry bag at the supermarket. With 500g and "pro 500g" as defaults, the user only needs to enter the price and tap save.

**Form behavior:**
- Auto-focus the price input field on load (the first field that needs user input, since date, bag size, and price unit all have sensible defaults)
- Inline validation: highlight invalid fields immediately with German error text (e.g. "Bitte einen gültigen Preis eingeben"). Disable "Speichern" until the form is valid.
- On submit: disable the "Speichern" button and show a spinner (prevents double-submit on slow connections)
- On success: navigate to GroupHome with success toast
- On failure: preserve form state, show inline error banner with the error message

### 6.3 Edit Purchase (`/:token/einkauf/:id`)

Same form as 6.2, pre-filled with existing data. Additional "Löschen" button (destructive style — red outline, not filled) with confirmation dialog (`ConfirmDialog` component).

Unsaved changes guard (`useBlocker`) is deferred to post-MVP.

### 6.4 Purchase History (`/:token/verlauf`)

Chronological list (newest first) of all purchases for this group.

Each row shows:
- Date
- Summary: e.g. "2x 500g, 1x 250g" (total bags and sizes)
- Total grams
- Total price (formatted from `totalPriceCents` using German locale: e.g. "7,98 EUR")
- Tap to edit

**Empty state:** "Noch keine Einkäufe erfasst" with a CTA to log the first purchase.

### 6.5 Leaderboard (`/:token/rangliste`)

Ranked list of all groups in the season by total grams consumed.

Each row shows:
- Rank number (from API `rank` field)
- Group name (truncated with ellipsis if too long for screen width)
- Total grams (formatted: e.g. "4,5 kg" or "750 g")
- Number of purchases

**Gap display:**
- `gapToNextGrams: null` (rank 1): show "Platz 1!" badge — omit gap text. Gold accent treatment.
- `gapToNextGrams: 0` (tied): show "Gleichauf auf Platz X!"
- `gapToNextGrams > 0`: show gap to the group ahead (e.g. "+1.500g hinter Platz 2!")
- Single group in season: render normally, omit gap metric
- Groups with 0 purchases: show "Noch keine Einkäufe" instead of "0 g"

**Current group highlight:** Strawberry-red left border or tinted background (`bg-red-50`) with a "Du" badge.

## 7. Frontend Validation

Validation is for UX — the backend is the source of truth.

- Price input accepts both comma and period as decimal separator (German format: "3,99" or "3.99"), converted to cents before API call
- Date defaults to today, cannot be set outside the season date range. Season dates are loaded from `TokenContext` (via the initial group fetch).
- Bag size must be 250 or 500
- Quantity must be a positive integer (1-99)
- Price must be a positive number (0,01-999,99)
- At least 1 line item required, maximum 20 items per purchase

## 8. Data Fetching & State

### Token Context

A `TokenProvider` wraps all `/:token/*` routes. It:
- Extracts the token from React Router params
- Fetches group + season data on mount
- Provides `{ token, group, season, loading, error }` to all descendants via `TokenContext`
- Handles the "invalid token" case at the layout level (error boundary)

### Data Fetching Hook

A `useApi(url)` custom hook provides a consistent pattern for all data fetching:
- Returns `{ data, loading, error, refetch }`
- Calls `api.js` with the token from context
- Fetches on mount
- No client-side cache, no optimistic updates

### Data Flow

- Each page fetches its own data via `useApi` on mount
- After a mutation (create/edit/delete purchase), navigate back to GroupHome, which refetches on mount
- No shared client-side cache — always refetch. The API targets < 200ms responses, so this is fast enough.
- Layout receives group name from `TokenContext` (seeded by the layout route's initial fetch)

### Form State

The purchase form uses `useReducer` for managing the dynamic line items array:
```
State: { date: string, items: [{ bagSizeGrams, quantity, priceDisplay, priceUnit }] }
Actions: ADD_ITEM, REMOVE_ITEM, UPDATE_ITEM, SET_DATE, RESET
```
`RESET` is used for initializing the edit form from API data.

## 9. Navigation

**Bottom navigation bar** with 4 tabs:
- Home (house icon)
- Erfassen (+ icon, visually emphasized with primary color)
- Verlauf (list/clock icon)
- Rangliste (trophy icon)

The bar is fixed to the bottom of the viewport with `env(safe-area-inset-bottom)` padding for notched devices.

**On form screens** (NewPurchase, EditPurchase): replace the bottom nav with a contextual top bar containing a back arrow and page title.

## 10. Loading, Error & Empty States

### Loading States

- **Data screens** (GroupHome, History, Leaderboard): skeleton placeholders matching card/row layouts (gray pulsing rectangles). Not a centered spinner.
- **Form submissions:** "Speichern" button shows a spinner and is disabled. Form inputs remain visible but non-interactive.

### Error States

- **Invalid token** (`GROUP_NOT_FOUND`): full-page error — "Ungültiger Einladungslink" with no navigation (nothing can function).
- **API failure on data screens:** inline error banner with "Nochmal versuchen" retry button. Preserve any existing data if available.
- **API failure on form submit:** inline error banner above the form. Preserve all form state. User can retry.
- **Network failure / timeout:** generic German message: "Keine Verbindung zum Server. Bitte versuche es erneut."
- **Fetch timeout:** 15 seconds via `AbortController`, then show the network error message.

### Empty States

- **GroupHome, 0 purchases:** "Noch keine Einkäufe — los geht's!" with the purchase CTA prominently featured.
- **Purchase History, empty:** "Noch keine Einkäufe erfasst" with a button to log the first purchase.
- **Leaderboard, all groups at 0g:** Show the list normally, display "Noch keine Einkäufe" instead of "0 g" per group.

### Success Feedback

After save or delete, show a toast/snackbar on the GroupHome page:
- After save: "Einkauf gespeichert!"
- After delete: "Einkauf gelöscht!"

Toast auto-dismisses after 4 seconds.

### Season States

- **Before season start:** "Die Saison startet am [date]" — hide the purchase CTA, show empty leaderboard/stats.
- **After season end:** "Die Saison ist beendet!" banner — display final leaderboard and history as read-only, hide the purchase CTA and the "Erfassen" navigation tab.

## 11. Project Structure

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
    ├── routes.jsx              # React Router config (layout routes, error boundaries)
    ├── context/
    │   └── TokenContext.jsx    # Token + group/season provider
    ├── hooks/
    │   └── useApi.js           # Data fetching hook { data, loading, error, refetch }
    ├── components/
    │   ├── Layout.jsx          # Shell: header, bottom nav, Outlet
    │   ├── LeaderboardCard.jsx # Mini leaderboard for GroupHome
    │   ├── PurchaseForm.jsx    # Shared form for new + edit
    │   ├── PurchaseList.jsx    # Purchase history list
    │   ├── StatsCard.jsx       # Group stats display
    │   ├── ConfirmDialog.jsx   # Reusable confirmation dialog (delete)
    │   └── Toast.jsx           # Success/error toast notifications
    └── pages/
        ├── GroupHome.jsx
        ├── NewPurchase.jsx
        ├── EditPurchase.jsx
        ├── History.jsx
        ├── Leaderboard.jsx
        └── NotFound.jsx
```

### Local Development

Vite dev server proxy for API calls:
```js
// vite.config.js
server: {
  proxy: {
    '/api': 'http://localhost:8080'
  }
}
```

The `VITE_API_BASE_URL` environment variable (defaults to `/api`) configures the API base path in `api.js`.

### Deployment

- Built with `vite build`, output to `dist/`
- Served as static files at the subdomain root
- **HTTPS required** for production. HTTP requests must redirect to HTTPS.
- Server config (`.htaccess` or nginx) routes everything except `/api/*` to `index.html` for SPA fallback

### Security Headers (Static File Server)

The static file server must set the following headers on all responses:
- `Referrer-Policy: no-referrer` (critical — prevents token leakage via Referer header)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` (no reason to embed in iframes)
- `Strict-Transport-Security: max-age=31536000`

### Required HTML Meta Tags (`index.html`)

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#E53935">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="referrer" content="no-referrer">
```

### PWA Configuration

Manifest fields (`manifest.json`):
- `name`: "Erdbeer App"
- `short_name`: "Erdbeeren"
- `display`: "standalone"
- `orientation`: "portrait"
- `start_url`: "/" (generic — the token-specific context comes from the invite link URL)
- `theme_color`: "#E53935"
- `background_color`: "#FFF8F5"

Required icon sizes: 192x192, 512x512, and a maskable variant.

`vite-plugin-pwa` configuration: `generateSW` mode with `navigateFallback` for SPA routing. Precache static assets (JS, CSS, icons) only. Do NOT cache API responses or URLs containing the invite token.

**In-app browser note:** Invite links shared via WhatsApp/Signal/Telegram open in in-app browsers that don't support PWA install. Consider detecting in-app browsers and showing a banner: "Für das beste Erlebnis in deinem Browser öffnen" with instructions.

## 12. Code Style

- Functional components with hooks
- React Router v7 for routing (layout routes, error boundaries, `useParams`, `useNavigate`)
- `fetch` for API calls (no axios)
- German text hardcoded in components (no i18n library for a single-language app). Use everyday, informal language — not bureaucratic German.
- Tailwind CSS for all styling — no custom CSS files unless necessary
- Price formatting: German locale (`de-DE`), comma as decimal separator, euro sign
- Number formatting: period as thousands separator (`1.500 g`), comma as decimal separator (`4,5 kg`)
- Numeric displays (leaderboard, stats, prices): use `tabular-nums` (Tailwind class) for aligned columns

## 13. Testing Strategy

- Vitest for unit tests on utility functions (price normalization, euro formatting, gram formatting, comma/period parsing)
- Manual testing on mobile devices (Chrome on Android, Safari on iOS)
- Lighthouse audit for PWA compliance — target performance score >= 90 on mobile throttling

### Acceptance Criteria

- [ ] Opening an invite link loads the group home page with correct group name
- [ ] Logging a purchase with 1 item completes in under 10 seconds (from CTA tap to save confirmation, on 4G)
- [ ] Logging a purchase with 2 items works correctly
- [ ] Editing a purchase pre-fills all fields correctly
- [ ] Deleting a purchase shows confirmation dialog and removes it from history
- [ ] Leaderboard shows all groups ranked by total grams
- [ ] Current group is highlighted on the leaderboard with "Du" badge
- [ ] Rank 1 group shows "Platz 1!" badge, no gap text
- [ ] Tied groups show "Gleichauf auf Platz X!"
- [ ] Invalid invite token shows full-page German error ("Ungültiger Einladungslink")
- [ ] Price input accepts German comma format (e.g. "3,99") and period format (e.g. "3.99")
- [ ] Date defaults to today and cannot be set outside the season
- [ ] App is installable as PWA on mobile
- [ ] Submit button is disabled during API requests (no double-submit)
- [ ] Success toast appears after save/delete
- [ ] Empty states show friendly German messages (not blank screens)
- [ ] Loading states show skeleton placeholders (not blank screens)
- [ ] API errors show inline German error messages with retry option
- [ ] Season ended state shows read-only data with "Saison beendet" banner
- [ ] GroupHome with 0 purchases shows welcome message and CTA

## 14. Boundaries

### Always Do
- Default the date to today on the purchase form
- Default bag size to 500g and price unit to "pro 500g"
- Format grams as "X,X kg" (above 1000g) or "X g" (below), with period as thousands separator
- Format prices in German locale with euro sign
- Show skeleton loading states during API calls
- Show success toast after save/delete
- Navigate back to group home after successful save/delete
- Disable submit button during API requests
- Use `inputmode="decimal"` for price inputs, `inputmode="numeric"` for quantity
- Use semantic HTML (buttons for actions, links for navigation)
- Ensure minimum 44x44px touch targets for all interactive elements
- Set `Referrer-Policy: no-referrer` meta tag in `index.html`
- Use backend-computed values for totals, averages, and price-per-kg

### Ask First
- Significant changes to the UI flow or screen layout
- Adding new pages or routes
- Changes to the component structure
- Changes to the color palette or design system

### Never Do
- Add user authentication UI (login, signup, profile)
- Add offline support or service worker caching of API data
- Add push notification UI or permission requests
- Add non-German language support
- Add an admin interface
- Persist the invite token in localStorage, sessionStorage, or cookies
- Add external third-party scripts, analytics, or tracking (referrer leak risk with token-in-URL)
- Use `<input type="number">` for price fields (breaks German comma input)
- Cache API responses or token-bearing URLs in the service worker
- Compute totals or price-per-kg on the frontend (use backend values)

### Known Limitations

These are acknowledged tradeoffs for MVP scope:

- **Bag sizes limited to 250g/500g.** Users buying 1kg containers should log as 2x 500g. Custom weight entry is a post-MVP enhancement.
- **No concurrent edit detection.** If two people edit the same purchase simultaneously, the last save wins. Acceptable for a family context.
- **Token-in-URL exposure.** The invite token is visible in browser history, URL bar, and screenshots. Acceptable for a trust-based family app. Mitigated by `Referrer-Policy: no-referrer` and HTTPS-only deployment.
- **No dark mode.** Use Tailwind semantic color tokens in `tailwind.config.js` so dark mode can be added later with `dark:` variants.
- **No accessibility audit.** Basic accessibility is ensured via semantic HTML, 44px touch targets, and sufficient color contrast (WCAG AA). A full audit is post-MVP.
