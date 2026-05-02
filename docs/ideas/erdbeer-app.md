# Erdbeer App — Strawberry Season Scoreboard

## Problem Statement

How might we make tracking strawberry purchases fun and competitive across family groups during berry season, so everyone stays engaged and we can see who's eating the most?

## Recommended Direction

A **mobile-first PWA** (Progressive Web App) with no app store install required. Each competing group gets a unique shareable link. Tapping it opens the app scoped to that group.

The core loop is: **Buy strawberries → Open link → Log bags + price → Check leaderboard.** The entry flow must complete in under 10 seconds. The leaderboard is the reward — a running tally of total grams per group for the season, visible to all groups.

Price data is captured (per kg, per 500g, or per 250g) and normalized to price/kg internally. This enables a secondary "best deal" stat but the primary competition metric is **total weight consumed.**

No accounts, no passwords. A shared link per group is the access control. Simple, trust-based, appropriate for a family context.

## Tech Stack

- **Frontend:** React + Vite, mobile-first PWA. Modern, app-like UX with smooth interactions.
- **Backend:** PHP with MySQL database, deployed to existing server.
- **Language:** German (UI text)
- **Admin:** Competition/season setup via phpMyAdmin (direct DB inserts) — no admin UI in MVP.

## Key Assumptions to Validate

- [ ] People will actually log purchases consistently — test by having 2+ groups log for the first week
- [ ] The competition is motivating enough at 3+ groups — observe if groups check the leaderboard between purchases
- [ ] 10-second logging is achievable — time real users on the entry flow
- [ ] A PWA without push notifications gets enough return visits — monitor weekly active usage

## MVP Scope

**In:**

- Group creation with shareable invite link (groups + seasons created via phpMyAdmin)
- Purchase logging: number of bags per size (250g, 500g), price with unit selection (per kg / per 500g / per 250g)
- Season leaderboard: total grams per group, ranked
- Purchase history per group
- Mobile-first responsive design with modern, app-like UX
- German UI

**Out (for now):**

- Admin UI for competition/season management
- Individual user accounts / authentication
- Photo capture of receipts
- Push notifications
- Price comparison / "best deal" leaderboard (data is captured but not surfaced yet)
- Bot integration (WhatsApp/Threema — future option)
- Multi-season history / archiving
- Vendor/source tracking ("where did you buy them")
- Offline support

## Not Doing (and Why)

- **Admin UI** — phpMyAdmin is sufficient for creating competitions and groups. Building an admin panel is wasted scope for a family app with one admin.
- **Individual accounts** — adds friction, not needed in a trust-based family context.
- **Push notifications** — requires service workers, notification permissions, and a nudging strategy; overkill for MVP. If engagement is low, revisit.
- **Photo/receipt capture** — nice-to-have that adds scope (camera permissions, storage, UI). Doesn't help the core competition.
- **Bot integration** — deferred. WhatsApp/Threema bots are complex to set up. Worth revisiting if the app proves the concept.
- **Price analytics** — the data is captured and normalized, but no UI for comparing prices yet. Ship the scoreboard first.
- **Offline support** — syncing offline entries adds significant complexity. Start online-only; most purchases happen where there's cell signal.

## Data Model (Sketch)

- **seasons** — id, name, start_date, end_date
- **groups** — id, season_id, name, invite_token (for shareable link)
- **purchases** — id, group_id, date, created_at
- **purchase_items** — id, purchase_id, bag_size_grams (250 or 500), quantity, price_cents, price_unit (kg/500g/250g)

Price is stored as entered. Normalized price/kg is computed on read.

## Open Questions

- *(None remaining — ready to spec and build)*
