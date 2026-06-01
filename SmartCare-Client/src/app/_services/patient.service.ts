import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Appointment } from '../_models/appointment.model';

@Injectable({ providedIn: 'root' })
export class PatientService {
  private api = inject(ApiService);

  getMyAppointments(): Observable<Appointment[]> {
    return this.api.get<Appointment[]>('appointments/my');
  }
}
