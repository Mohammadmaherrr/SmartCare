# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Angular 21 SPA — front-end for the SmartCare medical management system.

| Service | URL |
|---|---|
| Frontend dev server | `http://localhost:4200` |
| Backend API | `http://localhost:5050/api` (configured in `src/environments/environment.ts`) |

## Reference Paths

| Codebase | Path | Purpose |
|---|---|---|
| SmartCare backend | `/Users/mohammadmaher/Desktop/GraduationProject/SmartCare` | Active backend — check endpoint contracts here |
| Dating app client | `/Users/mohammadmaher/Desktop/demo/DatingApp/client` | Structural/naming reference only — never copy business logic |

Follow the dating app's component structure, naming, and patterns. Use `inject()` for all DI; use signals for local state.

## Commands

```bash
npm start          # dev server at http://localhost:4200
npm run build      # production build
npm test           # Vitest (not Karma)
ng g c path/name   # generates standalone component with SCSS
```

Backend (from repo root):
```bash
cd SmartCare && dotnet run --project SmartCare.API
```

## Architecture

### HTTP Layer

All HTTP goes through `ApiService` (`_services/api.service.ts`):
- Prefixes `environment.apiUrl`
- Unwraps the `ApiResponse<T>` envelope → callers receive `T` directly
- **API paths must NOT start with `/`** — `api.get('appointments')` not `api.get('/appointments')`

Feature services call `ApiService`; they never inject `HttpClient` directly.

### Interceptors (order matters — registered in `app.config.ts`)

1. `jwtInterceptor` — attaches `Authorization: Bearer` token from `localStorage`; skips `/auth/login` and `/auth/register`
2. `errorInterceptor` — handles all HTTP errors globally:
   - **401**: if user was authenticated → session expired, logout + navigate to `/login` + warning toast; if not authenticated → invalid credentials toast (e.g. wrong password on login page)
   - **403**: "no permission" toast
   - **400 / 409**: shows `errors[]` array items or `message` from `ApiResponse`
   - **500**: generic toast

### Auth

`AuthService` (`_services/auth.service.ts`):
- `currentUser` is an Angular **signal** — read it with `this.auth.currentUser()`
- JWT and serialised `User` are persisted in `localStorage` under keys `token` / `currentUser`
- Both `login()` and `register()` store the returned `AuthResponse` and update the signal

### Guards

| Guard | File | Behaviour |
|---|---|---|
| `authGuard` | `_guards/auth.guard.ts` | Blocks unauthenticated users → `/login` |
| `guestGuard` | `_guards/guest.guard.ts` | Blocks already-logged-in users → their role's dashboard |
| `roleGuard` | `_guards/role.guard.ts` | Reads `route.data['roles']`; wrong role → user's own dashboard (silent redirect, no error page) |

Role routes always use both `authGuard` and `roleGuard`. `authGuard` short-circuits first so `roleGuard` only runs for authenticated users.

### Routing Structure

```
/login           → LoginComponent        [guestGuard]          (no layout)
/register        → RegisterComponent     [guestGuard]          (no layout)
/patient/**      → MainLayout            [authGuard, roleGuard: Patient]
/doctor/**       → MainLayout            [authGuard, roleGuard: Doctor]
/receptionist/** → MainLayout            [authGuard, roleGuard: Receptionist]
/admin/**        → MainLayout            [authGuard, roleGuard: Admin]
```

All role routes are lazy-loaded (`component + loadChildren`). Feature route files live at `features/<role>/<role>.routes.ts`.

### State & Patterns

- **Signals** for all component and service state (no NgRx, no BehaviorSubject for local state)
- **Reactive forms only** — never template-driven
- **`inject()`** for all DI in components and services — no constructor parameter injection
- Standalone components throughout; no NgModules

### Styling

- Angular Material 21 for all UI components
- Inter font (Google Fonts), Material Icons
- Design tokens (SCSS variables) defined per-component; see `login.component.scss` for the palette
- `ngx-toastr` (bottom-right, 3 s, no duplicates) is the notification standard — triggered by the interceptor, not by feature components

## Coding Rules

1. **Never use `HttpClient` directly in components or feature services** — always go through `ApiService`
2. **All forms must be reactive** (`FormBuilder` + `ReactiveFormsModule`) — no `ngModel`
3. **All routes must be lazy-loaded** and protected by appropriate guards
4. **Use Angular signals** (`signal()`, `computed()`) for component-level state
5. **Use Angular Material** components — do not introduce a second UI library
6. **Match the dating app's structure and naming** — `inject()`, signals, standalone, functional guards
7. **API paths passed to `ApiService` must not start with `/`**

## Module Status

| Area | Status |
|---|---|
| Auth (Login, Register) | ✅ |
| App shell (MainLayout, routing, guards, interceptors) | ✅ |
| Patient — Dashboard | ✅ |
| Patient — Book Appointment | ✅ |
| Patient — My Appointments | ✅ |
| Patient — Medical Records | ✅ |
| Patient — Nearby Clinics | ✅ |
| Patient — Emergency SOS | ✅ |
| Doctor — Dashboard | ✅ |
| Doctor — Today's Schedule | ✅ |
| Doctor — Appointment Detail | ✅ |
| Doctor — Patient Records | ✅ |
| Receptionist — Dashboard | ✅ |
| Receptionist — Appointments | ✅ |
| Receptionist — Book for Patient | ✅ |
| Admin — Dashboard | ✅ |
| Admin — Users | ✅ |
| Admin — Reports | ✅ |
| Admin — Settings | ✅ |
| Shared — Active Emergencies (Doctor / Receptionist / Admin) | ✅ |
