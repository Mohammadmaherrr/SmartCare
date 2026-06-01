import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  ActiveEmergency,
  EmergencyRequest,
  EmergencyStatus,
  NearbyClinic,
} from '../_models/emergency.model';

@Injectable({ providedIn: 'root' })
export class EmergencyService {
  private api = inject(ApiService);

  getNearbyClinics(lat: number, lng: number): Observable<NearbyClinic[]> {
    const path = `emergency/nearby-clinics?lat=${lat}&lng=${lng}`;
    return this.api.get<NearbyClinic[]>(path);
  }

  createEmergencyRequest(lat: number, lng: number): Observable<EmergencyRequest> {
    return this.api.post<EmergencyRequest>('emergency/request', { latitude: lat, longitude: lng });
  }

  getActive(): Observable<ActiveEmergency[]> {
    return this.api.get<ActiveEmergency[]>('emergency/active');
  }

  updateStatus(id: string, newStatus: EmergencyStatus): Observable<EmergencyRequest> {
    return this.api.put<EmergencyRequest>(`emergency/${id}/status`, { newStatus });
  }
}
