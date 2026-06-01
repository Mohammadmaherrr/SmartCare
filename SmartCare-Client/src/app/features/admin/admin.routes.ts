import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'users',
    loadComponent: () =>
      import('./users/users.component').then(m => m.UsersComponent),
  },
  {
    path: 'reports',
    loadComponent: () =>
      import('./reports/reports.component').then(m => m.ReportsComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./settings/settings.component').then(m => m.SettingsComponent),
  },
  {
    path: 'emergencies',
    loadComponent: () =>
      import('../shared/active-emergencies/active-emergencies.component')
        .then(m => m.ActiveEmergenciesComponent),
  },
];
