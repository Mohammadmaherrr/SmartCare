import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { animate, style, transition, trigger } from '@angular/animations';
import { ToastrService } from 'ngx-toastr';
import { AppointmentService, VISIT_TYPE_DURATIONS } from '../../../_services/appointment.service';
import { DoctorService } from '../../../_services/doctor.service';
import { PatientLookupResult, ReceptionistService } from '../../../_services/receptionist.service';
import { Appointment, VisitType } from '../../../_models/appointment.model';

interface DoctorOption {
  id: string;
  name: string;
  specialization: string;
}

interface VisitOption {
  type: VisitType;
  title: string;
  description: string;
  icon: string;
  duration: number;
}

const VISIT_OPTIONS: VisitOption[] = [
  {
    type: 'GeneralConsultation',
    title: 'General Consultation',
    description: 'Standard visit for new or unrelated concerns.',
    icon: 'stethoscope',
    duration: VISIT_TYPE_DURATIONS.GeneralConsultation,
  },
  {
    type: 'FollowUp',
    title: 'Follow-up',
    description: 'Quick check-in after a previous visit.',
    icon: 'event_repeat',
    duration: VISIT_TYPE_DURATIONS.FollowUp,
  },
  {
    type: 'AnnualCheckup',
    title: 'Annual Checkup',
    description: 'Comprehensive yearly health assessment.',
    icon: 'health_and_safety',
    duration: VISIT_TYPE_DURATIONS.AnnualCheckup,
  },
];

const WORKING_START = 9 * 60;
const WORKING_END = 17 * 60;
const SLOT_MINUTES = 20;

interface TimeSlot {
  time: string;
  label: string;
  available: boolean;
}

