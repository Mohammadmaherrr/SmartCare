# SmartCare Backend — Claude Code Instructions

## Project
ASP.NET Core 9 Web API, Clean Architecture
Layers: API / Application / Domain / Infrastructure
Database: PostgreSQL with EF Core + Npgsql
Auth: JWT (HS512) with role-based access (Admin, Doctor, Receptionist, Patient)

## Reference Architecture
Dating app (reference only — patterns and structure):
Path: /Users/mohammadmaher/Desktop/demo/DatingApp

SmartCare (active project):
Path: /Users/mohammadmaher/Desktop/GraduationProject/SmartCare

Follow the dating app's patterns and naming conventions; never copy its business logic.

## Coding Rules — Always Follow These
- Never use raw SQL, always use EF Core
- All endpoints must have [Authorize] with correct roles
- All responses use ApiResponse<T> wrapper: { success, data, message, errors, statusCode }
- All DTOs must have FluentValidation validators
- Use async/await everywhere, no blocking calls
- Never expose PasswordHash in any response DTO
- Foreign key checks before any insert or update
- Return 403 (not 404) when a user accesses another user's data
- Follow the coding style and naming conventions of the dating app

## Project Structure
- Controllers  → SmartCare.API/Controllers/
- Services     → SmartCare.Application/Services/
- Interfaces   → SmartCare.Application/Interfaces/
- DTOs         → SmartCare.Application/DTOs/
- Entities     → SmartCare.Domain/Entities/
- DbContext    → SmartCare.Infrastructure/Data/

## Module Status
- ✅ Domain entities
- ✅ Database setup
- ✅ Auth module
- ✅ Appointments module
- ✅ Medical Records module
- ✅ Visit Summary module
- ✅ Emergency module
- ✅ Admin module
- ✅ Error handling & validation
- ✅ Appointment reminders
- ✅ Security audit

## Current Known Issues / TODOs
- **Placeholder secrets** — `appsettings.Development.json` ships with placeholder DB password and `TokenKey`. Override via env vars / user secrets before any non-local run (TokenKey must be ≥ 64 chars or startup fails).
- **No refresh tokens** — 7-day JWTs with no revocation; logout is client-side only.
- **No rate limiting on `/login`** beyond the 5-attempt account block.
- **Concurrent-booking race** — application-level conflict detection only; no DB unique index on `(DoctorId, AppointmentDate, TimeSlot)`.
- **No `DoctorId` on `MedicalRecord` / `Prescription`** — any Doctor can update any patient's record; cannot enforce "assigned doctor only" at the schema level.
- **Status-code side-channel on Appointments** — `GET /{id}`, `cancel`, `status` distinguish 400 "not found" from 403 "not yours" for staff callers. Visit Summary already collapses these; Appointments doesn't yet.
- **Notifications are DB rows only** — no email / push delivery channel (no SendGrid/FCM wired up).
- **CORS pinned to `http://localhost:4200`** — production needs env-configurable origins.
- **Reports group in-memory** — `GetAppointmentReportAsync` loads all rows then groups in C#; doesn't scale past tens of thousands of appointments.
- **System settings are free-text strings** — no schema enforcement on numeric values like `NoShowFee`.

---
Full session history in CLAUDE_HISTORY.md
