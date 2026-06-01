import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { AuthService } from '../../../_services/auth.service';
import { PatientService } from '../../../_services/patient.service';
import { Appointment, VisitType } from '../../../_models/appointment.model';

const VISIT_TYPE_LABEL: Record<VisitType, string> = {
  GeneralConsultation: 'General Consultation',
  FollowUp: 'Follow-up',
  AnnualCheckup: 'Annual Checkup',
};

@Component({
  selector: 'app-patient-dashboard',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  animations: [
    trigger('stagger', [
      transition(':enter', [
        query('.stagger-item', [
          style({ opacity: 0, transform: 'translateY(16px)' }),
          stagger(100, [
            animate('320ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
  ],
})
export class DashboardComponent {
  private auth = inject(AuthService);
  private patient = inject(PatientService);
  private router = inject(Router);

  protected user = this.auth.currentUser;
  protected today = new Date();

  protected loading = signal(true);
  protected appointments = signal<Appointment[]>([]);

  protected upcoming = computed(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return this.appointments()
      .filter(a =>
        a.status !== 'Cancelled' &&
        a.status !== 'Completed' &&
        a.status !== 'NoShow' &&
        a.appointmentDate >= todayStr,
      )
      .sort((a, b) => {
        const dateCmp = a.appointmentDate.localeCompare(b.appointmentDate);
        return dateCmp !== 0 ? dateCmp : a.timeSlot.localeCompare(b.timeSlot);
      });
  });

  protected upcomingCount = computed(() => this.upcoming().length);
  protected nextAppointment = computed(() => this.upcoming()[0] ?? null);
  protected pendingSummaries = signal(0);
  protected latestPrescription = signal<{ name: string; dosage: string; date: string } | null>(null);

  constructor() {
    this.patient.getMyAppointments().subscribe({
      next: list => {
        this.appointments.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  protected visitTypeLabel(type: VisitType): string {
    return VISIT_TYPE_LABEL[type];
  }

  protected formatTime(timeSlot: string): string {
    const [h, m] = timeSlot.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  }

  protected book(): void {
    this.router.navigateByUrl('/patient/book-appointment');
  }

  protected sos(): void {
    this.router.navigateByUrl('/patient/emergency');
  }

  protected viewAppointments(): void {
    this.router.navigateByUrl('/patient/appointments');
  }
}
