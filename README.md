# PCI Bookings App

Member-facing booking app and schedule change-management platform for Power Conditioning Inc. (three locations: St. John's, Clarenville, and the Ascend studio in St. John's).

Live URL: https://CuWilliams.github.io/pci-schedule-management

---

## Test Credentials

Mock accounts for local development and staging review. All auth state is stored in `localStorage` — no server required.

| Role | Email | Password |
|---|---|---|
| Owner | `ryan@powerconditioning.ca` | `changeme` |
| Admin | `admin@powerconditioning.ca` | `admin123` |
| Instructor (Natasha) | `natasha@powerconditioning.ca` | `instructor1` |
| Instructor (Brendan) | `brendan@powerconditioning.ca` | `instructor1` |
| Instructor (Jon) | `jon@powerconditioning.ca` | `instructor1` |
| Instructor (Rhonda) | `rhonda@powerconditioning.ca` | `instructor1` |
| Instructor (Greg) | `greg@powerconditioning.ca` | `instructor1` |
| Member (St. John's) | `jane@example.com` | `member123` |
| Member (Clarenville) | `john@example.com` | `member123` |
| Member (Ascend) | `sarah@example.com` | `member123` |
| Member (St. John's, active package) | `mike@example.com` | `member123` |

> **Note:** Passwords are plaintext mock values stored in `data/users.json`. This file is intentionally non-production — the field is named `password_mock` as a reminder. Replace with real auth when a backend is integrated.

**Admin also requires a GitHub PAT** (`contents: write` on this repo) after signing in, to unlock the Publish button in `admin.html`.

---

## Purpose

This repo serves two roles:

1. **Member-facing app** — sign in, browse the schedule, book classes, buy credit packages, manage a profile, and (for instructors) view class rosters and take attendance.
2. **Schedule change-management layer** — Ryan reviews proposed schedule changes at the live URL before they are applied in Studio Bookings. `admin.html` is the auth-gated editor that publishes changes directly to this repo via the GitHub Contents API.

---

## Pages

| File | Purpose |
|---|---|
| `index.html` | Landing page — location selector |
| `login.html` | Sign in against the mock accounts in `data/users.json` |
| `schedule.html` | Schedule viewer — list + week calendar views, booking entry point |
| `admin.html` | Auth-gated admin UI — schedule/instructor CRUD + GitHub publish |
| `instructor.html` | Instructor view — class roster, roll-call / attendance |
| `profile.html`, `settings.html` | Member account pages |
| `buy-credits.html` | Credit package purchase flow (mock) |
| `stjohns.html`, `clarenville.html`, `ascend.html` | Per-location center pages (map, About, Gallery) |

See `CLAUDE.md` for full architecture details, the schedule JSON schema, the color/category system, and CSS token conventions.

---

## Data

| File | Purpose |
|---|---|
| `pci_schedule.json` | Canonical weekly schedule (v2.0 schema) — published from `admin.html` |
| `data/instructors.json` | Instructor roster — published from `admin.html` |
| `data/class_types.json`, `data/categories.json` | Class type definitions and category/color mapping (edit directly, not published via admin) |
| `data/locations.json` | Location definitions (edit directly, not published via admin) |
| `data/users.json` | Mock auth accounts (see Test Credentials above) |
| `data/bookings.json`, `data/packages.json`, `data/settings.json` | Mock booking/package/app-config seed data; live booking state lives in `localStorage` |

---

## Workflow (schedule changes)

1. Owner requests schedule changes
2. Make the change in `admin.html` (signed in with a GitHub PAT)
3. Publish — this commits directly to `main` via the GitHub Contents API
4. GitHub Pages redeploys automatically (typically within 1–2 minutes)
5. Send Owner the URL to review
6. Once approved, apply the equivalent changes in Studio Bookings

---

## Notes

- Saturday is intentionally empty
- Instructor display names reflect the Studio Bookings display name exactly
