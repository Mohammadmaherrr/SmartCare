import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { AuthService } from '../../../_services/auth.service';
import { AdminService } from '../../../_services/admin.service';
import { ReceptionistService } from '../../../_services/receptionist.service';
import { EmergencyService } from '../../../_services/emergency.service';
import { Appointment } from '../../../_models/appointment.model';
import { UserSummary } from '../../../_models/admin.model';
import { ActiveEmergency } from '../../../_models/emergency.model';

interface StatCard {
  key: 'todayAppointments' | 'activeDoctors' | 'pendingEmergencies' | 'totalPatients';
  label: string;
  icon: string;
  tone: 'primary' | 'accent' | 'danger' | 'amber';
}

interface QuickAction {
  label: string;
  icon: string;
  route: string;
  description: string;
}

const STAT_CARDS: StatCard[] = [
  { key: 'todayAppointments',  label: "Today's Appointments", icon: 'event',         tone: 'primary' },
  { key: 'activeDoctors',      label: 'Active Doctors',       icon: 'medical_services', tone: 'accent' },
  { key: 'pendingEmergencies', label: 'Pending Emergencies',  icon: 'sos',           tone: 'danger' },
  { key: 'totalPatients',      label: 'Total Patients',       icon: 'group',         tone: 'amber' },
];

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Appointments', icon: 'calendar_month',  route: '/receptionist/appointments', description: 'View all clinic bookings' },
  { label: 'Doctors',      icon: 'medical_services', route: '/admin/users',              description: 'Manage doctor accounts' },
  { label: 'Patients',     icon: 'group',            route: '/admin/users',              description: 'Manage patient accounts' },
  { label: 'Reports',      icon: 'bar_chart',        route: '/admin/reports',            description: 'View clinic metrics' },
];

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  animations: [
    trigger('stagger', [
      transition(':enter', [
        query('.stagger-item', [
          style({ opacity: 0, transform: 'translateY(16px)' }),
          stagger(60, [
            animate('320ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
  ],
})
export class DashboardComponent {
  private auth = inject(AuthService);
  private admin = inject(AdminService);
  private receptionist = inject(ReceptionistService);
  private emergency = inject(EmergencyService);
  private router = inject(Router);

  protected readonly statCards = STAT_CARDS;
  protected readonly quickActions = QUICK_ACTIONS;

  protected user = this.auth.currentUser;

  protected loading = signal(true);
  protected todayAppointments = signal<Appointment[]>([]);
  protected doctors = signal<UserSummary[]>([]);
  protected patients = signal<UserSummary[]>([]);
  protected activeEmergencies = signal<ActiveEmergency[]>([]);

  protected today = new Date();
  protected todayIso = this.toIso(this.today);

  protected greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  });

  protected firstName = computed(() => {
    const full = this.user()?.fullName ?? '';
    const parts = full.trim().split(/\s+/);
    return parts.length ? parts[0] : '';
  });

  protected stats = computed<Record<StatCard['key'], number>>(() => ({
    todayAppointments: this.todayAppointments().length,
    activeDoctors: this.doctors().filter(d => d.accountStatus === 'Active').length,
    pendingEmergencies: this.activeEmergencies().filter(e => e.status === 'Pending').length,
    totalPatients: this.patients().length,
  }));

  constructor() {
    this.load();
  }

  protected go(route: string): void {
    this.router.navigateByUrl(route);
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      doctors: this.admin.getUsers('Doctor'),
      patients: this.admin.getUsers('Patient'),
      emergencies: this.emergency.getActive(),
      today: this.receptionist.getAllAppointments(this.todayIso, this.todayIso),
    }).subscribe({
      next: ({ doctors, patients, emergencies, today }) => {
        this.doctors.set(doctors);
        this.patients.set(patients);
        this.activeEmergencies.set(emergencies);
        this.todayAppointments.set(today);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
