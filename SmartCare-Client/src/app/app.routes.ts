import { Routes } from '@angular/router';
import { authGuard } from './_guards/auth.guard';
import { guestGuard } from './_guards/guest.guard';
import { roleGuard } from './_guards/role.guard';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';

export const routes: Routes = [
  // ── Auth (no layout) ────────────────────────────────────────────────
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },

  // ── Patient ─────────────────────────────────────────────────────────
  {
    path: 'patient',
    component: MainLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Patient'] },
    loadChildren: () =>
      import('./features/patient/patient.routes').then(m => m.PATIENT_ROUTES),
  },

  // ── Doctor ──────────────────────────────────────────────────────────
  {
    path: 'doctor',
    component: MainLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Doctor'] },
    loadChildren: () =>
      import('./features/doctor/doctor.routes').then(m => m.DOCTOR_ROUTES),
  },

  // ── Receptionist ─────────────────────────────────────────────────────
  {
    path: 'receptionist',
    component: MainLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Receptionist'] },
    loadChildren: () =>
      import('./features/receptionist/receptionist.routes').then(m => m.RECEPTIONIST_ROUTES),
  },

  // ── Admin ────────────────────────────────────────────────────────────
  {
    path: 'admin',
    component: MainLayoutComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Admin'] },
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },

  // ── Fallback ─────────────────────────────────────────────────────────
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
