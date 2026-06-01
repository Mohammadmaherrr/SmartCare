import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Appointment } from '../_models/appointment.model';
import { Doctor } from '../_models/doctor.model';

export interface BusySlot {
  timeSlot: string; // "HH:mm:ss"
  endTime: string; // "HH:mm:ss"
}

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private api = inject(ApiService);

  getAll(): Observable<Doctor[]> {
    return this.api.get<Doctor[]>('doctors');
  }

  getSchedule(doctorId: string, from?: string, to?: string): Observable<Appointment[]> {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    const path = `appointments/doctor/${doctorId}/schedule${query ? `?${query}` : ''}`;
    return this.api.get<Appointment[]>(path);
  }

  getBusySlots(doctorId: string, date: string): Observable<BusySlot[]> {
    return this.api.get<BusySlot[]>(`appointments/doctor/${doctorId}/busy-slots?date=${date}`);
  }
}
