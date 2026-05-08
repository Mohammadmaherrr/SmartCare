# SmartCare Backend — Claude Code Instructions

## Project
ASP.NET Core 9 Web API, Clean Architecture
Layers: API / Application / Domain / Infrastructure
Database: PostgreSQL with EF Core + Npgsql
Auth: JWT with role-based access (Admin, Doctor, Receptionist, Patient)

## Reference Architecture
Dating app (reference only — patterns and structure):
Path: /Users/mohammadmaher/Desktop/demo/DatingApp

SmartCare (active project):
Path: /Users/mohammadmaher/Desktop/GraduationProject/SmartCare

When building SmartCare, follow the patterns from the 
dating app but never copy its business logic.

## Coding Rules — Always Follow These
- Never use raw SQL, always use EF Core
- All endpoints must have [Authorize] with correct roles
- All responses use ApiResponse<T> wrapper: { success, data, message }
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

## Module Status (update as you finish)
⬜ Project scaffold
⬜ Domain entities
⬜ Database setup
⬜ Auth module
⬜ Appointments module
⬜ Medical Records module
⬜ Visit Summary module
⬜ Emergency module
⬜ Admin module
⬜ Error handling & validation
⬜ Appointment reminders
⬜ Security audit

## Module Status (update as you finish)                                                                                           
  ⬜ Project scaffold                                                                                                               
  ✅ Domain entities                                                                                                                
  ✅ Database setup                                                                                                                 
  ✅ Auth module                          
  ⬜ Appointments module
  ⬜ Medical Records module
  ⬜ Visit Summary module
  ⬜ Emergency module
  ⬜ Admin module                                                                                                                   
  ⬜ Error handling & validation
  ⬜ Appointment reminders                                                                                                          
  ⬜ Security audit                       

  ## Session Handoff — Database Layer (2026-05-08)                                                                                  
   
  ### What was built                                                                                                                
  - **AppDbContext** (`Infrastructure/Data/AppDbContext.cs`) — 14 DbSets, global UTC
    DateTime converters, `ApplyConfigurationsFromAssembly` wired up.                                                                
  - **TPH inheritance** — Patient, Doctor, Admin, Receptionist all share the `Users`                                                
    table, discriminated by the existing `Role` (integer) column.                                                                   
  - **13 `IEntityTypeConfiguration<T>` files** in `Infrastructure/Data/Configurations/`                                             
    covering every entity. Relationships, max lengths, required flags, and indexes all                                              
    configured via Fluent API — nothing inline in OnModelCreating.                                                                  
  - **`IRepository<T>` / `Repository<T>`** — generic CRUD + SaveChangesAsync in                                                     
    `Application/Interfaces/` and `Infrastructure/Repositories/`.                                                                   
    extension method registers AppDbContext (Npgsql) and `IRepository<>/Repository<>`                                               
    as scoped. Called first in Program.cs before AddApplicationServices.                                                            
  - **Migration `InitialCreate`** generated and committed to                                                                        
    `Infrastructure/Migrations/`.                                                                                                   
                                                                                                                                    
  ### What works                                                                                                                    
  - `dotnet build` — 0 errors, 0 warnings across all four projects.                                                                 
  - `dotnet run` — server starts on http://localhost:5000; DB connection error is caught
    and logged (not thrown), so the API comes up even without Postgres running.                                                     
  - EF Core model validated by the migration tool — schema is consistent with all                                                   
    entity configurations.                                                                                                          
                                                                                                                                    
  ### Known issues / TODOs                                                                                                          
  - **Postgres not running locally** — migration has not been applied yet. Run once                                                 
    Postgres is up:                                                                
    dotnet ef database update --project SmartCare.Infrastructure --startup-project SmartCare.API                                    
   
  - **`appsettings.Development.json` password** is the placeholder `yourpassword` —                                                 
  - **`IRepository<T>` is generic only** — domain-specific query methods (e.g.                                                      
  GetAppointmentsByPatientId, GetActiveEmergencies) will need dedicated repository                                                  
  interfaces in `Application/Interfaces/` as each module is built.                                                                  
  - **No soft-delete** — Delete removes rows permanently. Decide before Auth module                                                 
  whether patients/doctors should be deactivated (AccountStatus) instead of deleted.                                                
                                                                                                                                    
  ### Next step — Auth module
  ✅ Completed — see Session Handoff below.

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
Suggested order:
1. `IAppointmentRepository` in `Application/Interfaces/` with methods:
   `GetByPatientIdAsync`, `GetByDoctorIdAsync`, `GetByIdAsync`.
2. `AppointmentRepository` in `Infrastructure/Repositories/`.
3. `AppointmentService` + `IAppointmentService` — book, cancel, list.
4. DTOs: `CreateAppointmentDto`, `AppointmentDto`, validators.
5. `AppointmentsController` — enforce that patients can only see their own appointments
   (return 403 otherwise, not 404).

