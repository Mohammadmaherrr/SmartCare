import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { AuthService } from '../../../_services/auth.service';
import { ReceptionistService } from '../../../_services/receptionist.service';
import { EmergencyService } from '../../../_services/emergency.service';
import { Appointment, AppointmentStatus } from '../../../_models/appointment.model';
import { ActiveEmergency } from '../../../_models/emergency.model';

interface StatusCard {
  status: AppointmentStatus;
  label: string;
  icon: string;
  tone: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'noshow';
}

const STATUS_CARDS: StatusCard[] = [
  { status: 'Pending', label: 'Pending', icon: 'pending_actions', tone: 'pending' },
  { status: 'Confirmed', label: 'Confirmed', icon: 'event_available', tone: 'confirmed' },
  { status: 'Completed', label: 'Completed', icon: 'check_circle', tone: 'completed' },
  { status: 'Cancelled', label: 'Cancelled', icon: 'cancel', tone: 'cancelled' },
  { status: 'NoShow', label: 'No-show', icon: 'person_off', tone: 'noshow' },
];

@Component({
  selector: 'app-receptionist-dashboard',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  animations: [
    trigger('stagger', [
      transition(':enter', [
        query(
          '.stagger-item',
          [
            style({ opacity: 0, transform: 'translateY(16px)' }),
            stagger(60, [
              animate(
                '320ms cubic-bezier(0.16, 1, 0.3, 1)',
                style({ opacity: 1, transform: 'translateY(0)' }),
              ),
            ]),
          ],
          { optional: true },
        ),
      ]),
    ]),
  ],
})
export class DashboardComponent {
  private auth = inject(AuthService);
  private receptionist = inject(ReceptionistService);
  private emergency = inject(EmergencyService);
  private router = inject(Router);

  protected readonly statusCards = STATUS_CARDS;

  protected user = this.auth.currentUser;

  protected loading = signal(true);
  protected emergencyLoading = signal(true);
  protected todayAppointments = signal<Appointment[]>([]);
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

  protected totalToday = computed(() => this.todayAppointments().length);

  protected statusCounts = computed<Record<AppointmentStatus, number>>(() => {
    const counts: Record<AppointmentStatus, number> = {
      Pending: 0,
      Confirmed: 0,
      Completed: 0,
      Cancelled: 0,
      NoShow: 0,
    };
    for (const a of this.todayAppointments()) counts[a.status]++;
    return counts;
  });

  protected activeEmergencyCount = computed(() => this.activeEmergencies().length);

  constructor() {
    this.loadToday();
    this.loadEmergencies();
  }

  protected bookForPatient(): void {
    this.router.navigateByUrl('/receptionist/appointments/new');
  }

  protected viewAllAppointments(): void {
    this.router.navigateByUrl('/receptionist/appointments');
  }

  private loadToday(): void {
    this.loading.set(true);
    this.receptionist.getAllAppointments(this.todayIso, this.todayIso).subscribe({
      next: (list) => {
        this.todayAppointments.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.todayAppointments.set([]);
        this.loading.set(false);
      },
    });
  }

  private loadEmergencies(): void {
    this.emergencyLoading.set(true);
    this.emergency.getActive().subscribe({
      next: (list) => {
        this.activeEmergencies.set(list);
        this.emergencyLoading.set(false);
      },
      error: () => {
        this.activeEmergencies.set([]);
        this.emergencyLoading.set(false);
      },
    });
  }

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
