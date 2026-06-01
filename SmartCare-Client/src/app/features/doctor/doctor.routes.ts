import { Routes } from '@angular/router';

export const DOCTOR_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'schedule',
    loadComponent: () =>
      import('./schedule/schedule.component').then(m => m.ScheduleComponent),
  },
  {
    path: 'appointments/:id',
    loadComponent: () =>
      import('./appointment-detail/appointment-detail.component').then(m => m.AppointmentDetailComponent),
  },
  {
    path: 'patient-records',
    loadComponent: () =>
      import('./patient-list/patient-list.component').then(m => m.PatientListComponent),
  },
  {
    path: 'patient-records/:id',
    loadComponent: () =>
      import('./patient-records/patient-records.component').then(m => m.PatientRecordsComponent),
  },
  {
    path: 'emergencies',
    loadComponent: () =>
      import('../shared/active-emergencies/active-emergencies.component')
        .then(m => m.ActiveEmergenciesComponent),
  },
];
