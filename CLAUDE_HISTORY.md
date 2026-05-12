# SmartCare — Session History

Historical session handoffs and the final project summary, preserved verbatim from the original CLAUDE.md. See CLAUDE.md for the active instructions and current known issues.

---

## Session Handoff — Database Layer (2026-05-08)

### What was built
- **AppDbContext** (`Infrastructure/Data/AppDbContext.cs`) — 14 DbSets, global UTC DateTime converters, `ApplyConfigurationsFromAssembly` wired up.
- **TPH inheritance** — Patient, Doctor, Admin, Receptionist all share the `Users` table, discriminated by the existing `Role` (integer) column.
- **13 `IEntityTypeConfiguration<T>` files** in `Infrastructure/Data/Configurations/` covering every entity. Relationships, max lengths, required flags, and indexes all configured via Fluent API — nothing inline in OnModelCreating.
- **`IRepository<T>` / `Repository<T>`** — generic CRUD + SaveChangesAsync in `Application/Interfaces/` and `Infrastructure/Repositories/`. Extension method registers AppDbContext (Npgsql) and `IRepository<>/Repository<>` as scoped. Called first in Program.cs before AddApplicationServices.
- **Migration `InitialCreate`** generated and committed to `Infrastructure/Migrations/`.

### What works
- `dotnet build` — 0 errors, 0 warnings across all four projects.
- `dotnet run` — server starts on http://localhost:5000; DB connection error is caught and logged (not thrown), so the API comes up even without Postgres running.
- EF Core model validated by the migration tool — schema is consistent with all entity configurations.

### Known issues / TODOs
- **Postgres not running locally** — migration has not been applied yet. Run once Postgres is up:
  ```
  dotnet ef database update --project SmartCare.Infrastructure --startup-project SmartCare.API
  ```
- **`appsettings.Development.json` password** is the placeholder `yourpassword`.
- **`IRepository<T>` is generic only** — domain-specific query methods (e.g. GetAppointmentsByPatientId, GetActiveEmergencies) will need dedicated repository interfaces in `Application/Interfaces/` as each module is built.
- **No soft-delete** — Delete removes rows permanently. Decide before Auth module whether patients/doctors should be deactivated (AccountStatus) instead of deleted.

### Next step — Auth module
✅ Completed — see Session Handoff below.

---

## Session Handoff — Auth Module (2026-05-08)

### What was built
- **`ITokenService` / `TokenService`** (`Application/Interfaces/`, `Infrastructure/Services/`)
  — HS512 JWT, 7-day expiry, claims: `NameIdentifier` (Guid), `Email`, `Role`.
- **`IAuthService` / `AuthService`** (`Application/Interfaces/`, `Infrastructure/Services/`)
  — BCrypt.Net-Next password hashing. Three methods:
  - `RegisterPatientAsync` — creates `Patient` row, returns token.
  - `RegisterStaffAsync` — creates `Doctor` / `Receptionist` / `Admin` row by role, returns token.
  - `LoginAsync` — verifies hash; increments `FailedLoginAttempts` on failure; blocks account
    at 5 failures (`AccountStatus.Blocked`); resets counter on success.
- **`RegisterDto` / `LoginDto` / `AuthResponseDto`** (`Application/DTOs/Auth/`)
  — `RegisterDto` covers all four roles with conditional FluentValidation rules.
  `AuthResponseDto` exposes: `token`, `role`, `userId`, `fullName` — no `PasswordHash`.
- **`AuthController`** (`API/Controllers/`)
  - `POST /api/auth/register` — `[AllowAnonymous]`, Patient only (role forced server-side).
  - `POST /api/auth/register/staff` — `[Authorize(Policy="RequireAdminRole")]`.
  - `POST /api/auth/login` — `[AllowAnonymous]`.
- **JWT middleware** (`API/Extensions/IdentityServiceExtensions.cs`)
  — four authorization policies: `RequireAdminRole`, `RequireDoctorRole`,
  `RequireReceptionistRole`, `RequirePatientRole`.
- **Seed data** (`Infrastructure/Data/Seed.cs`) — one user per role, called from
  `Program.cs` after `MigrateAsync()`, idempotent (skips if any user exists).
- **`SmartCare.http`** (project root) — REST Client file with all auth requests;
  `@token` variable at top for protected calls.
- **Migration `AddFailedLoginAttempts`** — adds `FailedLoginAttempts integer NOT NULL DEFAULT 0`
  to the `Users` table.
- **Custom exceptions** (`Application/Exceptions/`) — `BadRequestException` (400),
  `UnauthorizedException` (401), `ConflictException` (409); all handled in `ExceptionMiddleware`.

### Security fixes applied
- `BaseApiController` carries `[Authorize]` — every controller is protected by default;
  public endpoints opt out with `[AllowAnonymous]`.
- `PasswordHash` and `FailedLoginAttempts` on `User` are `[JsonIgnore]` — cannot leak
  via accidental entity serialisation.
- `RegisterPatientAsync` has explicit null guards for `DateOfBirth` / `Gender` that throw
  `BadRequestException` — prevents a NullReferenceException caused by FluentValidation
  running before the controller overrides `dto.Role = "Patient"`.

### Known issues / TODOs
- **Postgres not running locally** — two pending migrations must be applied once it is:
  ```
  dotnet ef database update --project SmartCare.Infrastructure --startup-project SmartCare.API
  ```
- **No token refresh** — tokens are 7-day JWTs with no revocation or refresh mechanism.
  Acceptable for a graduation project; add a refresh-token endpoint if needed later.
- **Blocked account message** reveals lock status to callers. This is intentional for UX
  but is a minor user-enumeration vector. Change to a generic message if required.
- **`IRepository<T>` is generic only** — domain-specific queries will need dedicated
  repository interfaces as each module is built.

### Next step — Appointments module
✅ Completed — see Session Handoff below.

---

## Session Handoff — Appointments Module (2026-05-11)

