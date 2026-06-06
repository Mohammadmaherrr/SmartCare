# SmartCare

A web-based clinic management system that brings appointments, medical records, and
emergency assistance into a single platform. It supports four roles — **Admin, Doctor,
Receptionist, and Patient** — each with its own dashboard and permissions.

Graduation Project — Jordan University of Science & Technology, Department of Computer Engineering.

## Features

- **Authentication & Authorization** — JWT (HS512), BCrypt password hashing, role-based access,
  and account lockout after repeated failed logins.
- **Appointments** — booking, cancellation, status updates, double-booking prevention, and a
  refundable booking fee to reduce no-shows.
- **Medical Records** — diagnoses, treatment plans, prescriptions, and lab results
  (doctors write; patients read their own).
- **Visit Summary** — patients submit symptoms before an appointment so the doctor has context.
- **Emergency** — location-based SOS that finds nearby clinics (Haversine distance) and lets
  staff track requests through a status workflow.
- **Admin** — user management, system settings, and reports.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | ASP.NET Core 9 Web API (C#) |
| Architecture | Clean Architecture (API / Application / Domain / Infrastructure) |
| Database | PostgreSQL + Entity Framework Core 9 (Npgsql) |
| Auth | JWT (HS512), BCrypt, FluentValidation |
| Frontend | Angular 21 (standalone components, signals), Angular Material |
| Maps | Leaflet + OpenStreetMap |

## Project Structure

```
SmartCare/
├── SmartCare.API/            # Controllers, middleware, auth config (entry point)
├── SmartCare.Application/    # Interfaces, DTOs, validators
├── SmartCare.Domain/         # Entities, enums, constants
├── SmartCare.Infrastructure/ # DbContext, repositories, service implementations
└── SmartCare-Client/         # Angular frontend
```

## Getting Started

### Prerequisites
- .NET 9 SDK
- Node.js (LTS) + npm
- PostgreSQL 16

### Backend
1. Update the connection string and `TokenKey` in `SmartCare.API/appsettings.Development.json`
   (the `TokenKey` must be at least 64 characters).
2. Apply the database migrations and run the API:
   ```bash
   cd SmartCare.API
   dotnet ef database update
   dotnet run
   ```
   The API starts at `http://localhost:5050` (Swagger UI is available in Development).

### Frontend
```bash
cd SmartCare-Client
npm install
npm start
```
The client runs at `http://localhost:4200`.

## Notes
- The backend refuses to start if the JWT key is shorter than 64 characters.
- Swagger is enabled only in the Development environment.
- Database schema is managed entirely through EF Core migrations.
