import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  Appointment,
  AppointmentStatus,
  PatientProfile,
  VisitType,
} from '../_models/appointment.model';
import { VisitSummary } from '../_models/visit-summary.model';

export interface BookAppointmentRequest {
  patientId?: string;
  doctorId: string;
  appointmentDate: string; // "YYYY-MM-DD"
  timeSlot: string; // "HH:mm:ss"
  visitType: VisitType;
}

export interface CancelAppointmentRequest {
  reason?: string;
}

export interface UpdateStatusRequest {
  newStatus: AppointmentStatus;
}

export const VISIT_TYPE_DURATIONS: Record<VisitType, number> = {
  GeneralConsultation: 30,
  FollowUp: 15,
  AnnualCheckup: 45,
};

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private api = inject(ApiService);

  book(request: BookAppointmentRequest): Observable<Appointment> {
    return this.api.post<Appointment>('appointments', request);
  }

  cancel(id: string, request: CancelAppointmentRequest = {}): Observable<Appointment> {
    return this.api.put<Appointment>(`appointments/${id}/cancel`, request);
  }

  getById(id: string): Observable<Appointment> {
    return this.api.get<Appointment>(`appointments/${id}`);
  }

  getPatientForAppointment(id: string): Observable<PatientProfile> {
    return this.api.get<PatientProfile>(`appointments/${id}/patient`);
  }

  getPatientAppointments(patientId: string): Observable<Appointment[]> {
    return this.api.get<Appointment[]>(`appointments/patient/${patientId}`);
  }

  getDoctorSchedule(doctorId: string, from?: string, to?: string): Observable<Appointment[]> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    const path = `appointments/doctor/${doctorId}/schedule${query ? `?${query}` : ''}`;
    return this.api.get<Appointment[]>(path);
  }

  updateStatus(id: string, request: UpdateStatusRequest): Observable<Appointment> {
    return this.api.put<Appointment>(`appointments/${id}/status`, request);
  }

  getMyAppointments(): Observable<Appointment[]> {
    return this.api.get<Appointment[]>('appointments/my');
  }

  getVisitSummary(appointmentId: string): Observable<VisitSummary> {
    return this.api.get<VisitSummary>(`appointments/${appointmentId}/summary`);
  }

  submitVisitSummary(appointmentId: string, summary: VisitSummary): Observable<VisitSummary> {
    return this.api.post<VisitSummary>(`appointments/${appointmentId}/summary`, summary);
  }
}
