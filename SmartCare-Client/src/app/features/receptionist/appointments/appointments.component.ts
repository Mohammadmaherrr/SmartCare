import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { ToastrService } from 'ngx-toastr';
import { ReceptionistService } from '../../../_services/receptionist.service';
import { AppointmentService } from '../../../_services/appointment.service';
import { DoctorService } from '../../../_services/doctor.service';
import {
  Appointment,
  AppointmentStatus,
  VisitType,
} from '../../../_models/appointment.model';
import { Doctor } from '../../../_models/doctor.model';
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

const STATUS_OPTIONS: AppointmentStatus[] = ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'NoShow'];

@Component({
  selector: 'app-receptionist-appointments',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.scss',
  animations: [
    trigger('fadeRow', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(6px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class AppointmentsComponent {
  private fb = inject(FormBuilder);
  private receptionist = inject(ReceptionistService);
  private appointments = inject(AppointmentService);
  private doctorService = inject(DoctorService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private dialog = inject(MatDialog);

  protected readonly displayedColumns = [
    'date', 'time', 'patient', 'doctor', 'visitType', 'status', 'actions',
  ];
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly nextStatusOptions: AppointmentStatus[] =
    ['Confirmed', 'Completed', 'NoShow'];

  protected loading = signal(true);
  protected acting = signal<string | null>(null);
  protected items = signal<Appointment[]>([]);
  protected doctors = signal<Doctor[]>([]);

  private startOfMonth = (() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  private endOfMonth = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 0);
    d.setHours(23, 59, 59, 999);
    return d;
  })();

  protected filters = this.fb.group({
    doctorId: this.fb.control<string | ''>(''),
    status: this.fb.control<AppointmentStatus | ''>(''),
    from: this.fb.control<Date | null>(this.startOfMonth),
    to: this.fb.control<Date | null>(this.endOfMonth),
  });

  protected filtered = computed<Appointment[]>(() => {
    const list = this.items();
    const { doctorId, status } = this.filters.value;

    return list
      .filter(a => !doctorId || a.doctorId === doctorId)
      .filter(a => !status || a.status === status)
      .sort((a, b) => {
        const dateCmp = b.appointmentDate.localeCompare(a.appointmentDate);
        return dateCmp !== 0 ? dateCmp : b.timeSlot.localeCompare(a.timeSlot);
      });
  });

  protected filtersDirty = computed(() => {
    const { doctorId, status, from, to } = this.filters.value;
    const fromOk = from && from.getTime() === this.startOfMonth.getTime();
    const toOk = to && to.getTime() === this.endOfMonth.getTime();
    return !!doctorId || !!status || !fromOk || !toOk;
  });

  constructor() {
    this.loadDoctors();
    this.load();
  }

  protected applyFilters(): void {
    this.load();
  }

  protected resetFilters(): void {
    this.filters.setValue({
      doctorId: '',
      status: '',
      from: this.startOfMonth,
      to: this.endOfMonth,
    });
    this.load();
  }

  protected bookForPatient(): void {
    this.router.navigateByUrl('/receptionist/appointments/new');
  }

  protected canCancel(a: Appointment): boolean {
    return a.status === 'Pending' || a.status === 'Confirmed';
  }

  protected canUpdateStatus(a: Appointment): boolean {
    return a.status !== 'Cancelled' && a.status !== 'Completed';
  }

  protected nextStatusesFor(a: Appointment): AppointmentStatus[] {
    return this.nextStatusOptions.filter(s => s !== a.status);
  }

  protected confirmCancel(a: Appointment): void {
    const data: ConfirmDialogData = {
      title: 'Cancel appointment?',
      message: `Cancel ${this.visitTypeLabel(a.visitType)} for ${a.patientName} with ${a.doctorName} on ${this.formatDate(a.appointmentDate)} at ${this.formatTime(a.timeSlot)}?`,
      confirmLabel: 'Yes, cancel',
      cancelLabel: 'Keep appointment',
      tone: 'danger',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data, width: '440px', autoFocus: false })
      .afterClosed()
      .subscribe(confirmed => { if (confirmed) this.doCancel(a); });
  }

  protected updateStatus(a: Appointment, newStatus: AppointmentStatus): void {
    if (this.acting()) return;
    this.acting.set(a.id);
    this.appointments.updateStatus(a.id, { newStatus }).subscribe({
      next: updated => {
        this.items.update(list => list.map(x => (x.id === updated.id ? updated : x)));
        this.acting.set(null);
        this.toastr.success(`Status updated to ${this.statusLabel(newStatus)}`);
      },
      error: () => this.acting.set(null),
    });
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

  protected initial(name: string): string {
    const trimmed = (name ?? '').trim();
    return trimmed ? trimmed[0].toUpperCase() : '?';
  }

  private doCancel(a: Appointment): void {
    if (this.acting()) return;
    this.acting.set(a.id);
    this.appointments.cancel(a.id, { reason: 'Cancelled by receptionist' }).subscribe({
      next: updated => {
        this.items.update(list => list.map(x => (x.id === updated.id ? updated : x)));
        this.acting.set(null);
        this.toastr.success('Appointment cancelled');
      },
      error: () => this.acting.set(null),
    });
  }

  private loadDoctors(): void {
    this.doctorService.getAll().subscribe({
      next: list => this.doctors.set(list),
      error: () => this.doctors.set([]),
    });
  }

  private load(): void {
    this.loading.set(true);
    const from = this.filters.controls.from.value;
    const to = this.filters.controls.to.value;
    const fromIso = from ? this.toIso(from) : undefined;
    const toIso = to ? this.toIso(to) : undefined;

    this.receptionist.getAllAppointments(fromIso, toIso).subscribe({
      next: list => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.loading.set(false);
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
