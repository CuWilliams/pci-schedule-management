# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static GitHub Pages site for Power Conditioning Inc. (three locations: St. John's, Clarenville, and the Ascend studio in St. John's). It's both:

1. A **member-facing booking app** — role-based login (owner/admin/instructor/member), schedule browsing, class booking, credit packages, and an instructor roll-call/attendance view.
2. A **change-management staging layer** for the schedule — Ryan reviews schedule changes at the live URL before they are applied in Studio Bookings.

**Live URL:** https://CuWilliams.github.io/pci-schedule-management

**Repo:** `CuWilliams/pci-schedule-management` on `main` branch.

## Local Development

No build system. Serve files locally — the JSON fetches and `pci-tokens.css` link require an HTTP server (opening `file://` directly will fail).

```bash
# VS Code Live Server is configured for port 5501
# Open index.html, schedule.html, or admin.html in Live Server
```

The `.vscode/settings.json` sets `liveServer.settings.port` to `5501`.

## Architecture

This is a **zero-dependency static site** — no framework, no bundler, no npm. All logic is vanilla JS embedded directly in the HTML files. Shared design tokens live in one CSS file linked by all pages.

### Files

| File | Purpose |
|---|---|
| `index.html` | Landing page — location selector (St. John's, Clarenville, Ascend) |
| `login.html` | Sign in — validates against `data/users.json` via `pci-auth.js` |
| `schedule.html` | Schedule viewer — list + week calendar views, booking entry point |
| `admin.html` | Auth-gated admin UI (owner/admin) — full CRUD + GitHub publish |
| `instructor.html` | Instructor view — class roster, roll-call attendance, team-booking headcount/invoice drafts |
| `profile.html`, `settings.html` | Member account pages |
| `buy-credits.html` | My Packages (member's wallet) + package catalog and purchase flow |
| `stjohns.html`, `clarenville.html`, `ascend.html` | Per-location center pages — map, About, Gallery. Identical templates differing only in name/address strings; all three share the same nav drawer |
| `pci-auth.js` | Shared `PciAuth` role-based session module (see Auth section) |
| `pci-tokens.css` | Shared design tokens + component CSS (edit directly and commit; not published via admin) |
| `pci-shared.js` | Shared JS constants that mirror CSS tokens (e.g. `COLOR_HEX`) + all package-wallet logic — loaded by **every** page that loads `pci-auth.js` |
| `pci-payments.js` | Payment provider adapter (`PciPayments`) — mock today, Stripe later; loaded only by buy-credits.html |
| `pci_schedule.json` | Canonical schedule data (v2.0 schema) — published from admin |
| `data/class_types.json` | Class type definitions (read-only, not published via admin) |
| `data/categories.json` | Category definitions incl. color mapping and `type_ids` (read-only, not published via admin) |
| `data/instructors.json` | Instructor roster — published from admin |
| `data/locations.json` | Location definitions (read-only, not published via admin) |
| `data/users.json` | Mock auth accounts (email/`password_mock`/role) + each member's `packages[]` wallet — published from admin |
| `data/packages.json` | Credit package definitions — published from admin |
| `data/settings.json` | App-wide config (`roll_call_unlock_minutes`, `payment_provider`) — published from admin |
| `data/bookings.json` | Mock booking seed; live booking state lives in `localStorage` |

### Navigation

The site uses plain `<a href>` navigation:

- `index.html` → `schedule.html?loc=stjohns`, `?loc=clarenville`, or `?loc=ascend`
- `index.html` → `stjohns.html`, `clarenville.html`, `ascend.html` (View Center CTA)
- Adding a location means touching all of: `data/locations.json`, the `loc-tab` row + `_initialLocation` + `locationCategories`/`locationInstructors` + `displayTitle()` in `schedule.html`, `displayTitle()` in `instructor.html`, `suggestColor()` in `admin.html`, an `index.html` card, a new center page, and the nav drawer in every page that has one
- `schedule.html` reads the `loc` URL param on load to pre-select the active location tab (`stjohns` default)
- `schedule.html` → `admin.html` (Admin link in topbar)
- `admin.html` → `schedule.html` (← Schedule back-link in topbar)
- `pci-tokens.css` must be committed to GitHub to take effect on the live site (same workflow as `class_types.json`)

### Data Flow

Pages `fetch()` the JSON files they need on load. `admin.html` writes changes back to GitHub via the Contents API (base64 PUT). Writable from admin: `pci_schedule.json`, `data/instructors.json`, `data/users.json`, `data/packages.json`, and `data/settings.json`. `class_types.json`, `categories.json`, `locations.json`, and `pci-tokens.css` must be edited directly and committed.

### `pci_schedule.json` Schema (v2.0)

```json
{
  "id": "mon_001",
  "time_start": "06:00",
  "time_end": "07:00",
  "title": "St. John's Functional HIIT (co-ed)",
  "location_id": "stjohns",
  "is_online": false,
  "instructors": ["Ryan Power"],
  "instructor_ids": ["ryan_power"],
  "color": "purple",
  "type": "functional_hiit",
  "sub_location": null,
  "capacity": 18
}
```

- `id` follows the pattern `{day_abbrev}_{NNN}` (e.g. `sun_001`, `mon_012`)
- `title` is prefixed with the location name (e.g. `"St. John's Functional HIIT (co-ed)"`) — conventionally matching Studio Bookings, but this is a styling convention, not a hard requirement, now that the app is diverging from a pure SB mirror
- `instructors` (legacy string array) and `instructor_ids` (reference array) are both kept in sync
- `sub_location: "upper_gym"` renders a "↑ Upper" tag in the calendar view
- `capacity` caps bookings for the class; the roll-call/booking UI enforces it and shows fill-level dots

### Color / Category System

Color is derived from `location_id` + `is_online` + whether the class type is athletic. The `suggestColor()` function in `admin.html` handles auto-assignment:

| location | in-studio adult | in-studio athletic | online |
|---|---|---|---|
| stjohns | purple | green | blue |
| clarenville | gray | orange | yellow |
| ascend | purple | red | blue |

`red` is reserved for new St. John's Athletic classes — Ascend (a St. John's-area studio) uses it for all its in-studio athletic classes. There are only 7 class color tokens and all are in use, so Ascend shares the St. John's palette rather than introducing an 8th. Athletic-vs-adult classification is looked up via `type_ids` in `data/categories.json`.

### Title Display

`schedule.html` strips the location prefix from titles for display via `displayTitle()`:
```js
cls.title.replace(/^St\.\s*John's\s+/i, '').replace(/^Clarenville\s+/i, '')
```

### Auth — two independent systems

**Member/staff app (`pci-auth.js`, `PciAuth`)**
- Role-based session (`owner` > `admin` > `instructor` > `member`) stored in `localStorage` under `pci_session`
- `login()` validates email + `password_mock` against `data/users.json` (mock-first; only this function changes when a real backend is added)
- `requireRole([...])` gates a page — no session → `login.html?redirect=...`; wrong role → `index.html?error=unauthorized`
- Used by `schedule.html`, `admin.html`, `instructor.html`, `profile.html`, `settings.html`, `buy-credits.html`
- **Wallet API** (see Package Wallet section): `getWallet()`, `spendFromWallet(walletId)`, `refundToWallet(walletId)`, `addWalletEntry(entry)`. `updateCredits()`, `setEligibleCategories()`, and `setActivePackages()` were **removed** — the wallet replaces all three
- `getSession()` runs `migrateSession()`, so pre-wallet sessions already in `localStorage` upgrade in place instead of throwing
- `pci-auth.js` now depends on `pci-shared.js`; **every** page that loads `pci-auth.js` must load `pci-shared.js` too

**Admin GitHub publish (`admin.html` only)**
- GitHub Personal Access Token stored in `localStorage` under key `pci_admin_pat` — independent of `pci_session`; `logout()` does not clear it
- Token requires `contents: write` on this repo (fine-grained PAT)
- On load, admin.html validates the stored token against the GitHub API; clears it on 401
- `index.html` and `schedule.html` both read `localStorage.getItem('pci_admin_pat')` to show a green dot on the Admin link when already authenticated

### Package Wallet — booking entitlements

Each member owns a **`packages[]` wallet** on their `data/users.json` record. One entry per package purchased or granted; entries never merge. Credits from one package can never pay for a class another package covers.

```json
{
  "wallet_id": "wal_1751328000000_a3f",
  "package_id": "pkg_athletic_8",
  "name": "8 Credits for Athletic Development",
  "type": "credits",
  "credits_total": 8,
  "credits_remaining": 6,
  "start_date": "2026-07-01",
  "end_date": "2027-07-01",
  "eligible_categories": ["athletic", "athletic_virtual"],
  "payment_ref": "mock_1751328000000",
  "granted_at": "2026-07-01"
}
```

- `type: "unlimited"` entries carry `credits_total: null` / `credits_remaining: null`; `end_date = start_date + duration_days`.
- `name` and `eligible_categories` are **snapshotted at grant time** — re-pricing or re-scoping a package in `packages.json` never retroactively changes what a member already bought.
- `user.credits` / `session.credits` is a **derived read-only mirror** (`deriveCredits()` — sum of `credits_remaining` across unexpired credit entries), recomputed on every wallet mutation so the topbar badge and admin member list keep working. Never write it directly.
- `user.eligible_categories` and `user.active_packages` are gone. `migrateLegacyWallet(record)` upgrades any record still on the old shape.
- There is **no "empty means unrestricted" fallback**. No covering wallet entry = not bookable.

**`selectWalletEntry(wallet, catId, today)` in `pci-shared.js` is the single source of truth for what pays for a booking.** Priority:
1. Active **unlimited** entry covering `catId` (soonest expiry first) → cost 0
2. Otherwise active **credits** entry with `credits_remaining > 0`, **earliest `end_date` first** (use-it-or-lose-it), tie-broken by fewest remaining
3. Otherwise `null` → not covered

All three booking paths (`schedule.html`, `instructor.html`, and admin grant) go through it. `schedule.html` **re-resolves at commit time** rather than trusting the button's `dataset` — that re-resolve is the anti-tamper guard. Bookings persist `wallet_id` + `package_id`; cancel refunds to that specific entry, and refuses to refund an unlimited or expired entry.

**Package → category map** (`eligible_categories` in `data/packages.json`):

| Packages | Categories |
|---|---|
| `pkg_athletic_1/8/12` | `athletic`, `athletic_virtual` |
| `pkg_studio_virtual_5/10/20`, `pkg_unlimited_1m/3m` | `functional_hiit`, `cardio_core`, `flexibility_mobility`, `virtual` |
| `pkg_dropin_studio` | `functional_hiit`, `cardio_core`, `flexibility_mobility` (studio only) |
| `pkg_unlimited_2w_virtual` | `virtual` |
| `pkg_private`, `pkg_team`, `pkg_hockey_team` | `private_team` |

`pro` and `pro_virtual` are their own categories with **no package granting them** — PRO is invitation-only, so admin must grant it. `private_team` covers the `private` / `team_training` class types.

### Payments — `pci-payments.js`

`PciPayments.checkout(pkg)` → `Promise<{ status, provider, reference, paid_at }>`. The provider comes from `payment_provider` in `data/settings.json` (`"mock"` today), so cutover is a published settings change, not a code deploy. It defaults to `mock` if settings are unreachable — a missing config must never hand a member a real payment form.

Fulfilment is identical for every provider and lives in one place: `PciAuth.addWalletEntry(buildWalletEntry(pkg, { paymentRef }))`. `buildWalletEntry()` is shared with admin's Grant Package.

**Stripe cutover:** Checkout cannot be fulfilled client-side — creating a session needs a secret key, and crediting a wallet must be driven by a webhook. A static GitHub Pages site can do neither. The real cutover also needs serverless `create-checkout-session` + `stripe-webhook` endpoints and a real backend replacing `users.json` as the wallet store. **Never credit a wallet from a `return_url`.**

### GitHub Publish Flow (admin.html)

1. Fetch current SHA for each file via GitHub Contents API
2. Base64-encode updated JSON content
3. PUT to Contents API with SHA + commit message
4. GitHub Pages redeploys automatically (~1–2 min)

The Publish button only becomes active when unsaved changes exist (`state.dirty`). A yellow dot in the topbar indicates pending changes. The `beforeunload` event blocks navigation with unsaved changes.

## CSS Design System

`pci-tokens.css` is the **single source of truth** for all visual values. Every new CSS rule must use tokens; never write raw hex codes, raw `rgba()`, or raw `px` radius/spacing values when an equivalent token exists.

### Token quick-reference

| Group | Examples |
|---|---|
| Brand | `--pci-red`, `--pci-black`, `--pci-white`, `--pci-black-frosted`, `--brand-border` |
| Neutrals | `--gray-050` … `--gray-900` (8 steps) |
| Semantic | `--brand`, `--surface`, `--bg`, `--text`, `--muted`, `--border` |
| Functional | `--accent`, `--accent-dark`, `--danger`, `--success`, `--warn` |
| Class colors | `--cls-purple` … `--cls-red` (7 colors + 7 `-tint` variants) |
| On-dark | `--on-dark-primary/secondary/muted/border/surface/divider` — use these for any text, border, or background on the black topbar or dark surfaces |
| Shape | `--radius-sm` (4px), `--radius-md` (8px), `--radius-lg` (12px), `--radius-pill` (20px) |
| Spacing | `--sp-1` (4px) … `--sp-6` (24px) — use for new rules going forward |
| Shadows | `--shadow-sm/md/lg` |

### Where CSS lives

**`pci-tokens.css`** owns all shared components — classes used by 2+ pages:
- `.topbar`, `.topbar-back`, `.topbar-logo`, `.topbar-actions`
- `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-outline`, `.btn-sm`, `.btn-icon`
- `.filter-pill`, `.pill-dot`, `.loc-tab`
- `.color-bar`, `.color-{color}`, `.bg-{color}`, `.bar-{color}`, `.cal-class-block.color-{color}`
- `.modal-overlay`, `.modal-overlay--center`, `.empty-day`
- `#toast`, `.nav-drawer*`, `.nav-menu-btn`, `.dev-mode-btn`
- Dev Mode phone simulator (`body.dev-mobile` and its children)

**Page `<style>` blocks** are for page-specific rules and small overrides only — never full re-definitions of classes that already exist in `pci-tokens.css`. Comment any intentional divergence (e.g. admin's `z-index: 50` override or its accent-blue `.btn-primary` re-theme).

### Modal pattern

- **Bottom-sheet modal** (schedule.html): `class="modal-overlay"` — renders as bottom sheet on mobile (<600px), centered on desktop.
- **Dialog modal** (admin.html): `class="modal-overlay modal-overlay--center"` — always centered. Use this for all form/confirm dialogs. **Never redefine `.modal-overlay` inside a page's `<style>` block** — it will silently override the token and break the responsive behavior.

### Shared JS (`pci-shared.js`)

Loaded via `<script src="pci-shared.js"></script>` before the inline `<script>` on **every** page — `pci-auth.js` depends on it, so any page loading auth must load it first.

It holds two things:

1. **Constants mirroring CSS tokens** — `COLOR_HEX` is declared **once** here. Do not re-declare it in any page script. If you add a new class color token to `pci-tokens.css`, update `pci-shared.js` to match.
2. **Package-wallet logic** (pure functions, no DOM, no storage) — `selectWalletEntry`, `buildWalletEntry`, `deriveCredits`, `walletCategories`, `migrateLegacyWallet`, `buildTypeToCategory`, `getClassCategoryId`, `isWalletEntryActive`, `walletEntryCovers`, `walletEntryIsSpendable`, and the date helpers `todayISO` / `addDaysISO` / `daysUntilISO`. Entitlement rules go here, never in a page script — three separate pages book classes.

### Responsive breakpoint

**One breakpoint: `600px`** — all `@media` queries in this project use `max-width: 600px` (mobile) or `min-width: 600px` (desktop). Do not introduce new breakpoint values.

### Adding a new shared component

1. Define the base class in `pci-tokens.css` using token values only.
2. Add page-specific overrides in the page's `<style>` block with a comment explaining the divergence.
3. If the component needs a JS color reference, add it to `pci-shared.js`.

## Key Constraints

- `class_types.json`, `categories.json`, and `locations.json` are not editable from the admin UI — edit them directly and commit.
- Saturday is intentionally empty.
- The admin "← Schedule" back-link is inside `#app`, only visible after successful login, and points to `schedule.html`.
- The `private` and `team_training` class types exist but **no scheduled class uses them yet**, so `pkg_private` / `pkg_team` / `pkg_hockey_team` credits are not redeemable in-app — those sessions are arranged directly with the studio. Add such classes to `pci_schedule.json` if that changes.
- **PRO classes are admin-grant only** — no purchasable package covers the `pro` / `pro_virtual` categories.
- Mock purchases write to `localStorage` only; they are not published back to `data/users.json` (same as `pci_bookings`). An admin must re-grant in `admin.html` to persist a wallet entry. The same applies to bookings made from `instructor.html`, which has no write-back.
