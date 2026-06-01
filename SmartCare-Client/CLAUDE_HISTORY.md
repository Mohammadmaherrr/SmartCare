# CLAUDE_HISTORY.md

Running log of major work, decisions, and known gaps. Append new entries to the top.

---

## 2026-05-19 — Admin + Receptionist modules complete; shared Active Emergencies live

Three frontend deliverables landed today:

### Screens shipped

| Screen | Path | Notes |
|---|---|---|
| Admin — Reports | `/admin/reports` | Date range picker; Material tabs for "Appointment Report" (4 summary stat cards + stacked Chart.js bar chart of appointments per doctor) and "Visit Frequency" (Chart.js line chart of visits per day). PDF (jsPDF) and CSV (Papa Parse) export from a single menu — PDF embeds the rendered chart as a PNG snapshot via `canvas.toDataURL`. Charts re-render on tab switch through a `queueMicrotask` after the canvas mounts. |
| Admin — Settings | `/admin/settings` | Settings grouped into **Booking** (visit durations), **Fees** (NoShowFee), and **Other**. Inline edit per row; numeric settings validated client-side (`Number.isFinite`, min). Enter saves, Esc cancels. PUT `admin/settings` returns the updated row; we mutate the signal in-place. No `ngModel` — direct `[value]` + `(input)` binding with manual validation. |
| Shared — Active Emergencies | `/{doctor,receptionist,admin}/emergencies` | Single component lives at `features/shared/active-emergencies/`. Loaded by all three role route files. Sidebar entry added for each role (icon `sos`). |

### Active Emergencies — design notes

- **Polling.** `interval(30_000)` with `startWith(0)` via `takeUntilDestroyed(destroyRef)` — fires immediately and refreshes every 30 s. First call sets `loading`; subsequent calls set a quieter `refreshing` flag that shows a small pill inside the list.
- **Selected emergency cleanup.** If the selected request disappears from the next poll (resolved elsewhere), `selectedId` is cleared automatically.
- **Status transitions** mirror the backend's allowed FSM: Pending → Dispatched → Resolved. Resolved requests are removed from the active list optimistically on success.
- **Layout.** Two-column grid: list on the left; detail (with Leaflet map, request meta, action buttons) slides in on the right when a row is selected. Collapses to single column under 980 px.
- **Reused `MapViewComponent`** unchanged — it already accepts `patientCoords` and an optional `clinics` array.

### Backend gap surfaced

The detail view is *supposed* to show the 3 nearest clinics on the map, but the backend's only clinic-lookup endpoint is `GET /emergency/nearby-clinics`, which is `[Authorize(Roles = "Patient")]`. Staff (Doctor/Receptionist/Admin) cannot call it. Also, `GET /emergency/active` and `PUT /emergency/{id}/status` both return responses without `NearbyClinics` (the update method literally sets `NearbyClinics = []`).

For now the staff detail view shows only the patient pin on the map and a hint that nearest clinics appear after dispatch. **Backend follow-up:** open `nearby-clinics` to `Doctor,Receptionist,Admin` (or add a new staff-only endpoint), and have the response shapes include the precomputed clinics list.

### Service extension

`EmergencyService` gained one method:

| Method | Backend route | Auth |
|---|---|---|
| `updateStatus(id, newStatus)` | `PUT /emergency/{id}/status` | Doctor/Receptionist/Admin |

### New dependencies

| Package | Purpose | Where |
|---|---|---|
| `chart.js` | Bar + line charts in Reports | Lazy-loaded inside `reports-component` chunk |
| `jspdf` | PDF export | Same chunk |
| `papaparse` (+ `@types/papaparse`) | CSV export | Same chunk |

All three are isolated to the Reports lazy chunk — they don't affect the initial bundle.

### Sidebar nav additions (`layouts/main-layout/main-layout.component.ts`)

- Doctor: added "Emergencies" between Patient Records and Availability.
- Receptionist: added "Emergencies" after Appointments.
- Admin: added "Emergencies" between Users and Reports.

### Known gaps / follow-ups

1. **Staff-side nearby-clinics endpoint** (see "Backend gap surfaced" above) — required to satisfy the spec "Click row → full detail view with Leaflet map showing patient location and 3 nearest clinics."
2. **Settings keys are free-text on the backend.** Numeric validation is client-side only; a hand-rolled `curl` could still PUT `value: "abc"` for `NoShowFee`. Backend has acknowledged this as low-risk for now (no consumer reads the values yet).
3. **Polling vs. SignalR.** Active emergencies use 30 s polling because the backend has no SignalR/SSE channel. When the backend adds a hub, swap the `interval(...)` for a live subscription.
4. **`MatNativeDateModule` in Reports** uses the browser's native date adapter — fine for en-US-style picker, but the displayed format matches the user's locale. No `MAT_DATE_LOCALE` overrides yet.

