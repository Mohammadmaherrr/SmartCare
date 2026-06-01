import { Routes } from '@angular/router';

export const RECEPTIONIST_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'appointments',
    loadComponent: () =>
      import('./appointments/appointments.component').then(m => m.AppointmentsComponent),
  },
  {
    path: 'appointments/new',
    loadComponent: () =>
      import('./book-for-patient/book-for-patient.component').then(m => m.BookForPatientComponent),
  },
  {
    path: 'emergencies',
    loadComponent: () =>
      import('../shared/active-emergencies/active-emergencies.component')
        .then(m => m.ActiveEmergenciesComponent),
  },
];