### What was built
- **`IAppointmentService` / `AppointmentService`** (`Application/Interfaces/`, `Infrastructure/Services/`)
  — Direct `AppDbContext` access (no separate repository). Six methods:
  - `BookAppointmentAsync` — overlap check for doctor and patient, blocks blocked accounts, rejects null **and `Guid.Empty`** PatientId from staff callers, creates notification.
  - `CancelAppointmentAsync` — guards against completed/no-show/already-cancelled; sets payment to `Refunded`; optional `Reason` echoed into the notification.
  - `GetByIdAsync` — explicit role allowlist (Patient/Doctor/Receptionist/Admin), then ownership filter; patient sees own only, doctor sees own only, staff sees all.
  - `GetPatientAppointmentsAsync` — patient sees own only; doctor/staff see any patient.
  - `GetDoctorScheduleAsync` — doctor sees own only; staff sees any doctor. **Supports optional `from` / `to` `DateOnly` query params for daily/weekly views.** Rejects `from > to` with 400.
  - `UpdateAppointmentStatusAsync` — strict transition table; sets payment to `Charged` on Completed or NoShow.
- **DTOs** (`Application/DTOs/Appointments/`)
  — `BookAppointmentDto`, `CancelAppointmentDto`, `UpdateStatusDto`, `AppointmentResponseDto` (includes computed `EndTime`).
- **Validators** — working hours 09:00–17:00, 20-minute slot grid, past-date/time guards, ends-after-17:00 check.
- **`VisitTypeDurations`** (`Domain/Constants/VisitTypeDurations.cs`) — single source of truth for slot durations
  (`GeneralConsultation=30, FollowUp=15, AnnualCheckup=45`). Both service and validator consume it.
- **`AppointmentsController`** (`API/Controllers/`) — 7 endpoints, every route carries an explicit `[Authorize(Roles=...)]`:
  - `POST /api/appointments` — Patient, Receptionist, Admin
  - `GET  /api/appointments/{id}` — Patient, Doctor, Receptionist, Admin
  - `GET  /api/appointments/my` — Patient (policy `RequirePatientRole`)
  - `GET  /api/appointments/patient/{patientId}` — Doctor, Receptionist, Admin
  - `GET  /api/appointments/doctor/{doctorId}/schedule?from=&to=` — Doctor, Receptionist, Admin
  - `PUT  /api/appointments/{id}/cancel` — Patient, Receptionist, Admin
  - `PUT  /api/appointments/{id}/status` — Doctor, Receptionist, Admin
- **DI** — `IAppointmentService` registered as scoped in `Infrastructure/DependencyInjection.cs`.
- **`SmartCare.http`** — REST Client samples for every endpoint, including daily and weekly schedule views, both cancel forms (with/without reason), and all three status transitions.

### Design decisions
- Conflict detection is application-level (in-memory interval overlap, doctor + patient). No DB unique index on `(DoctorId, Date, TimeSlot)` — acceptable for graduation project; a concurrent booking race is theoretically possible but low-probability.
- Payment state machine: `OnHold` (book) → `Charged` (Completed/NoShow) or `Refunded` (Cancelled). No external payment gateway.
- Status transitions strictly enforced: `Pending→Confirmed`, `Confirmed→Completed`, `Confirmed→NoShow`. All others throw 400. Cancellation is a separate endpoint, not a status update.
- No per-doctor working-hours schema. Slot grid (09:00–17:00, 20-min increments) is global.
- Receptionist + Admin are treated as a staff superset throughout (CLAUDE.md pattern); Admin appears in every staff role list.
- Daily/weekly views are server-filtered via optional `from`/`to` query params rather than client-side slicing — keeps the doctor's working-set small once schedules grow.

### Security review (2026-05-11) — what was checked
- ✅ Every endpoint has an explicit role list (including `GET /{id}`).
- ✅ Patient cannot reach any list-other-patient endpoint (`patient/{patientId}`, `doctor/{id}/schedule`).
- ✅ Cross-tenant single-record access returns 403, not 404.
- ✅ `GetByIdAsync` defaults to 403 for unknown role strings (defense-in-depth; JWT only issues four valid roles).
- ✅ `Guid.Empty` PatientId from staff callers is rejected with the correct error (was previously masked as "Patient not found").
- ✅ Payment transitions only fire alongside valid status transitions; terminal states cannot transition further.
- ✅ Conflict detection covers partial overlaps, back-to-back slots (strict `<`), and patient double-booking across different doctors.

### Known issues / TODOs
- **Postgres not running locally** — three pending migrations must be applied once it is:
  ```
  dotnet ef database update --project SmartCare.Infrastructure --startup-project SmartCare.API
  ```
- **No doctor availability model** — any doctor can be booked on any day. A `DoctorAvailability` entity (working days, break times) is a future module.
- **Concurrent booking race** — two requests in the same millisecond for the same doctor slot can both succeed. Left as-is per graduation-project scope decision.
- **Status-code side-channel** — `GET /{id}`, `cancel`, and `status` distinguish 400 "Appointment not found" from 403 "Not authorized". A patient could probe whether an appointment ID exists. Practical risk is low (128-bit GUIDs); to harden, introduce a `NotFoundException` and have the "not found or not yours" cases return identical responses to non-staff callers.
- **No upper bound on `AppointmentDate`** — the validator accepts arbitrary far-future dates. Add `.Must(d => d <= DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(6))` if needed.

### Next step — Medical Records module
✅ Completed — see Session Handoff below.

---

## Session Handoff — Medical Records Module (2026-05-11)

### What was built
- **`IMedicalRecordService`** (`Application/Interfaces/IMedicalRecordService.cs`)
  — Single consolidated interface covering all three sub-resources. Seven methods:
  `GetPatientRecordsAsync`, `CreateRecordAsync`, `UpdateRecordAsync`,
  `AddPrescriptionAsync`, `GetPrescriptionsAsync`, `AddLabResultAsync`, `GetLabResultsAsync`.
- **`MedicalRecordService`** (`Infrastructure/Services/MedicalRecordService.cs`)
  — Direct `AppDbContext` access, primary-constructor DI. Private static mappers:
  `ToDto`, `ToPrescriptionDto`, `ToLabResultDto`. No AutoMapper.
- **6 DTOs** (`Application/DTOs/MedicalRecords/`)
  — `MedicalRecordDto`, `CreateMedicalRecordDto`, `PrescriptionDto`,
  `CreatePrescriptionDto`, `LabResultDto`, `CreateLabResultDto`.