### Backend endpoints used (additions)

| Frontend call | Backend route | Auth |
|---|---|---|
| `adminService.getAppointmentReport(start, end)` | `GET /admin/reports/appointments` | Admin |
| `adminService.getVisitFrequencyReport(start, end)` | `GET /admin/reports/visits` | Admin |
| `adminService.getSettings()` | `GET /admin/settings` | Admin |
| `adminService.updateSetting(setting)` | `PUT /admin/settings` | Admin |
| `emergencyService.getActive()` | `GET /emergency/active` | Doctor/Receptionist/Admin |
| `emergencyService.updateStatus(id, newStatus)` | `PUT /emergency/{id}/status` | Doctor/Receptionist/Admin |

### Module status snapshot (post-change)

Patient: all ✅. Doctor: dashboard / schedule / appointment-detail / patient-records / emergencies ✅; Availability still a stub. Receptionist: dashboard / appointments / book-for-patient / emergencies ✅. Admin: dashboard / users / reports / settings / emergencies ✅.

### Next module: pick one

Doctor — Availability is the last role-specific stub. Backend needs `GET /doctors/me/availability` + `PUT /doctors/me/availability` (or equivalent) — not yet exposed.

---

## 2026-05-19 — Doctor module complete (except Availability)

Doctor — Patient Records shipped. The earlier Doctor — Dashboard, Today's Schedule, and Appointment Detail screens are already live; only Availability remains a stub.

### Screen shipped today

| Screen | Path | Notes |
|---|---|---|
| Patient Records | `/doctor/patient-records/:id` | Split layout: left = patient header + inline-editable medical record; right = tabbed Prescriptions / Lab Results with inline "new" forms. Older prescriptions (>30d) live in `mat-expansion-panel` groups; recent ones render as cards with stagger animation. |

Reached from Appointment Detail's "View Patient Records" button (`viewPatientRecords()` was already navigating to `/doctor/patient-records/:id`). The bare `/doctor/patient-records` route is still a stub — no patient picker landing page yet; not needed for the appointment-driven flow.

### Service extension

`MedicalRecordService` gained four write methods (the existing reads were already there):

| Method | Backend route | Auth |
|---|---|---|
| `createRecord(patientId, body)` | `POST /patients/{patientId}/records` | Doctor |
| `updateRecord(recordId, body)` | `PUT /records/{recordId}` | Doctor |
| `addPrescription(recordId, body)` | `POST /records/{recordId}/prescriptions` | Doctor |
| `addLabResult(patientId, body)` | `POST /patients/{patientId}/lab-results` | Doctor |

### Validators mirror backend FluentValidation

| Field | Frontend | Backend rule |
|---|---|---|
| `diagnosis` | required, maxLength 500 | `NotEmpty().MaximumLength(500)` |
| `treatmentPlan` | maxLength 1000 | `MaximumLength(1000).When(not null)` |
| `medicationName` | required, maxLength 200 | `NotEmpty().MaximumLength(200)` |
| `dosage` | required, maxLength 100 | `NotEmpty().MaximumLength(100)` |
| `instructions` | maxLength 500 | `MaximumLength(500).When(not null)` |
| `issueDate` / `resultDate` | required + custom `notInFuture` validator + `MatDatepicker [max]=today` | `Must(d => d <= today)` |
| `testName` | required, maxLength 200 | `NotEmpty().MaximumLength(200)` |
| `resultValue` | required, maxLength 500 | `NotEmpty().MaximumLength(500)` |

### Self-review findings (and fix applied)

