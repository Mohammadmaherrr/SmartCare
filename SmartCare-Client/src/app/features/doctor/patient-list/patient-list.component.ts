import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { startWith } from 'rxjs';
import { AuthService } from '../../../_services/auth.service';
import { DoctorService } from '../../../_services/doctor.service';
import { Appointment, VisitType } from '../../../_models/appointment.model';

interface PatientSummary {
  patientId: string;
  patientName: string;
  visitCount: number;
  lastVisitDate: string;
  lastVisitType: VisitType;
}

const VISIT_TYPE_LABEL: Record<VisitType, string> = {
  GeneralConsultation: 'General Consultation',
  FollowUp: 'Follow-up',
  AnnualCheckup: 'Annual Checkup',
};

@Component({
  selector: 'app-patient-list',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './patient-list.component.html',
  styleUrl: './patient-list.component.scss',
  animations: [
    trigger('stagger', [
      transition(':enter', [
        query('.patient-item', [
          style({ opacity: 0, transform: 'translateY(10px)' }),
          stagger(40, [
            animate('260ms cubic-bezier(0.16, 1, 0.3, 1)',
              style({ opacity: 1, transform: 'translateY(0)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(6px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class PatientListComponent {
  private auth = inject(AuthService);
  private doctorService = inject(DoctorService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  protected loading = signal(true);
  protected appointments = signal<Appointment[]>([]);

  protected searchControl = this.fb.nonNullable.control('');
  private search = toSignal(
    this.searchControl.valueChanges.pipe(startWith('')),
    { initialValue: '' },
  );

  protected patients = computed<PatientSummary[]>(() => {
    const map = new Map<string, PatientSummary>();
    for (const a of this.appointments()) {
      const existing = map.get(a.patientId);
      if (!existing) {
        map.set(a.patientId, {
          patientId: a.patientId,
          patientName: a.patientName,
          visitCount: 1,
          lastVisitDate: a.appointmentDate,
          lastVisitType: a.visitType,
        });
        continue;
      }
      existing.visitCount += 1;
      if (a.appointmentDate > existing.lastVisitDate) {
        existing.lastVisitDate = a.appointmentDate;
        existing.lastVisitType = a.visitType;
      }
    }
    return [...map.values()].sort((a, b) =>
      b.lastVisitDate.localeCompare(a.lastVisitDate),
    );
  });

  protected filtered = computed<PatientSummary[]>(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.patients();
    return this.patients().filter(p =>
      p.patientName.toLowerCase().includes(term),
    );
  });

  protected totalPatients = computed(() => this.patients().length);
  protected hasNoMatches = computed(() =>
    this.search().trim().length > 0 && this.filtered().length === 0,
  );

  constructor() {
    this.load();
  }

  protected open(patient: PatientSummary): void {
    this.router.navigate(['/doctor/patient-records', patient.patientId]);
  }

  protected clearSearch(): void {
    this.searchControl.setValue('');
  }

  protected visitTypeLabel(type: VisitType): string {
    return VISIT_TYPE_LABEL[type];
  }

  protected formatDate(value: string): string {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  protected initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  protected avatarTone(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
    return Math.abs(hash) % 5;
  }

  private load(): void {
    const id = this.auth.currentUser()?.id;
    if (!id) return;
    this.loading.set(true);
    this.doctorService.getSchedule(id).subscribe({
      next: list => {
        this.appointments.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.appointments.set([]);
        this.loading.set(false);
      },
    });
  }
}
