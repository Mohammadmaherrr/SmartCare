import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';

export const PATIENT_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  {
    path: 'book-appointment',
    loadComponent: () =>
      import('./book-appointment/book-appointment.component').then(
        (m) => m.BookAppointmentComponent,
      ),
  },
  {
    path: 'appointments',
    loadComponent: () =>
      import('./my-appointments/my-appointments.component').then((m) => m.MyAppointmentsComponent),
  },
  {
    path: 'visit-summary/:appointmentId',
    loadComponent: () =>
      import('./visit-summary/visit-summary.component').then((m) => m.VisitSummaryComponent),
  },
  {
    path: 'records',
    loadComponent: () =>
      import('./medical-records/medical-records.component').then((m) => m.MedicalRecordsComponent),
  },
  {
    path: 'nearby-clinics',
    loadComponent: () =>
      import('./nearby-clinics/nearby-clinics.component').then((m) => m.NearbyClinicsComponent),
  },
  {
    path: 'emergency',
    loadComponent: () =>
      import('./emergency/emergency.component').then((m) => m.EmergencyComponent),
  },
];