- **`MedicalRecordsController`** (`API/Controllers/`) — `[Route("api")]` at class level; 7 endpoints:
  - `GET  /api/patients/{patientId}/records` — Doctor, Patient-own
  - `POST /api/patients/{patientId}/records` — Doctor only
  - `PUT  /api/records/{recordId}` — Doctor only
  - `GET  /api/records/{recordId}/prescriptions` — Doctor, Patient-own
  - `POST /api/records/{recordId}/prescriptions` — Doctor only
  - `POST /api/patients/{patientId}/lab-results` — Doctor only
  - `GET  /api/patients/{patientId}/lab-results` — Doctor, Patient-own
- **DI** — `services.AddScoped<IMedicalRecordService, MedicalRecordService>()` in `Infrastructure/DependencyInjection.cs`.
- **`SmartCare.http`** — REST Client samples for all 7 endpoints under `### ── MEDICAL RECORDS`.

### Design decisions
- **Single service interface** for all three sub-resources — chosen over three separate services; the domain is tightly coupled (`Prescription → MedicalRecord → Patient`).
- **`MedicalRecord` is 1:1 with `Patient`** (unique index on `PatientId`). `CreateRecordAsync` uses `AnyAsync` to predict the DB constraint and throw `ConflictException(409)` cleanly.
- **Prescriptions route uses `{recordId}` not `{patientId}`** — `GetPrescriptionsAsync` interface parameter is named `patientId` but the controller passes `recordId`. C# only checks types, not parameter names; a rename is safe if desired.
- **Lab results are append-only** — no Update/Delete endpoints by design.
- **No DoctorId on any medical entity** — schema constraint; any Doctor can modify any patient's record.
- **Notifications** — all 5 write operations push a `Notification` row to the patient in the same `SaveChangesAsync` unit-of-work.

### Security review (2026-05-11) — what was checked
- ✅ Patient cross-access on records and labs → 403 before the DB query (ownership check on route param).
- ✅ `GetPrescriptionsAsync` — lightweight `SELECT PatientId` first, ownership check, then load prescriptions. Clinical data never loaded if authorization fails.
- ✅ Receptionist blocked from all 7 endpoints.
- ✅ No sensitive fields in any DTO (`PasswordHash`, `FailedLoginAttempts` absent).
- ✅ `Guid.Empty` IDs rejected with 400 before any DB call.

### Known issues / TODOs
- **No FluentValidation validators** — the 6 DTOs under `DTOs/MedicalRecords/` have no `*Validator.cs` files yet. Add them; they auto-register via `ApplicationAssemblyMarker`.
- **Any Doctor can modify any patient's record** — no `DoctorId` FK on `MedicalRecord` or `Prescription`; relationship enforcement is impossible at the DB level.
- **Receptionist and Admin excluded from all endpoints** — deliberate per session spec; add to `[Authorize(Roles=...)]` lists if requirements change.

### Next step — Visit Summary module
✅ Completed — see Session Handoff below.

---

## Session Handoff — Visit Summary Module (2026-05-11)

### What was built
- **`IVisitSummaryService` / `VisitSummaryService`** (`Application/Interfaces/`, `Infrastructure/Services/`)
  — Direct `AppDbContext` access, primary-constructor DI. Two methods:
  - `SubmitSummaryAsync(appointmentId, dto, patientId)` — Patient-only write.
  - `GetSummaryAsync(appointmentId, requestingUserId, role)` — role-aware read.
- **`VisitSummaryDto`** (`Application/DTOs/VisitSummaries/`) — single DTO used for both
  input (Submit body) and output. Four fields only: `Symptoms`, `Description?`,
  `PainLevel`, `SymptomDuration?`. No `Id`, `AppointmentId`, or `SubmissionDate`
  in the response — clients already know the appointment, and the entity is 1:1.
- **`VisitSummaryController`** (`API/Controllers/`) — class-level
  `[Route("api/appointments/{appointmentId}/summary")]`, two endpoints:
  - `POST /api/appointments/{appointmentId}/summary` — `[Authorize(Roles="Patient")]`
  - `GET  /api/appointments/{appointmentId}/summary` — `[Authorize(Roles="Patient,Doctor")]`
- **DI** — `IVisitSummaryService` registered as scoped in `Infrastructure/DependencyInjection.cs`.
- **`SmartCare.http`** — REST samples under `### ── VISIT SUMMARY` covering both endpoints.

### Design decisions
- **1:1 with Appointment** (DB-enforced via unique index on `AppointmentId`).
  Duplicate submit predicted with `AnyAsync` → `ConflictException(409)`.
- **No migration needed** — `VisitSummary` entity, configuration, and `VisitSummaries`
  table all existed from `InitialCreate`. The DB check constraint `CK_VisitSummaries_PainLevel`
  enforces `0 <= PainLevel <= 10`.
- **Doctor-submitted summaries explicitly out of scope** — only the Patient can submit.
  When/if a "doctor visit note" feature is required, add a separate endpoint rather
  than overloading this one.
- **Status guard on Submit** — blocks `Completed` and `Cancelled` only.
  `Pending`, `Confirmed`, and `NoShow` are all submittable per current spec.
- **Notification** — a `Notification` row is pushed to the doctor in the same
  `SaveChangesAsync` unit-of-work as the summary insert.
- **Response DTO omits identifiers** — kept minimal per session spec. If the
  frontend needs `Id`/`SubmissionDate` for cache invalidation or audit, split
  into `CreateVisitSummaryDto` (input) and `VisitSummaryDto` (output with metadata).

