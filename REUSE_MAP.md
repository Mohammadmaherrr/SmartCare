# SmartCare — DatingApp Reuse Map

Reference: `/Users/mohammadmaher/Desktop/demo/DatingApp`

---

## COPY AS-IS (~30% of architecture)

| DatingApp Artifact | File(s) | Notes |
|---|---|---|
| JWT + Refresh Token infrastructure | `Services/TokenService.cs`, `Interfaces/ITokenService.cs` | Same pattern: short-lived JWT + HTTP-only cookie refresh. Swap `TokenKey` config value |
| Exception middleware | `Middleware/ExceptionMiddleware.cs` | Generic — no domain coupling |
| API error model | `Errors/ApiException.cs` | Generic — no domain coupling |
| BaseApiController | `Controllers/BaseApiController.cs` | Route convention + action filter registration |
| Pagination | `Helpers/PaginatedResult.cs`, `Helpers/PagingParams.cs` | Domain-agnostic — reuse for appointments, records, etc. |
| UTC DateTime value converter | `Data/AppDbContext.cs` (lines 56–79) | Critical for clinic scheduling — keep exactly as-is |
| ClaimsPrincipal extensions | `Extensions/ClaimsPrincipalExtentions.cs` | Rename `GetMemberId()` → `GetUserId()` |
| Photo service | `Services/PhotoService.cs`, `Interfaces/IPhotoService.cs` | Reuse for doctor/patient profile photos |
| CORS configuration | `Program.cs` | Same Angular frontend origin pattern |
| Program.cs bootstrap structure | `Program.cs` | Middleware ordering, Identity, auth, EF, SignalR pipeline |

---

## MODIFY (~25% of architecture)

| DatingApp Artifact | What to Change | Why |
|---|---|---|
| `AppUser` entity | Drop `Member` nav; add `Doctor?`, `Patient?`, `Receptionist?` profile navs | Role-discriminated profiles with different fields |
| Role seeding in `OnModelCreating` | Replace Member/Moderator/Admin with Admin/Doctor/Receptionist/Patient | Direct swap |
| `AccountController` | Keep register/login/refresh-token shape; branch registration by role — Patient self-registers, Doctor/Receptionist created by Admin | Asymmetric onboarding |
| Repository pattern | Add `IUnitOfWork` wrapping all repositories with single `CommitAsync()` | Clinic operations are multi-entity transactions (appointment booking touches multiple aggregates atomically) |
| `LogUserActivity` filter | Extend into a proper audit log (who accessed what record, when) | Medical data access requires audit trail |
| Admin controller | Add user activation/deactivation, doctor schedule management, system stats | Current stub covers role edits only |
| SignalR PresenceHub | Repurpose for clinic notifications: appointment reminders, emergency alerts | Connection tracking logic reusable; domain events change |
| `DbContext` | Keep Identity base + UTC converter + relationship conventions; add new DbSets | Schema is new, patterns are identical |
| Seed data | Replace with clinic seed: admin user, sample doctors, sample patients | Different domain data |

---

## BUILD FROM SCRATCH (~45% of architecture)

| Module | What's Needed | Complexity |
|---|---|---|
| **Appointments** | `Appointment` entity, `AppointmentController`, availability engine, status machine (Pending → Confirmed → Completed / Cancelled / No-show), `IAppointmentRepository` | High |
| **Doctor Availability** | `DoctorSchedule` entity (recurring weekly slots), `DoctorLeave` entity, slot-generation logic, overlap validation | High |
| **Medical Records** | `MedicalRecord` entity (versioned, immutable append), role-based access control, `IMedicalRecordRepository` | High |
| **Visit Summary** | `VisitSummary` entity (Diagnosis, Prescriptions, Notes, FollowUpDate), linked to Appointment + MedicalRecord, Doctor-only write | Medium |
| **Emergency Module** | `EmergencyCase` entity, triage priority levels, on-call doctor assignment, escalation workflow, real-time alerts via SignalR | High |
| **Prescriptions** | `Prescription` entity within Visit Summary — medication, dosage, duration | Medium |
| **Role-specific profiles** | `DoctorProfile`, `PatientProfile`, `ReceptionistProfile` entities with own DTOs and controllers | Medium |
| **Notification service** | `INotificationService` — appointment reminders, cancellation alerts, emergency broadcasts | Medium |
| **Resource-level authorization** | `IAuthorizationHandler` implementations — Patient sees own records only, Doctor sees assigned patients only | Medium |
| **Admin reporting** | Aggregation queries: appointments per day, doctor utilization, no-show rates | Low–Medium |

---

## Critical Architectural Upgrades (not in DatingApp)

### 1. Unit of Work
DatingApp repos each call their own `SaveAllAsync()`. SmartCare needs a single `IUnitOfWork` with `CommitAsync()` because booking an appointment must atomically create the appointment, block the doctor's slot, and update the patient record.

### 2. Resource-level Authorization
DatingApp auth is role-only. SmartCare needs ownership checks:
- *"Is this the patient's own record?"*
- *"Did this doctor conduct this visit?"*

Requires ASP.NET Core `IAuthorizationHandler` resource policies — not just `[Authorize(Roles = "Doctor")]`.

---

## Coding Standards (from DatingApp)

- Repository interfaces → `Interfaces/`
- Repository implementations → `Data/`
- Services behind interfaces, registered in `Program.cs`
- Parameter/filter classes → `Helpers/`
- Extension methods → `Extensions/`
- Manual DTO mapping via extension methods — no AutoMapper
- Soft-delete flags where hard delete is unsafe
- All `DateTime` stored as UTC
- `AppUser` extends `IdentityUser`
- `PaginatedResult<T>` for all paginated list endpoints
