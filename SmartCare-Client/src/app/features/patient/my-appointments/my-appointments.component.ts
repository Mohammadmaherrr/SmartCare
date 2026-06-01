import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';
import { animate, style, transition, trigger } from '@angular/animations';
import { AppointmentService } from '../../../_services/appointment.service';
import { Appointment, AppointmentStatus, VisitType } from '../../../_models/appointment.model';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { VisitSummaryDialogComponent } from './visit-summary-dialog.component';

type Filter = 'upcoming' | 'past' | 'cancelled';

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
  selector: 'app-my-appointments',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  templateUrl: './my-appointments.component.html',
  styleUrl: './my-appointments.component.scss',
  animations: [
    trigger('fadeRow', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(6px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class MyAppointmentsComponent {
  private appointments = inject(AppointmentService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private dialog = inject(MatDialog);

  protected readonly displayedColumns = ['date', 'time', 'doctor', 'visitType', 'status', 'actions'];

  protected loading = signal(true);
  protected cancelling = signal<string | null>(null);
  protected items = signal<Appointment[]>([]);
  protected filter = signal<Filter>('upcoming');

  protected todayStr = new Date().toISOString().slice(0, 10);

  protected upcoming = computed(() => this.sort(this.items().filter(a => this.isUpcoming(a))));
  protected past     = computed(() => this.sort(this.items().filter(a => this.isPast(a)), true));
  protected cancelled = computed(() => this.sort(this.items().filter(a => a.status === 'Cancelled'), true));

  protected counts = computed(() => ({
    upcoming: this.upcoming().length,
    past: this.past().length,
    cancelled: this.cancelled().length,
  }));

  protected visible = computed<Appointment[]>(() => {
    switch (this.filter()) {
      case 'upcoming':  return this.upcoming();
      case 'past':      return this.past();
      case 'cancelled': return this.cancelled();
    }
  });

  constructor() {
    this.load();
  }

  protected onTabChange(index: number): void {
    this.filter.set((['upcoming', 'past', 'cancelled'] as const)[index]);
  }

  protected statusClass(status: AppointmentStatus): string {
    return `chip chip--${status.toLowerCase()}`;
  }

  protected statusLabel(status: AppointmentStatus): string {
    return STATUS_LABEL[status];
  }

  protected visitTypeLabel(type: VisitType): string {
    return VISIT_TYPE_LABEL[type];
  }

  protected formatDate(value: string): string {
    const [y, m, d] = value.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  protected formatTime(timeSlot: string): string {
    const [h, m] = timeSlot.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  }

  protected canSubmitSummary(a: Appointment): boolean {
    return a.status === 'Pending' || a.status === 'Confirmed';
  }

  protected canViewSummary(a: Appointment): boolean {
    return a.status === 'Completed';
  }

  protected canCancel(a: Appointment): boolean {
    if (a.status !== 'Pending' && a.status !== 'Confirmed') return false;
    return a.appointmentDate >= this.todayStr;
  }

  protected submitSummary(a: Appointment): void {
    this.router.navigate(['/patient/visit-summary', a.id]);
  }

  protected viewSummary(a: Appointment): void {
    this.appointments.getVisitSummary(a.id).subscribe({
      next: summary => {
        this.dialog.open(VisitSummaryDialogComponent, {
          data: { summary, appointment: a },
          width: '480px',
          autoFocus: false,
        });
      },
      error: () => {},
    });
  }

  protected confirmCancel(a: Appointment): void {
    const data: ConfirmDialogData = {
      title: 'Cancel appointment?',
      message: `Are you sure you want to cancel your ${this.visitTypeLabel(a.visitType)} with ${a.doctorName} on ${this.formatDate(a.appointmentDate)} at ${this.formatTime(a.timeSlot)}? This cannot be undone.`,
      confirmLabel: 'Yes, cancel',
      cancelLabel: 'Keep appointment',
      tone: 'danger',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data, width: '420px', autoFocus: false })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed) this.doCancel(a);
      });
  }

  private doCancel(a: Appointment): void {
    this.cancelling.set(a.id);
    this.appointments.cancel(a.id).subscribe({
      next: updated => {
        this.items.update(list => list.map(x => (x.id === updated.id ? updated : x)));
        this.cancelling.set(null);
        this.toastr.success('Appointment cancelled');
      },
      error: () => this.cancelling.set(null),
    });
  }

  protected book(): void {
    this.router.navigateByUrl('/patient/book-appointment');
  }

  private load(): void {
    this.loading.set(true);
    this.appointments.getMyAppointments().subscribe({
      next: list => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private isUpcoming(a: Appointment): boolean {
    if (a.status === 'Cancelled') return false;
    if (a.status === 'Completed' || a.status === 'NoShow') return false;
    return a.appointmentDate >= this.todayStr;
  }

  private isPast(a: Appointment): boolean {
    if (a.status === 'Cancelled') return false;
    if (a.status === 'Completed' || a.status === 'NoShow') return true;
    return a.appointmentDate < this.todayStr;
  }

  private sort(list: Appointment[], descending = false): Appointment[] {
    return [...list].sort((a, b) => {
      const dateCmp = a.appointmentDate.localeCompare(b.appointmentDate);
      const cmp = dateCmp !== 0 ? dateCmp : a.timeSlot.localeCompare(b.timeSlot);
      return descending ? -cmp : cmp;
    });
  }
}