### Security review (2026-05-11) — what was checked
- ✅ Patient can submit only for their own appointment — `appointment.PatientId == patientId` check.
- ✅ Doctor reads only their assigned appointment's summary — `appointment.DoctorId == requestingUserId` check.
- ✅ Receptionist/Admin blocked from both endpoints by `[Authorize(Roles=...)]` lists.
- ✅ Service-layer `role` switch in `GetSummaryAsync` defaults unknown roles to `false` (defense-in-depth if the controller's role list ever expands).
- ✅ Blocked patient cannot submit — `AccountStatus.Blocked` check on the loaded `Patient`.
- ✅ Empty/`Guid.Empty` AppointmentId rejected with 400 before any DB call.
- ✅ **Appointment-id enumeration eliminated** — both Submit and Get collapse "appointment not found" and "not authorized / not assigned" into a single 403. A non-owner Patient or non-assigned Doctor cannot distinguish "this id doesn't exist" from "this id belongs to someone else".
- ✅ Response DTO carries no sensitive fields (`PasswordHash`, `FailedLoginAttempts`, FK ids that could enable lateral movement, etc.).

### Known issues / TODOs
- **No FluentValidation validator** — `VisitSummaryDto` has no `*Validator.cs`. Add `VisitSummaryDtoValidator`:
  - `Symptoms`: `NotEmpty`, `MaximumLength(1000)`
  - `PainLevel`: align with DB — DB allows **0–10**; the original session spec said **1–10**.
    Decide which wins and enforce in both places. Current behaviour: any int passes the
    app layer; `<0` or `>10` is rejected by the DB with a 500 `DbUpdateException`.
  - `SymptomDuration`: `MaximumLength(200)`
- **`Symptoms` empty-string vulnerability** — DTO defaults `Symptoms = string.Empty`,
  EF `IsRequired` only enforces NOT NULL, so an empty `Symptoms` will persist.
  Validator above fixes this.
- **Race condition on duplicate submit** — two concurrent POSTs for the same appointment
  could both pass `AnyAsync`. The unique index catches one at `SaveChangesAsync`, but
  the second request gets a 500, not a clean 409. Acceptable for graduation-project scope.
- **`NoShow` is submittable** — current rule list excludes only `Completed`/`Cancelled`.
  If `NoShow` should also block submission, extend the status guard.
- **Same-DTO input/output** — using `VisitSummaryDto` for both submit body and read response
  means future input-only fields (e.g. validation-related) leak into responses. Split if
  the shapes diverge.

### Next step — Emergency module
✅ Partially completed — see Session Handoff below.

---

## Session Handoff — Emergency Module (2026-05-11)

### What was built
- **`GeoHelper`** (`Domain/Helpers/GeoHelper.cs`) — static Haversine formula.
  Returns great-circle distance in km. Includes `Math.Min(1.0, a)` clamp to prevent
  `NaN` for antipodal floating-point edge case.
- **5 DTOs** (`Application/DTOs/Emergencies/`)
  — `CreateEmergencyDto`, `CreateEmergencyDtoValidator` (lat ∈ [-90,90], lon ∈ [-180,180]),
  `EmergencyResponseDto`, `NearbyClinicDto` (includes `DistanceKm`).
- **`IEmergencyService`** (`Application/Interfaces/`) — two methods:
  `CreateEmergencyAsync`, `GetNearbyClinicsAsync`.
- **`EmergencyService`** (`Infrastructure/Services/`) — direct `AppDbContext` access,
  `ILogger<EmergencyService>` for accountability logging. Both methods log PatientId,
  coordinates, and UTC timestamp. `CreateEmergencyAsync` logs after `SaveChangesAsync`
  so the DB row is guaranteed committed before the log entry is written.
- **`EmergencyController`** (`API/Controllers/`) — two endpoints:
  - `POST /api/emergency/request` — `[Authorize(Roles="Patient")]`
  - `GET  /api/emergency/nearby-clinics?lat=&lng=` — `[Authorize(Roles="Patient")]`
- **5 seed clinics** (`Infrastructure/Data/Seed.cs` → `SeedClinicsAsync`) — Jordan
  locations: Jordan Hospital, Islamic Hospital, Al-Khalidi, King Hussein MC, Irbid
  Specialty Hospital. Idempotent; called from `Program.cs` after `SeedUsersAsync`.
- **`SmartCare.http`** — REST samples under `### ── EMERGENCY`.

### Design decisions
- **No migration needed** — `EmergencyRequests` and `Clinics` tables existed from `InitialCreate`.
- **Location only stored on explicit `POST /request`** — `Patient` entity has no location
  columns. `GET /nearby-clinics` takes coords as query params; they are logged but never persisted.
- **`CreateEmergencyAsync` blocks on existing Pending** — prevents spam; patient must wait
  for resolution before filing again. Returns 409 via `ConflictException`.
- **Nearby clinics: load all + in-memory Haversine** — clinics table is small; no spatial
  extension needed. `CreateEmergencyAsync` returns top 3; `GetNearbyClinicsAsync` returns all
  sorted ascending by distance.
- **Status transitions not yet implemented** — `Pending → Dispatched → Resolved` transitions
  and the staff-facing active-list endpoint are the next feature prompts.

### Security review (2026-05-11) — what was checked
- ✅ Both endpoints are `[Authorize(Roles="Patient")]` — Doctor/Receptionist/Admin cannot call them.
- ✅ `CreateEmergencyAsync` checks `AccountStatus.Blocked` before insert.
- ✅ `GET /nearby-clinics` does not expose other patients' data — purely mathematical, no DB reads of patient rows.
- ✅ Coordinates never stored on `Patient` entity — location captured only on consent (explicit POST).
- ✅ Both service methods log PatientId + coordinates + timestamp for accountability.
- ✅ Haversine clamped to prevent `NaN` on antipodal input.

### Known issues / TODOs
- **No `UpdateEmergencyStatusDto` / status update endpoint yet** — implement:
  `PUT /api/emergency/{id}/status` — `[Authorize(Roles="Doctor,Receptionist,Admin")]`
  Transitions: `Pending → Dispatched`, `Dispatched → Resolved`. All others → 400.
- **No staff active-list endpoint yet** — implement:
  `GET /api/emergency/active` — `[Authorize(Roles="Doctor,Receptionist,Admin")]`
  Returns all `Pending` and `Dispatched` requests with patient name + location.
- **No FluentValidation on `GetNearbyClinicsAsync` query params** — validation is done
  manually in the service (`BadRequestException`). Acceptable since query params cannot
  use FluentValidation auto-registration.
- **Concurrent duplicate-request race** — two simultaneous POSTs from the same patient
  can both pass `AnyAsync`. No unique index on `(PatientId, Status=Pending)`. Low risk
  for graduation scope; add a filtered unique index if needed.
- **No max-radius filter** — `GetNearbyClinicsAsync` always returns all clinics regardless
  of distance. Add `.Where(c => c.DistanceKm <= maxKm)` if a radius cap is required.

### Next step — Emergency module (remaining)
1. `UpdateEmergencyStatusDto` + validator (NewStatus must be Dispatched or Resolved).
2. Add `UpdateStatusAsync(id, dto, requesterId, role)` to `IEmergencyService`.
3. Add `GetActiveEmergenciesAsync()` to `IEmergencyService`.
4. Implement both in `EmergencyService`.
5. Wire up two new endpoints in `EmergencyController`.
6. Add REST samples to `SmartCare.http`.

---

## Session Handoff — Admin Module (2026-05-11)

### What was built
- **`IAdminService` / `AdminService`** (`Application/Interfaces/`, `Infrastructure/Services/`)
  — Direct `AppDbContext` access, primary-constructor DI. Eight methods across three concerns:

  **User management**
  - `GetUsersAsync(role?)` — lists all users, optional filter by role string; invalid role → 400.
  - `CreateStaffAsync(dto)` — creates Doctor or Receptionist only (Patient/Admin rejected); email uniqueness check.
  - `UpdateUserAsync(id, dto)` — updates only non-null fields; pattern-matches on derived type for role-specific fields; email uniqueness re-checked on change.
  - `DeactivateUserAsync(id, requesterId)` — sets `AccountStatus = Blocked`; guards: self-deactivation → 400, already-blocked → 400. **Never hard-deletes.**

  **System settings**
  - `GetSettingsAsync()` — returns all `SystemSettings` rows ordered by key.
  - `UpdateSettingAsync(dto)` — exact-key lookup; unknown key → 400. Cannot create new keys through this endpoint.

  **Reports**
  - `GetAppointmentReportAsync(startDate?, endDate?)` — total + per-status counts + per-doctor breakdown (ordered by total desc). `startDate > endDate` → 400.
  - `GetVisitFrequencyReportAsync(startDate?, endDate?)` — daily count of non-cancelled appointments, grouped and ordered by date in SQL.

- **5 DTOs** (`Application/DTOs/Admin/`)
  — `UserSummaryDto` (flat; all role-specific fields nullable), `CreateStaffDto` + validator (Doctor/Receptionist only), `UpdateUserDto` + validator (all fields optional, validated only when provided), `SystemSettingDto`, `UpdateSettingDto` + validator, `AppointmentReportDto` + `DoctorAppointmentBreakdownDto`, `VisitFrequencyReportDto` + `DailyVisitCountDto`.

- **`AdminController`** (`API/Controllers/`) — `[Route("api/admin")]`, class-level `[Authorize(Policy="RequireAdminRole")]`. Eight endpoints:
  - `GET  /api/admin/users?role=`
  - `POST /api/admin/users`
  - `PUT  /api/admin/users/{id}`
  - `DELETE /api/admin/users/{id}` (deactivate — soft only)
  - `GET  /api/admin/settings`
  - `PUT  /api/admin/settings`
  - `GET  /api/admin/reports/appointments?startDate=&endDate=`
  - `GET  /api/admin/reports/visits?startDate=&endDate=`

- **`SeedSystemSettingsAsync`** (`Infrastructure/Data/Seed.cs`) — per-key idempotent seed; inserts only missing keys so new defaults can be added later without wiping existing values. Seeds: `NoShowFee=5`, `GeneralConsultationDuration=30`, `FollowUpDuration=15`, `AnnualCheckupDuration=45`. Called from `Program.cs` after `SeedClinicsAsync`.

- **DI** — `IAdminService → AdminService` registered scoped in `Infrastructure/DependencyInjection.cs`.
- **`SmartCare.http`** — REST samples for all 8 endpoints + all-time variants for both report endpoints.

### Security review (2026-05-11) — what was checked
- ✅ All 8 endpoints protected by class-level `[Authorize(Policy="RequireAdminRole")]`; no `[AllowAnonymous]` on any action.
- ✅ `RequireAdminRole` maps to `RequireRole("Admin")` only — Doctor and Receptionist are blocked from every endpoint.
- ✅ Hard delete prevented — `DeactivateUserAsync` only sets `AccountStatus = Blocked`; no `context.Users.Remove()` call anywhere.
- ✅ Self-deactivation guard — admin cannot block their own account.
- ✅ `UserSummaryDto` exposes no `PasswordHash` or `FailedLoginAttempts`.
- ✅ `UpdateSettingAsync` is a closed write — only existing DB keys can be updated; no new key creation via this endpoint.
- ✅ `Guid.Empty` route IDs rejected with 400 before any DB call in mutating methods.
- ✅ Return type on `DeactivateUser` action corrected from `ApiResponse<object>` to `ApiResponse<string>`.

### Design decisions
- `UpdateUserAsync` uses `context.Users.FindAsync` (TPH — returns the concrete derived type), then switches on the runtime type to update role-specific fields. No separate `Doctors.FindAsync` needed.
- `GetAppointmentReportAsync` loads appointments with `.Include(a => a.Doctor)` then groups in-memory — avoids a complex EF `GroupBy` translation while remaining acceptable for graduation-project data sizes.
- `GetVisitFrequencyReportAsync` groups by `AppointmentDate` directly in SQL (simple single-column `GroupBy` translates cleanly to EF).
- Settings values are `string` in the DB (Key/Value schema). Numeric settings like `NoShowFee` are stored as `"5"` — callers parse as needed.
- Report date params are both optional; omitting them queries all time.

### Known issues / TODOs
- **No reactivation endpoint** — there is no `PUT /api/admin/users/{id}/activate` to reverse a deactivation. Add if the workflow requires it.
- **`CreateStaffAsync` returns no token** — the response is `UserSummaryDto`, not `AuthResponseDto`. The new staff member must log in separately to get a token.
- **Settings are free-text** — `UpdateSettingAsync` does not validate that numeric settings (e.g., `NoShowFee`, `GeneralConsultationDuration`) contain a valid number. The application does not currently read these values at runtime, so this is low-risk for now.
- **Report grouping is in-memory for appointment report** — acceptable for graduation scale; switch to a SQL `GroupBy` projection if data grows.

### Next step — Emergency module (remaining) or Error handling & validation

---

## Session Handoff — Error Handling, Validation, Swagger & Reminders (2026-05-12)

### What was built

**Unified error & response shape**
- **`ApiResponse<T>`** (`Application/Common/ApiResponse.cs`) — extended with `int StatusCode` and
  `List<string> Errors`. All success responses: `{ success:true, data, message, errors:[], statusCode:200 }`.
  All error responses: `{ success:false, data:null, message, errors:[...], statusCode }`.
- **`ExceptionMiddleware`** (`API/Middleware/ExceptionMiddleware.cs`) — rewritten to serialize
  `ApiResponse<object>.Fail(...)` instead of the old `ApiException` class.
  In Development, unhandled-exception stack trace is included in `errors[]`.
- **`ApiException.cs`** (`API/Errors/ApiException.cs`) — **deleted** (replaced by `ApiResponse`).
- **`InvalidModelStateResponseFactory`** (`API/Extensions/ApplicationServiceExtensions.cs`) —
  intercepts FluentValidation auto-validation failures and returns `ApiResponse<object>.Fail(...)`
  with all field errors in `errors[]`. Unifies FluentValidation errors with middleware errors.

**FluentValidation — new validators**
- `CreateMedicalRecordDtoValidator` — `PatientId` NotEmpty, `Diagnosis` NotEmpty+MaxLength(500),
  `TreatmentPlan` MaxLength(1000).
- `CreatePrescriptionDtoValidator` — both ID + string fields required; `IssueDate` not in the future.
- `CreateLabResultDtoValidator` — both ID + string fields required; `ResultDate` not in the future.
- `VisitSummaryDtoValidator` — `Symptoms` NotEmpty+MaxLength(1000), `PainLevel` InclusiveBetween(1,10),
  optional fields have MaxLength guards.
- All four auto-register via `AddValidatorsFromAssemblyContaining<ApplicationAssemblyMarker>`.

**Swagger / OpenAPI**
- `Swashbuckle.AspNetCore` v7.3.1 added to `SmartCare.API.csproj`.
- Swagger services configured in `ApplicationServiceExtensions` with Bearer JWT security definition
  (HTTP scheme, BearerFormat=JWT). Every endpoint requires the `Authorization: Bearer <token>` header.
- `app.UseSwagger()` / `app.UseSwaggerUI()` added to `Program.cs` (Development only).
- UI available at: `http://localhost:5000/swagger`

**Appointment reminder background service**
- `AppointmentReminderSent (bool, default false)` added to `Appointment` entity.
- Migration `AddAppointmentReminderSent` generated and committed.
- `AppointmentReminderService : BackgroundService` (`Infrastructure/Services/`) — uses
  `IServiceScopeFactory` to create a scoped `AppDbContext` per tick (correct pattern for hosted
  services with scoped dependencies). Runs every 30 minutes. Finds today's `Pending`/`Confirmed`
  appointments whose `TimeSlot` falls in the next hour and `AppointmentReminderSent == false`.
  Creates one `Notification` per patient and sets the flag in the same `SaveChangesAsync`.
- Registered as `services.AddHostedService<AppointmentReminderService>()` in `DependencyInjection.cs`.

### Migration to apply
```
dotnet ef database update --project SmartCare.Infrastructure --startup-project SmartCare.API
```

### Design decisions
- **Stack trace in `errors[]` (Dev only)** — keeps the error shape uniform; clients always find
  debug detail in the same field rather than a separate `details` property.
- **`InvalidModelStateResponseFactory` in `ApplicationServiceExtensions`** — co-located with
  `AddFluentValidationAutoValidation` so all validation wiring is in one place.
- **`IssueDate` / `ResultDate` not-in-future guard** — prescriptions and lab results are records
  of past events; future dates indicate data-entry errors.
- **`PainLevel` 1–10 (not 0–10)** — aligns with the validator spec; the DB check constraint
  allows 0–10, so 0 will be rejected at the app layer but would survive a direct DB write.
  Change `InclusiveBetween(1, 10)` to `(0, 10)` in `VisitSummaryDtoValidator` if 0 should be valid.
- **Reminder window: 30-min poll, 1-hour lookahead** — a 30-min poll with a 1-hour window means
  each appointment is eligible for at most 2 poll cycles before the flag is set. The flag prevents
  duplicate notifications regardless of timing.

### Known issues / TODOs
- **Reminder fires even when Postgres is down** — `SaveChangesAsync` will throw; exception is
  unhandled inside `SendRemindersAsync`. Consider adding a try/catch with a log in the service.
- **Swagger only in Development** — if the hosted environment needs Swagger (e.g. staging), move
  the `IsDevelopment()` check or remove it.
- **`PainLevel` 0 vs 1** — see design decision above; align DB constraint and validator if needed.
- **No email / push notification** — reminders are DB `Notification` rows only. Wire up an
  email/push provider (SendGrid, FCM) in a later session if required.

### Next step — Security audit
✅ Completed — see Final Project Summary below.

---

# Final Project Summary (2026-05-12)

## Modules — status & endpoints

All endpoints are wrapped in `ApiResponse<T>` and protected by `[Authorize]` on `BaseApiController`
with explicit role lists. Every DTO has a FluentValidation validator. JWT is HS512 with
`ValidAlgorithms` pinned, `ClockSkew = 0`, and a startup-time key-length guard (≥ 64 chars).

### ✅ Auth module — `AuthController`
| Method | Route | Roles |
|---|---|---|
| POST | `/api/auth/register` | `[AllowAnonymous]` — Patient self-register (role forced server-side) |
| POST | `/api/auth/register/staff` | `RequireAdminRole` — Admin creates Doctor/Receptionist/Admin |
| POST | `/api/auth/login` | `[AllowAnonymous]` — BCrypt verify, lockout after 5 failed attempts |

### ✅ Appointments module — `AppointmentsController`
| Method | Route | Roles |
|---|---|---|
| POST | `/api/appointments` | Patient, Receptionist, Admin |
| GET  | `/api/appointments/{id}` | Patient, Doctor, Receptionist, Admin (ownership-checked) |
| GET  | `/api/appointments/my` | Patient |
| GET  | `/api/appointments/patient/{patientId}` | Doctor, Receptionist, Admin |
| GET  | `/api/appointments/doctor/{doctorId}/schedule?from=&to=` | Doctor (self), Receptionist, Admin |
| PUT  | `/api/appointments/{id}/cancel` | Patient (own), Receptionist, Admin |
| PUT  | `/api/appointments/{id}/status` | Doctor (own), Receptionist, Admin |

### ✅ Medical Records module — `MedicalRecordsController`
| Method | Route | Roles |
|---|---|---|
| GET  | `/api/patients/{patientId}/records` | Doctor, Patient (own) |
| POST | `/api/patients/{patientId}/records` | Doctor |
| PUT  | `/api/records/{recordId}` | Doctor |
| GET  | `/api/records/{recordId}/prescriptions` | Doctor, Patient (own) |
| POST | `/api/records/{recordId}/prescriptions` | Doctor |
| POST | `/api/patients/{patientId}/lab-results` | Doctor |
| GET  | `/api/patients/{patientId}/lab-results` | Doctor, Patient (own) |

### ✅ Visit Summary module — `VisitSummaryController`
| Method | Route | Roles |
|---|---|---|
| POST | `/api/appointments/{appointmentId}/summary` | Patient (own appointment) |
| GET  | `/api/appointments/{appointmentId}/summary` | Patient (own), Doctor (assigned) |

### ✅ Emergency module — `EmergencyController`
| Method | Route | Roles |
|---|---|---|
| POST | `/api/emergency/request` | Patient |
| GET  | `/api/emergency/nearby-clinics?lat=&lng=` | Patient (lat/lng required) |

> Status-update (`PUT /api/emergency/{id}/status`) and staff active list (`GET /api/emergency/active`) were specified but **not implemented** — see Phase 2.

### ✅ Admin module — `AdminController` (class-level `RequireAdminRole`)
| Method | Route |
|---|---|
| GET    | `/api/admin/users?role=` |
| POST   | `/api/admin/users` (creates Doctor or Receptionist) |
| PUT    | `/api/admin/users/{id}` |
| DELETE | `/api/admin/users/{id}` (soft-delete — sets `AccountStatus = Blocked`) |
| GET    | `/api/admin/settings` |
| PUT    | `/api/admin/settings` |
| GET    | `/api/admin/reports/appointments?startDate=&endDate=` |
| GET    | `/api/admin/reports/visits?startDate=&endDate=` |

### ✅ Cross-cutting
- **Error handling** — `ExceptionMiddleware` translates `BadRequest/Unauthorized/Forbidden/Conflict` exceptions to the right status code; all other exceptions become 500 with the stack trace included only in Development.
- **Validation** — FluentValidation auto-runs; failures flow through `InvalidModelStateResponseFactory` into the unified `ApiResponse` shape.
- **Swagger** — Bearer-aware UI at `/swagger` in Development.
- **Appointment reminders** — `AppointmentReminderService : BackgroundService`; polls every 30 minutes, looks 1 hour ahead, idempotent via `AppointmentReminderSent` flag, wrapped in try/catch so DB outages do not crash the host.
- **Security audit** — patched JWT validation (lifetime, algorithm pinning, clock skew), safe claim accessors (`UserGetUserId/GetRole` → 401 instead of 500 on bad tokens), service-layer role allowlists (defense-in-depth), `[BindRequired]` on emergency lat/lng, FK cascade-delete switched to `Restrict` on all clinical entities so a stray `Remove(patient)` cannot wipe medical history. Migration: `HardenCascadeDeletes`.

## Known limitations

- **No refresh tokens** — JWTs are 7-day, no revocation. Logging out is client-side only.
- **Blocked-account login message is specific** — minor user-enumeration vector (intentional UX trade-off).
- **No doctor availability model** — any doctor is bookable any day; the global 09:00–17:00 / 20-minute grid is the only constraint.
- **Concurrent-booking race** — application-level conflict detection only; two requests in the same millisecond for the same slot can both succeed. No DB unique index on `(DoctorId, AppointmentDate, TimeSlot)`.
- **Status-code side-channel on Appointments** — `GET/cancel/status` on appointments distinguish 400 "not found" from 403 "not yours" for staff callers (acceptable; GUIDs are 128-bit). Visit Summary already collapses these.
- **No `DoctorId` on `MedicalRecord` / `Prescription`** — any Doctor can update any patient's record; cannot enforce "assigned doctor only" at the schema level.
- **Receptionist & Admin excluded from Medical Records endpoints** — by design; revisit if requirements expand.
- **Emergency module incomplete** — status update + active list endpoints are designed but not implemented.
- **Notifications are DB rows only** — no email / push delivery channel.
- **System settings are free-text strings** — no schema enforcement on numeric values like `NoShowFee`.
- **Reports group in-memory** — `GetAppointmentReportAsync` loads all rows then groups in C#; will not scale past tens of thousands of appointments.
- **No rate limiting / brute-force throttling beyond the 5-attempt account block** — `/login` is otherwise unthrottled.
- **CORS pinned to `http://localhost:4200`** — fine for dev; production needs an env-configurable origin list.
- **Single Postgres connection string in `appsettings.json`** with a placeholder password and a placeholder `TokenKey`. Both must be overridden via environment variables / user secrets before any non-local run.

## Suggested improvements for Phase 2

**Auth & sessions**
- Refresh-token endpoint with HTTP-only cookie + revocation table; shorten access-token TTL to ~30 min.
- Password reset flow (email-token based).
- 2FA for Admin and Doctor accounts (TOTP).

**Clinical correctness**
- `DoctorAvailability` entity (working days, breaks, vacation); enforce in booking validator.
- DB unique index on `(DoctorId, AppointmentDate, TimeSlot)` filtered to non-cancelled to kill the booking race.
- Add `DoctorId` FK on `MedicalRecord`; enforce "assigned doctor only" updates.
- Doctor visit notes as a separate entity from patient `VisitSummary`.
- Finish Emergency: `PUT /api/emergency/{id}/status` (Pending → Dispatched → Resolved) and `GET /api/emergency/active` for staff dashboards.

**Reliability & observability**
- Pluggable notification channels (SendGrid / Twilio / FCM) behind `INotificationSender`.
- Structured logging with Serilog → file + ELK/Seq; correlation IDs per request.
- Health-check endpoint (`/health`) wired into `AddHealthChecks` covering DB and the reminder service.
- Rate limiting (`AddRateLimiter`) on `/login` and `/register`.

**Data & reporting**
- Move admin reports to a read replica or pre-aggregated `DailyAppointmentSummary` table.
- Hardening for system settings — typed accessor (`ISettingsService.GetInt(key)`) with schema validation.
- Audit log table — every clinical write captured with user, before/after JSON, timestamp.

**Security hardening**
- HSTS + HTTPS redirect; HTTPS-only cookies.
- Configurable CORS origins via `appsettings`.
- Move `TokenKey` / DB password to user secrets (dev) and a secrets manager (prod).
- Probe-resistant Appointment endpoints: introduce `NotFoundException` and collapse 400/403 for non-staff callers (matches Visit Summary pattern).
- Rotate to RS256 if a public-key consumer ever appears (mobile apps, BFFs).

**Developer experience**
- Integration test project (xUnit + `WebApplicationFactory` + Testcontainers-Postgres).
- CI workflow: `dotnet build` + `dotnet test` + `dotnet ef migrations script --idempotent` on every PR.
- Docker Compose stack: API + Postgres + Adminer for one-command local setup.

## How to run the project from scratch

### Prerequisites
- .NET 9 SDK
- PostgreSQL 14+ running locally
- `dotnet-ef` global tool: `dotnet tool install --global dotnet-ef`

### 1. Clone & restore
```bash
cd /Users/mohammadmaher/Desktop/GraduationProject/SmartCare
dotnet restore
```

### 2. Configure the database connection
Edit `SmartCare.API/appsettings.Development.json` (or set env vars):
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=SmartCareDb;Username=<your-user>;Password=<your-password>"
  },
  "TokenKey": "<at-least-64-characters-of-random-secret>"
}
```
> `TokenKey` shorter than 64 chars will fail fast at startup. Use `openssl rand -base64 64` to generate one.

### 3. Create the database role (one-time)
```bash
createdb SmartCareDb   # or: psql -c "CREATE DATABASE \"SmartCareDb\";"
# ensure the username in the connection string exists and owns the DB
```

### 4. Apply migrations
```bash
dotnet ef database update \
  --project SmartCare.Infrastructure \
  --startup-project SmartCare.API