@Component({
  selector: 'app-book-for-patient',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './book-for-patient.component.html',
  styleUrl: './book-for-patient.component.scss',
  animations: [
    trigger('slideStep', [
      transition(':increment', [
        style({ opacity: 0, transform: 'translateX(40px)' }),
        animate(
          '320ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateX(0)' }),
        ),
      ]),
      transition(':decrement', [
        style({ opacity: 0, transform: 'translateX(-40px)' }),
        animate(
          '320ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateX(0)' }),
        ),
      ]),
    ]),
  ],
})
export class BookForPatientComponent implements OnInit {
  private fb = inject(FormBuilder);
  private appointments = inject(AppointmentService);
  private doctorService = inject(DoctorService);
  private receptionist = inject(ReceptionistService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  protected readonly visitOptions = VISIT_OPTIONS;
  protected readonly totalSteps = 6;

  protected doctors = signal<DoctorOption[]>([]);
  protected loadingDoctors = signal(false);
  protected patients = signal<PatientLookupResult[]>([]);
  protected loadingPatients = signal(false);
  protected step = signal(1);
  protected submitting = signal(false);
  protected loadingSlots = signal(false);
  protected schedule = signal<Appointment[]>([]);

  protected form = this.fb.group({
    patientId: this.fb.control<string | null>(null, Validators.required),
    visitType: this.fb.control<VisitType | null>(null, Validators.required),
    doctorId: this.fb.control<string | null>(null, Validators.required),
    date: this.fb.control<Date | null>(null, Validators.required),
    timeSlot: this.fb.control<string | null>(null, Validators.required),
  });

  protected searchControl = this.fb.control<string>('');

  protected minDate = new Date();
  protected maxDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d;
  })();

  protected selectedPatient = computed<PatientLookupResult | null>(() => {
    const id = this.form.controls.patientId.value;
    if (!id) return null;
    return this.patients().find((p) => p.id === id) ?? null;
  });

  protected selectedVisit = computed<VisitOption | null>(() => {
    const type = this.form.controls.visitType.value;
    return type ? (VISIT_OPTIONS.find((v) => v.type === type) ?? null) : null;
  });

  protected selectedDoctor = computed(() => {
    const id = this.form.controls.doctorId.value;
    return id ? (this.doctors().find((d) => d.id === id) ?? null) : null;
  });

  protected timeSlots = computed<TimeSlot[]>(() => {
    const visit = this.selectedVisit();
    if (!visit) return [];

    const date = this.form.controls.date.value;
    const isToday = date ? this.isSameDay(date, new Date()) : false;
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    const booked = this.schedule().map((a) => ({
      start: this.toMinutes(a.timeSlot),
      end: this.toMinutes(a.endTime),
    }));

    const slots: TimeSlot[] = [];
    for (let m = WORKING_START; m < WORKING_END; m += SLOT_MINUTES) {
      const slotEnd = m + visit.duration;
      const fitsInDay = slotEnd <= WORKING_END;
      const inPast = isToday && m <= nowMinutes;
      const overlaps = booked.some((b) => b.start < slotEnd && b.end > m);
      slots.push({
        time: this.minutesToTime(m),
        label: this.formatLabel(m),
        available: fitsInDay && !inPast && !overlaps,
      });
    }
    return slots;
  });

  protected progressPercent = computed(() => ((this.step() - 1) / (this.totalSteps - 1)) * 100);

  ngOnInit(): void {
    this.loadDoctors();
    this.loadPatients('');
    this.searchControl.valueChanges.subscribe((value) => {
      this.loadPatients(value ?? '');
    });
  }

  protected selectPatient(p: PatientLookupResult): void {
    this.form.controls.patientId.setValue(p.id);
  }

  protected selectVisitType(type: VisitType): void {
    this.form.controls.visitType.setValue(type);
    this.form.controls.timeSlot.setValue(null);
  }

  protected selectDoctor(id: string): void {
    this.form.controls.doctorId.setValue(id);
    this.form.controls.timeSlot.setValue(null);
    this.refreshSchedule();
  }

  protected onDateChange(date: Date | null): void {
    this.form.controls.date.setValue(date);
    this.form.controls.timeSlot.setValue(null);
    this.refreshSchedule();
  }

  protected selectSlot(slot: TimeSlot): void {
    if (!slot.available) return;
    this.form.controls.timeSlot.setValue(slot.time);
  }

  protected canAdvance(): boolean {
    switch (this.step()) {
      case 1:
        return !!this.form.controls.patientId.value;
      case 2:
        return !!this.form.controls.visitType.value;
      case 3:
        return !!this.form.controls.doctorId.value;
      case 4:
        return !!this.form.controls.date.value;
      case 5:
        return !!this.form.controls.timeSlot.value;
      default:
        return false;
    }
  }

  protected next(): void {
    if (!this.canAdvance()) return;
    this.step.set(Math.min(this.step() + 1, this.totalSteps));
  }

  protected back(): void {
    this.step.set(Math.max(this.step() - 1, 1));
  }

  protected confirm(): void {
    if (this.form.invalid || this.submitting()) return;
    const patientId = this.form.controls.patientId.value!;
    const doctorId = this.form.controls.doctorId.value!;
    const date = this.form.controls.date.value!;
    const timeSlot = this.form.controls.timeSlot.value!;
    const visitType = this.form.controls.visitType.value!;

    this.submitting.set(true);
    this.appointments
      .book({
        patientId,
        doctorId,
        appointmentDate: this.toDateString(date),
        timeSlot,
        visitType,
      })
      .subscribe({
        next: () => {
          const patient = this.selectedPatient();
          this.toastr.success(
            patient ? `Appointment booked for ${patient.fullName}` : 'Appointment booked',
          );
          this.router.navigateByUrl('/receptionist/appointments');
        },
        error: () => this.submitting.set(false),
      });
  }

  protected formatVisitDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  protected formatSlotLabel(time: string): string {
    const [h, m] = time.split(':').map(Number);
    return this.formatLabel(h * 60 + m);
  }

  protected initial(name: string): string {
    const trimmed = (name ?? '').trim();
    return trimmed ? trimmed[0].toUpperCase() : '?';
  }

  private loadDoctors(): void {
    this.loadingDoctors.set(true);
    this.doctorService.getAll().subscribe({
      next: (list) => {
        this.doctors.set(
          list.map((d) => ({
            id: d.id,
            name: d.fullName,
            specialization: d.specialization,
          })),
        );
        this.loadingDoctors.set(false);
      },
      error: () => this.loadingDoctors.set(false),
    });
  }

  private loadPatients(query: string): void {
    this.loadingPatients.set(true);
    this.receptionist.searchPatients(query).subscribe({
      next: (list) => {
        this.patients.set(list);
        this.loadingPatients.set(false);
      },
      error: () => {
        this.patients.set([]);
        this.loadingPatients.set(false);
      },
    });
  }

  private refreshSchedule(): void {
    const doctorId = this.form.controls.doctorId.value;
    const date = this.form.controls.date.value;
    if (!doctorId || !date) {
      this.schedule.set([]);
      return;
    }
    const iso = this.toDateString(date);
    this.loadingSlots.set(true);
    this.doctorService.getSchedule(doctorId, iso, iso).subscribe({
      next: (list) => {
        this.schedule.set(list.filter((a) => a.status !== 'Cancelled'));
        this.loadingSlots.set(false);
      },
      error: () => {
        this.schedule.set([]);
        this.loadingSlots.set(false);
      },
    });
  }

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(m: number): string {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:00`;
  }

  private formatLabel(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  }

  private toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
}