1. **Other-doctor exposure (UI).** Checked the doctor module for any leaked `doctorId` from a different account.
   - `schedule.component.ts` fetches with `this.user()?.id` (the logged-in doctor's own id) — ✅
   - `appointment-detail.component.html` displays only patient + visit fields, never `appointment.doctorId` — ✅
   - `patient-records.component.ts` keys off `patientId` from the route only — ✅
   No fixes needed; backend `[Authorize(Roles=Doctor)]` is the source of truth, and the UI doesn't render foreign ids.

2. **Destructive actions behind confirmations.**
   - `appointment-detail.component.ts` — `markCompleted` and `markNoShow` already gated by `ConfirmDialogComponent`. ✅
   - `patient-records.component.ts` — `POST` operations (create record, add prescription, add lab result) are additive; no confirm needed. **But `PUT /records/{id}` overwrites the prior diagnosis/treatment plan**, and the first version submitted without warning. **Fixed**: `saveRecord()` now opens `ConfirmDialogComponent` with title "Overwrite medical record?" before calling `updateRecord()`. The create path (no existing record) still submits directly.

3. **Schedule across week/month/year boundaries.** Audited `schedule.component.ts`:
   - `startOfWeek` uses `day === 0 ? -6 : 1 - day` → Monday-anchored weeks; Sunday handled correctly.
   - `addDays(d, n)` uses `setDate(getDate()+n)`, which rolls over month and year in JS — verified by spot-checking Dec 31 → Jan 1 and Feb 28 (non-leap) → Mar 1.
   - `toIso` uses local-time getters consistently with the column build, so the ISO key always matches the displayed date.
   - DST: `setHours(0,0,0,0)` is called before `setDate`, so the operation stays in local-day space; the twice-a-year 23/25-hour days don't shift the calendar day.
   - `selectedDay` is independent of `anchorDate` — day-view scrubs forward/back one day, week-view jumps seven; the visible columns always match the active range, so loading from `cols[0].isoDate` to `cols[cols.length-1].isoDate` is correct on either side of a boundary.
   ✅ No fixes needed.

### Known gaps / follow-ups

1. **`/doctor/patient-records` (no id) is still a stub.** Currently reachable only via "View Patient Records" on an appointment. If a doctor needs to look up a patient without going through an appointment first, we'll need a search/picker landing page (and probably `GET /patients?search=` on the backend).

2. **Patient detail on the left card is minimal.** Currently shows `record.patientName` (which only exists once a record exists) and a generic "Patient" badge. Email/phone/DOB would require either widening the `MedicalRecordDto` or a separate `GET /patients/{id}` lookup.

3. **No edit/delete on prescriptions or lab results.** Add-only for now. Backend doesn't expose DELETE/PUT for these either — if/when it does, wire in row actions and confirm dialogs.

4. **Availability screen still a stub.** Last remaining doctor screen. Needs backend contract (`GET/PUT /doctors/{id}/availability` shape) before building.

### Build & route status

- Lazy chunk: `patient-records-component` ≈ 56.7 kB raw / 12.6 kB transferred.
- All Doctor routes now resolve to real components except `availability` and the bare `patient-records` (intentional, see gap #1).

---

## 2026-05-18 — Patient module complete

All six Patient screens shipped. Build clean, all routes lazy-loaded, all endpoints wired through `ApiService`, all forms reactive, all state on signals.

### Screens shipped

| Screen | Path | Notes |
|---|---|---|
| Dashboard | `/patient/dashboard` | Greeting, stats, quick actions, next appointment, notifications. Floating SOS FAB (bottom-right). |
| Book Appointment | `/patient/book-appointment` | 5-step wizard (visit type → doctor → date → slot → confirm). Reactive form. |
| My Appointments | `/patient/appointments` | Tabbed (Upcoming/Past/Cancelled), row-level actions menu, cancel via confirm dialog. |
| Medical Records | `/patient/records` | Tabs for record/prescriptions/labs, print support, skeleton loaders per tab. |
| Visit Summary | `/patient/visit-summary/:appointmentId` | Reactive form (symptoms required, pain slider 1-10, optional description/duration). Validators mirror backend FluentValidation rules. |
| Nearby Clinics | `/patient/nearby-clinics` | Leaflet map (OSM tiles) + clinic list, marker↔list bidirectional sync, geolocation fallback to Amman. |
| Emergency SOS | `/patient/emergency` | Pulsing red SOS button → confirm dialog → geolocate → POST `/emergency/request` → success/error screens with 911 fallback. |

### New shared infrastructure

- `_services/geolocation.service.ts` — Promise-based wrapper for `navigator.geolocation` with typed failure reasons (`denied | unavailable | timeout | unsupported`).
- `_services/emergency.service.ts` — `getNearbyClinics(lat, lng)` + `createEmergencyRequest(lat, lng)`.
- `shared/map/map-view.component.ts` — reusable signal-based Leaflet wrapper. Inputs: `clinics`, `patientCoords`, `selectedClinicId`. Output: `clinicSelect`. Uses `L.divIcon` for both markers (avoids Leaflet's default icon path issues with Angular build).
- Leaflet global marker styles live in `src/styles.scss` (Leaflet's DOM is injected outside Angular's view encapsulation).

### Self-review fixes applied today

| File | Issue | Fix |
|---|---|---|
| `book-appointment.component.ts` | Called `GET /appointments/doctor/{id}/schedule` as a Patient — backend authorizes only `Doctor,Receptionist,Admin`, so every visit to step 4 produced a spurious `403 "no permission"` toast, then loaded an empty schedule anyway. | Removed `loadSchedule()` and its call in `next()`. Step 4 now shows all working-hours slots; backend rejects conflicts at booking time with a 409. |
| `my-appointments.component.ts` | `viewSummary()` had no `error` callback on the subscription — a 404 or 500 would surface as an unhandled rejection. | Added a no-op `error` handler (the interceptor toasts; nothing further to do client-side). |

### Known gaps / follow-ups (NOT bugs in shipped code)

1. **Backend: patient-readable doctor schedule.** Patients cannot legitimately see another patient's bookings, but they need *some* signal of which slots are taken on their chosen day. Options for backend team:
   - Add `GET /appointments/doctor/{id}/busy-slots?date=` returning only `[timeSlot, endTime]` pairs (no patient/PII), authorized for all roles.
   - Or expose busy-slots via the existing endpoint with a per-role projection.
   Until then, the Patient may pick a slot that conflicts; the booking request will fail with a clear toast and they must reselect.

2. **Backend: public doctor list.** `book-appointment` hardcodes a single seeded doctor (see `SEEDED_DOCTORS` constant in `book-appointment.component.ts`). Needs `GET /api/doctors` returning `{ id, name, specialization }[]` with at least Patient access. Already TODO-tagged in the file.

3. **Dashboard placeholder data.** `pendingSummaries`, `latestPrescription`, and `notifications` are hardcoded (signal initial values / static array). Real data sources need wiring once available:
   - Pending summaries: derive from `getMyAppointments` filter (appointments with status `Completed` lacking a visit summary).
   - Latest prescription: most recent `Prescription` from the medical record.
   - Notifications: needs backend endpoint (the `Notification` entity exists in `SmartCare.Domain` and is populated by Emergency/Status changes, but there's no `GET /notifications/mine` yet).

4. **`ngx-leaflet@0.0.16` package is a stub.** Only exports an empty `NgxLeafletModule` and `NgxLeafletService` — no map directives. We use raw `import * as L from 'leaflet'` directly in `MapViewComponent` instead. If the team prefers a directive-based wrapper later, switch to `@bluehalo/ngx-leaflet`.

5. **Emergency 409 redundancy.** When the patient already has a pending request, the global `errorInterceptor` toasts the backend message *and* `EmergencyComponent` shows a dedicated error screen. The screen is the primary signal; the toast is a small redundancy. To suppress, add a `HttpContextToken` (e.g. `SKIP_GLOBAL_ERROR`) read by the interceptor — not yet wired.

### Backend endpoints used (frontend → backend mapping)

| Frontend call | Backend route | Auth |
|---|---|---|
| `appointmentService.getMyAppointments()` | `GET /appointments/my` | Patient |
| `appointmentService.getById(id)` | `GET /appointments/{id}` | Patient/Doctor/Receptionist/Admin |
| `appointmentService.book(...)` | `POST /appointments` | Patient/Receptionist/Admin |
| `appointmentService.cancel(id)` | `PUT /appointments/{id}/cancel` | Patient/Receptionist/Admin |
| `appointmentService.getVisitSummary(id)` | `GET /appointments/{id}/summary` | Patient/Doctor |
| `visitSummaryService.submit(id, dto)` | `POST /appointments/{id}/summary` | Patient |
| `medicalRecordService.getRecord(patientId)` | `GET /patients/{patientId}/records` | Doctor/Patient |
| `medicalRecordService.getPrescriptions(recordId)` | `GET /records/{recordId}/prescriptions` | Doctor/Patient |
| `medicalRecordService.getLabResults(patientId)` | `GET /patients/{patientId}/lab-results` | Doctor/Patient |
| `emergencyService.getNearbyClinics(lat, lng)` | `GET /emergency/nearby-clinics?lat=&lng=` | Patient |
| `emergencyService.createEmergencyRequest(lat, lng)` | `POST /emergency/request` | Patient |

### Animation conventions (used module-wide)

- Entry: 220–360 ms, `cubic-bezier(0.16, 1, 0.3, 1)` (or `ease-out`), translate-Y 6–16 px + opacity 0→1.
- List stagger: 60–100 ms between items.
- Phase/page transitions: 320–360 ms.

Stick to this for any new screens to keep the module visually coherent.

### Next module: pick one

Doctor, Receptionist, or Admin. Doctor module will need a `GET /doctors/me/schedule` (or reuse `/appointments/doctor/{id}/schedule` with auth check), plus availability management UI tied to whatever the backend exposes.