```
This applies all four migrations (`InitialCreate`, `AddFailedLoginAttempts`, `AddAppointmentReminderSent`, `HardenCascadeDeletes`) and seeds:
- One user per role (see `Infrastructure/Data/Seed.cs` for credentials).
- Five Jordan-area clinics.
- Four `SystemSettings` rows (`NoShowFee`, visit-type durations).

### 5. Run the API
```bash
dotnet run --project SmartCare.API
```
Default URL: `http://localhost:5000` (from `launchSettings.json`).
If macOS Control Center (AirPlay) holds `:5000`, run with `--no-launch-profile`:
```bash
ASPNETCORE_URLS=http://localhost:5050 ASPNETCORE_ENVIRONMENT=Development \
  dotnet run --project SmartCare.API --no-launch-profile
```

### 6. Try the API
- Swagger UI: `http://localhost:5000/swagger`
- REST samples: open `SmartCare.http` in VS Code (REST Client extension); fill `@token` after login.
- Seed login (Admin): see `Seed.SeedUsersAsync` for the email/password.

### Useful commands
```bash
# Clean build (0 warnings, 0 errors expected)
dotnet build SmartCare.sln

# Add a migration
dotnet ef migrations add <Name> \
  --project SmartCare.Infrastructure --startup-project SmartCare.API

# Drop the DB and reseed
dotnet ef database drop -f \
  --project SmartCare.Infrastructure --startup-project SmartCare.API
dotnet ef database update \
  --project SmartCare.Infrastructure --startup-project SmartCare.API
```

