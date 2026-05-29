# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static GitHub Pages site that manages the weekly class schedule for Power Conditioning Inc. (two locations: St. John's and Clarenville). It serves as a change-management staging layer — Ryan reviews schedule changes at the live URL before they are applied in Studio Bookings.

**Live URL:** https://CuWilliams.github.io/pci-schedule-management

**Repo:** `CuWilliams/pci-schedule-management` on `main` branch.

## Local Development

No build system. Serve files locally — the JSON fetches in both HTML files require an HTTP server (opening `file://` directly will fail).

```bash
# VS Code Live Server is configured for port 5501
# Open index.html or admin.html in Live Server
```

The `.vscode/settings.json` sets `liveServer.settings.port` to `5501`.

## Architecture

This is a **zero-dependency static site** — no framework, no bundler, no npm. All logic is vanilla JS embedded directly in the two HTML files.

### Files

| File | Purpose |
|---|---|
| `index.html` | Public schedule viewer — list + week calendar views |
| `admin.html` | Auth-gated admin UI — full CRUD + GitHub publish |
| `pci_schedule.json` | Canonical schedule data (v2.0 schema) |
| `data/class_types.json` | Class type definitions + color-to-category mapping |
| `data/instructors.json` | Instructor roster |
| `data/locations.json` | Location definitions (read-only, not published via admin) |

### Data Flow

Both HTML files `fetch()` all JSON files on load. `admin.html` writes changes back to GitHub via the Contents API (base64 PUT). Only `pci_schedule.json` and `data/instructors.json` are currently writable from admin — `class_types.json` and `locations.json` must be edited directly.

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

Color is derived from `location_id` + `is_online` + whether the class type is athletic. The `inferColor()` function in `admin.html` handles auto-assignment:

| location | in-studio adult | in-studio athletic | online |
|---|---|---|---|
| stjohns | purple | green | blue |
| clarenville | gray | orange | yellow |

`red` is reserved for new St. John's Athletic classes. The mapping is declared in `data/class_types.json` under `class_categories`.

### Title Display

`index.html` strips the location prefix from titles for display via `displayTitle()`:
```js
cls.title.replace(/^St\.\s*John's\s+/i, '').replace(/^Clarenville\s+/i, '')
```
Raw titles in the JSON must retain the prefix so they match Studio Bookings exactly.

### Auth (admin.html)

- GitHub Personal Access Token stored in `localStorage` under key `pci_admin_pat`
- Token requires `contents: write` on this repo (fine-grained PAT)
- On load, admin.html validates the stored token against the GitHub API; clears it on 401
- `index.html` reads `localStorage.getItem('pci_admin_pat')` to show a filled/active Admin button with a green dot when already authenticated

### GitHub Publish Flow (admin.html)

1. Fetch current SHA for each file via GitHub Contents API
2. Base64-encode updated JSON content
3. PUT to Contents API with SHA + commit message
4. GitHub Pages redeploys automatically (~1–2 min)

The Publish button only becomes active when unsaved changes exist (`state.dirty`). A yellow dot in the topbar indicates pending changes. The `beforeunload` event blocks navigation with unsaved changes.

## Key Constraints

- **Class titles must match Studio Bookings exactly** — including punctuation, spacing, and location prefix.
- `class_types.json` and `locations.json` are not editable from the admin UI — edit them directly and commit.
- Saturday is intentionally empty.
- The admin "← Schedule" back-link is inside `#app` and only visible after successful login.
