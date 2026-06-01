import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { AuthService } from '../../../_services/auth.service';
import { DoctorService } from '../../../_services/doctor.service';
import { AppointmentService } from '../../../_services/appointment.service';
import { Appointment, AppointmentStatus, VisitType } from '../../../_models/appointment.model';

interface DayChip {
  date: Date;
  isoDate: string;
  weekday: string;
  day: number;
  isToday: boolean;
}

const VISIT_TYPE_LABEL: Record<VisitType, string> = {
  GeneralConsultation: 'General Consultation',
  FollowUp: 'Follow-up',
  AnnualCheckup: 'Annual Checkup',
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  Pending: 'Pending',
  Confirmed: 'Confirmed',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
  NoShow: 'No-show',
};

@Component({
  selector: 'app-doctor-dashboard',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatTooltipModule, MatProgressSpinnerModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  animations: [
    trigger('stagger', [
      transition(':enter', [
        query(
          '.stagger-item',
          [
            style({ opacity: 0, transform: 'translateY(16px)' }),
            stagger(80, [
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
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate(
          '260ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ]),
      transition(':leave', [
        animate('160ms ease-in', style({ opacity: 0, transform: 'translateY(-4px)' })),
      ]),
    ]),
  ],
})
export class DashboardComponent {
  private auth = inject(AuthService);
  private doctorService = inject(DoctorService);
  private appointments = inject(AppointmentService);
  private toastr = inject(ToastrService);
  private router = inject(Router);

  protected user = this.auth.currentUser;

  protected loading = signal(true);
  protected items = signal<Appointment[]>([]);
  protected acting = signal<string | null>(null);
  protected selectedDate = signal<string>(this.todayIso());

  protected days: DayChip[] = this.buildDays();

  protected greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  });

  protected lastName = computed(() => {
    const full = this.user()?.fullName ?? '';
    const trimmed = full.replace(/^Dr\.?\s+/i, '').trim();
    const parts = trimmed.split(/\s+/);
    return parts.length ? parts[parts.length - 1] : '';
  });

  protected pending = computed(() =>
    this.items()
      .filter((a) => a.status === 'Pending')
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)),
  );

  protected timeline = computed(() =>
    this.items()
      .filter((a) => a.status === 'Confirmed' || a.status === 'Completed')
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot)),
  );

  protected todayLabel = computed(() => {
    const [y, m, d] = this.selectedDate().split('-').map(Number);
    return new Date(y, m - 1, d);
  });

  constructor() {
    this.load();
  }

  protected selectDay(day: DayChip): void {
    if (this.selectedDate() === day.isoDate) return;
    this.selectedDate.set(day.isoDate);
    this.load();
  }

  protected accept(a: Appointment): void {
    if (this.acting()) return;
    this.acting.set(a.id);
    this.appointments.updateStatus(a.id, { newStatus: 'Confirmed' }).subscribe({
      next: (updated) => {
        this.items.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
        this.acting.set(null);
        this.toastr.success(`Appointment with ${a.patientName} confirmed`);
      },
      error: () => this.acting.set(null),
    });
  }

  protected reject(a: Appointment): void {
    if (this.acting()) return;
    this.acting.set(a.id);
    this.appointments.cancel(a.id, { reason: 'Rejected by doctor' }).subscribe({
      next: (updated) => {
        this.items.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
        this.acting.set(null);
        this.toastr.success(`Appointment with ${a.patientName} rejected`);
      },
      error: () => this.acting.set(null),
    });
  }

  protected viewDetails(a: Appointment): void {
    this.router.navigate(['/doctor/appointments', a.id]);
  }

  protected visitTypeLabel(type: VisitType): string {
    return VISIT_TYPE_LABEL[type];
  }

  protected statusLabel(status: AppointmentStatus): string {
    return STATUS_LABEL[status];
  }

  protected formatTime(timeSlot: string): string {
    const [h, m] = timeSlot.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  }

  protected initial(name: string): string {
    const trimmed = (name ?? '').trim();
    return trimmed ? trimmed[0].toUpperCase() : '?';
  }

  protected avatarTone(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
    return Math.abs(hash) % 5;
  }

  private load(): void {
    const id = this.user()?.id;
    if (!id) return;
    this.loading.set(true);
    const date = this.selectedDate();
    this.doctorService.getSchedule(id, date, date).subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.loading.set(false);
      },
    });
  }

  private buildDays(): DayChip[] {
    const todayIso = this.todayIso();
    const start = new Date();
    const out: DayChip[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = this.toIso(d);
      out.push({
        date: d,
        isoDate: iso,
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
        day: d.getDate(),
        isToday: iso === todayIso,
      });
    }
    return out;
  }

  private todayIso(): string {
    return this.toIso(new Date());
  }

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