---

## Session Handoff — Emergency Module Completion (2026-05-12)

### What was built
- **`PUT /api/emergency/{id}/status`** — staff-only status update endpoint.
  - Roles: Doctor, Receptionist, Admin.
  - Body: `{ "newStatus": 1|2 }` (Dispatched or Resolved).
  - New files: `UpdateEmergencyStatusDto.cs`, `UpdateEmergencyStatusDtoValidator.cs`.
  - Service method: `UpdateStatusAsync(requestId, dto, requesterId, role)` on `IEmergencyService` / `EmergencyService`.
  - Writes a `Notification` row to the patient on every transition.
  - Accountability log: `RequestId`, `OldStatus→NewStatus`, `UpdatedBy` (staff Guid), `Role`, `At`.

- **`GET /api/emergency/active`** — staff-only active list.
  - Roles: Doctor, Receptionist, Admin.
  - Returns all `Pending` and `Dispatched` requests ordered by `RequestTime` ascending (oldest first).
  - New DTO: `ActiveEmergencyDto` (`RequestId`, `PatientName`, `Latitude`, `Longitude`, `RequestTime`, `Status`).
  - Single EF Core query with `Include(Patient)` and server-side projection — no in-memory mapping.

- **REST samples** added to `SmartCare.http` under `── EMERGENCY ──`.

