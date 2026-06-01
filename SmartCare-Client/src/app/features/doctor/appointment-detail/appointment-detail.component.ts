import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { animate, style, transition, trigger } from '@angular/animations';
import { catchError, forkJoin, of } from 'rxjs';
import { AppointmentService } from '../../../_services/appointment.service';
import {
  Appointment,
  AppointmentStatus,
  PatientProfile,
  PaymentStatus,
  VisitType,
} from '../../../_models/appointment.model';
import { VisitSummary } from '../../../_models/visit-summary.model';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/confirm-dialog/confirm-dialog.component';

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

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  OnHold: 'On Hold',
  Refunded: 'Refunded',
  Charged: 'Charged',
};

@Component({
  selector: 'app-appointment-detail',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './appointment-detail.component.html',
  styleUrl: './appointment-detail.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('260ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class AppointmentDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private appointments = inject(AppointmentService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);

  protected loading = signal(true);
  protected acting = signal<AppointmentStatus | null>(null);
  protected appointment = signal<Appointment | null>(null);
  protected patient = signal<PatientProfile | null>(null);
  protected summary = signal<VisitSummary | null>(null);
  protected summaryLoaded = signal(false);

  protected patientAge = computed(() => {
    const dob = this.patient()?.dateOfBirth;
    if (!dob) return null;
    const [y, m, d] = dob.split('-').map(Number);
    const birth = new Date(y, m - 1, d);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  });

  protected appointmentDateLabel = computed(() => {
    const a = this.appointment();
    if (!a) return '';
    const [y, m, d] = a.appointmentDate.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  });

  protected timeRangeLabel = computed(() => {
    const a = this.appointment();
    if (!a) return '';
    return `${this.formatTime(a.timeSlot)} – ${this.formatTime(a.endTime)}`;
  });

  protected canMarkCompleted = computed(() => {
    const s = this.appointment()?.status;
    return s === 'Confirmed' || s === 'Pending';
  });

  protected canMarkNoShow = computed(() => {
    const s = this.appointment()?.status;
    return s === 'Confirmed' || s === 'Pending';
  });

  protected initials = computed(() => {
    const name = this.appointment()?.patientName ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
    else this.loading.set(false);
  }

  protected back(): void {
    this.router.navigate(['/doctor/schedule']);
  }

  protected viewPatientRecords(): void {
    const a = this.appointment();
    if (!a) return;
    this.router.navigate(['/doctor/patient-records', a.patientId]);
  }

  protected markCompleted(): void {
    const a = this.appointment();
    if (!a || this.acting()) return;
    this.confirm({
      title: 'Mark as completed?',
      message: `Confirm that the ${this.visitTypeLabel(a.visitType)} with ${a.patientName} on ${this.appointmentDateLabel()} at ${this.formatTime(a.timeSlot)} has been completed. This will finalize the appointment.`,
      confirmLabel: 'Mark Completed',
      cancelLabel: 'Cancel',
      tone: 'default',
    }, () => this.updateStatus('Completed', 'Appointment marked as completed'));
  }

  protected markNoShow(): void {
    const a = this.appointment();
    if (!a || this.acting()) return;
    this.confirm({
      title: 'Mark as no-show?',
      message: `Are you sure you want to mark ${a.patientName} as a no-show for ${this.appointmentDateLabel()} at ${this.formatTime(a.timeSlot)}? This cannot be undone.`,
      confirmLabel: 'Mark No-show',
      cancelLabel: 'Cancel',
      tone: 'danger',
    }, () => this.updateStatus('NoShow', 'Appointment marked as no-show'));
  }

  protected visitTypeLabel(type: VisitType): string {
    return VISIT_TYPE_LABEL[type];
  }

  protected statusLabel(status: AppointmentStatus): string {
    return STATUS_LABEL[status];
  }

  protected paymentLabel(status: PaymentStatus): string {
    return PAYMENT_LABEL[status];
  }

  protected statusClass(status: AppointmentStatus): string {
    return `chip chip--${status.toLowerCase()}`;
  }

  protected paymentClass(status: PaymentStatus): string {
    return `chip chip--payment-${status.toLowerCase()}`;
  }

  protected formatTime(timeSlot: string): string {
    const [h, m] = timeSlot.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  }

  protected painColor(level: number): string {
    if (level <= 3) return '#00897B';
    if (level <= 6) return '#F57C00';
    return '#C62828';
  }

  private confirm(data: ConfirmDialogData, onConfirm: () => void): void {
    this.dialog
      .open(ConfirmDialogComponent, { data, width: '440px', autoFocus: false })
      .afterClosed()
      .subscribe(ok => { if (ok) onConfirm(); });
  }

  private updateStatus(newStatus: AppointmentStatus, successMsg: string): void {
    const a = this.appointment();
    if (!a) return;
    this.acting.set(newStatus);
    this.appointments.updateStatus(a.id, { newStatus }).subscribe({
      next: updated => {
        this.appointment.set(updated);
        this.acting.set(null);
        this.toastr.success(successMsg);
      },
      error: () => this.acting.set(null),
    });
  }

  private load(id: string): void {
    this.loading.set(true);
    forkJoin({
      appointment: this.appointments.getById(id),
      patient: this.appointments.getPatientForAppointment(id).pipe(catchError(() => of(null))),
      summary: this.appointments.getVisitSummary(id).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ appointment, patient, summary }) => {
        this.appointment.set(appointment);
        this.patient.set(patient);
        this.summary.set(summary);
        this.summaryLoaded.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.appointment.set(null);
        this.loading.set(false);
      },
    });
  }
}
