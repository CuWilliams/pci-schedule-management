# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static GitHub Pages site that manages the weekly class schedule for Power Conditioning Inc. (two locations: St. John's and Clarenville). It serves as a change-management staging layer — Ryan reviews schedule changes at the live URL before they are applied in Studio Bookings.

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
| `index.html` | Landing page — location selector (St. John's vs Clarenville) |
| `schedule.html` | Public schedule viewer — list + week calendar views |
| `admin.html` | Auth-gated admin UI — full CRUD + GitHub publish |
| `pci-tokens.css` | Shared design tokens + component CSS (edit directly and commit; not published via admin) |
| `pci-shared.js` | Shared JS constants that mirror CSS tokens (e.g. `COLOR_HEX`) — loaded before inline scripts in schedule.html and admin.html |
| `pci_schedule.json` | Canonical schedule data (v2.0 schema) |
| `data/class_types.json` | Class type definitions + color-to-category mapping |
| `data/instructors.json` | Instructor roster |
| `data/locations.json` | Location definitions (read-only, not published via admin) |

### Navigation

The site uses a 3-page structure with plain `<a href>` navigation:

- `index.html` → `schedule.html?loc=stjohns` or `schedule.html?loc=clarenville`
- `schedule.html` reads the `loc` URL param on load to pre-select the active location tab (`stjohns` default)
- `schedule.html` → `admin.html` (Admin link in topbar)
- `admin.html` → `schedule.html` (← Schedule back-link in topbar)
- `pci-tokens.css` must be committed to GitHub to take effect on the live site (same workflow as `class_types.json`)

### Data Flow

`schedule.html` and `admin.html` both `fetch()` all JSON files on load. `admin.html` writes changes back to GitHub via the Contents API (base64 PUT). Only `pci_schedule.json` and `data/instructors.json` are currently writable from admin — `class_types.json`, `locations.json`, and `pci-tokens.css` must be edited directly and committed.

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
  "sub_location": null
}
```

- `id` follows the pattern `{day_abbrev}_{NNN}` (e.g. `sun_001`, `mon_012`)
- `title` must be **prefixed with the location name** exactly as it appears in Studio Bookings (e.g. `"St. John's Functional HIIT (co-ed)"`)
- `instructors` (legacy string array) and `instructor_ids` (reference array) are both kept in sync
- `sub_location: "upper_gym"` renders a "↑ Upper" tag in the calendar view

### Color / Category System

Color is derived from `location_id` + `is_online` + whether the class type is athletic. The `suggestColor()` function in `admin.html` handles auto-assignment:

| location | in-studio adult | in-studio athletic | online |
|---|---|---|---|
| stjohns | purple | green | blue |
| clarenville | gray | orange | yellow |

`red` is reserved for new St. John's Athletic classes. The mapping is declared in `data/class_types.json` under `class_categories`.

### Title Display

`schedule.html` strips the location prefix from titles for display via `displayTitle()`:
```js
cls.title.replace(/^St\.\s*John's\s+/i, '').replace(/^Clarenville\s+/i, '')
```
Raw titles in the JSON must retain the prefix so they match Studio Bookings exactly.

### Auth (admin.html)

- GitHub Personal Access Token stored in `localStorage` under key `pci_admin_pat`
- Token requires `contents: write` on this repo (fine-grained PAT)
- On load, admin.html validates the stored token against the GitHub API; clears it on 401
- `index.html` and `schedule.html` both read `localStorage.getItem('pci_admin_pat')` to show a green dot on the Admin link when already authenticated

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

### Shared JS constants (`pci-shared.js`)

`COLOR_HEX` is declared **once** in `pci-shared.js` and loaded via `<script src="pci-shared.js"></script>` before the inline `<script>` in both `schedule.html` and `admin.html`. Do not re-declare `COLOR_HEX` in any page script. If you add a new class color token to `pci-tokens.css`, update `pci-shared.js` to match.

### Responsive breakpoint

**One breakpoint: `600px`** — all `@media` queries in this project use `max-width: 600px` (mobile) or `min-width: 600px` (desktop). Do not introduce new breakpoint values.

### Adding a new shared component

1. Define the base class in `pci-tokens.css` using token values only.
2. Add page-specific overrides in the page's `<style>` block with a comment explaining the divergence.
3. If the component needs a JS color reference, add it to `pci-shared.js`.

## Key Constraints

- **Class titles must match Studio Bookings exactly** — including punctuation, spacing, and location prefix.
- `class_types.json` and `locations.json` are not editable from the admin UI — edit them directly and commit.
- Saturday is intentionally empty.
- The admin "← Schedule" back-link is inside `#app`, only visible after successful login, and points to `schedule.html`.
