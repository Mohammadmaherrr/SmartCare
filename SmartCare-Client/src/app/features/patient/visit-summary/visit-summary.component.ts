import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { animate, style, transition, trigger } from '@angular/animations';
import { ToastrService } from 'ngx-toastr';
import { VisitSummaryService } from '../../../_services/visit-summary.service';
import { AppointmentService } from '../../../_services/appointment.service';
import { Appointment, VisitType } from '../../../_models/appointment.model';

const VISIT_TYPE_LABEL: Record<VisitType, string> = {
  GeneralConsultation: 'General Consultation',
  FollowUp: 'Follow-up',
  AnnualCheckup: 'Annual Checkup',
};

@Component({
  selector: 'app-visit-summary',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSliderModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './visit-summary.component.html',
  styleUrl: './visit-summary.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class VisitSummaryComponent {
  private fb = inject(FormBuilder);
  private summaries = inject(VisitSummaryService);
  private appointments = inject(AppointmentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  protected readonly appointmentId = this.route.snapshot.paramMap.get('appointmentId') ?? '';

  protected submitting = signal(false);
  protected loadingAppointment = signal(true);
  protected appointment = signal<Appointment | null>(null);

  protected form = this.fb.group({
    symptoms: ['', [Validators.required, Validators.maxLength(1000)]],
    description: ['', [Validators.maxLength(2000)]],
    painLevel: [5, [Validators.required, Validators.min(1), Validators.max(10)]],
    symptomDuration: ['', [Validators.maxLength(200)]],
  });

  protected painLevel = computed(() => this.form.controls.painLevel.value ?? 5);

  protected painSeverity = computed<'mild' | 'moderate' | 'severe'>(() => {
    const level = this.painLevel();
    if (level <= 3) return 'mild';
    if (level <= 6) return 'moderate';
    return 'severe';
  });

  constructor() {
    if (!this.appointmentId) {
      this.toastr.error('Missing appointment reference');
      this.router.navigateByUrl('/patient/appointments');
      return;
    }

    this.appointments.getById(this.appointmentId).subscribe({
      next: (a) => {
        this.appointment.set(a);
        this.loadingAppointment.set(false);
      },
      error: () => {
        this.loadingAppointment.set(false);
        this.router.navigateByUrl('/patient/appointments');
      },
    });
  }

  protected visitTypeLabel(type: VisitType): string {
    return VISIT_TYPE_LABEL[type];
  }

  protected formatDate(value: string): string {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  protected formatTime(timeSlot: string): string {
    const [h, m] = timeSlot.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  }

  protected cancel(): void {
    this.router.navigateByUrl('/patient/appointments');
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      symptoms: raw.symptoms!.trim(),
      description: raw.description?.trim() ? raw.description.trim() : null,
      painLevel: raw.painLevel!,
      symptomDuration: raw.symptomDuration?.trim() ? raw.symptomDuration.trim() : null,
    };

    this.submitting.set(true);
    this.summaries.submit(this.appointmentId, payload).subscribe({
      next: () => {
        this.toastr.success('Visit summary submitted');
        this.router.navigateByUrl('/patient/appointments');
      },
      error: () => this.submitting.set(false),
    });
  }
}
