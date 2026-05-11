# PCI Schedule

Staging preview of the Power Conditioning Inc. weekly class schedule.

Live URL: https://CuWilliams.github.io/pci-schedule

---

## Purpose

This repo provides a change management layer for the PCI weekly schedule before changes are applied in the Studio Bookings app. Ryan reviews and approves all changes via the live URL above prior to any updates being made in Studio Bookings.

---

## Workflow

1. Owner requests schedule changes
2. Update the schedule data in `index.html` (the `schedule` array in the `<script>` block)
3. Commit and push to `main`
4. GitHub Pages redeploys automatically (typically within 1–2 minutes)
5. Send Owner the URL to review
6. Once approved, apply the equivalent changes in Studio Bookings

---

## Schedule Data

The schedule is defined as a JavaScript array embedded directly in `index.html`. Each day contains a list of class objects with the following fields:

```json
{
  "time_start": "17:15",
  "time_end": "18:15",
  "title": "Class Name As It Appears In Studio Bookings",
  "instructors": ["Instructor Name"],
  "color": "green"
}
```

### Color Categories

| Color  | Category |
|--------|----------|
| purple | Functional Fitness (co-ed) - In-Studio |
| green  | PRO / Athletic Development / Elite Athletes |
| yellow | Virtual Functional Fitness |
| orange | Clarenville Athletic Advanced / Elite |
| blue   | Athletic Development Virtual / Advanced |
| gray   | Flexibility & Mobility / Cardio Core / Hybrid |

---

## Source of Truth

The canonical schedule source is the `pci_schedule.json` file maintained separately. The `index.html` schedule data should always reflect the current state of that JSON.

---

## Notes

- Class titles must match Studio Bookings exactly, including punctuation and spacing
- Saturday is currently empty
- Instructor display names reflect the Studio Bookings display name exactly