### Design decisions
- `ActiveEmergencyDto` is a separate lean DTO rather than reusing `EmergencyResponseDto`. `EmergencyResponseDto` carries `PatientId` and a `NearbyClinics` list, neither of which is needed in the staff active-list view. Keeping them separate avoids evolving one DTO to serve two unrelated consumers.
- `UpdateStatusAsync` takes `requesterId` + `role` as explicit parameters rather than reading claims inside the service. Keeps the service layer unaware of `HttpContext` and makes unit testing straightforward.
- Transition guard uses a switch tuple expression — exhaustive by default, so any new `EmergencyStatus` value added to the enum will fall to `_ => false` (safe default) rather than silently allowing it.
- `Guid.Empty` in the route is rejected with 400 in the service before the DB round-trip.
- Log is written after `SaveChangesAsync`, consistent with the `CreateEmergencyAsync` pattern (audit row guaranteed committed before the log line).

### Security review performed (2026-05-12)
Six checks reviewed; one issue found and fixed:

| Check | Result |
|---|---|
| Both endpoints restricted to Doctor/Receptionist/Admin | ✅ Pass |
| Patient cannot reach either endpoint | ✅ Pass |
| Status transitions strictly enforced (no skip, no revert) | ✅ Pass |
| Accountability log on every status change | ✅ Pass |
| Active list exposes no sensitive fields | ✅ Pass |
| Race condition on concurrent status updates | ⚠️ Fixed |

**Race condition fix:** Added `[ConcurrencyCheck]` to `EmergencyRequest.Status`. EF Core now includes the original status value in the `WHERE` clause of every `UPDATE`. A concurrent write that changes the status between read and save causes zero rows to match → `DbUpdateConcurrencyException` → caught in `UpdateStatusAsync` → re-thrown as `ConflictException` → 409 to the caller. No migration required (no new column; only the generated SQL changes).

### New known issues introduced
None. All six security checks pass after the concurrency fix.
