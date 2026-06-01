import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  AppointmentReport,
  CreateStaffRequest,
  SystemSetting,
  UpdateUserRequest,
  UserSummary,
  VisitFrequencyReport,
} from '../_models/admin.model';
import { Role } from '../_models/user.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private api = inject(ApiService);

  getUsers(role?: Role | ''): Observable<UserSummary[]> {
    const path = role ? `admin/users?role=${role}` : 'admin/users';
    return this.api.get<UserSummary[]>(path);
  }

  createStaff(request: CreateStaffRequest): Observable<UserSummary> {
    return this.api.post<UserSummary>('admin/users', request);
  }

  updateUser(id: string, request: UpdateUserRequest): Observable<UserSummary> {
    return this.api.put<UserSummary>(`admin/users/${id}`, request);
  }

  deactivateUser(id: string): Observable<string> {
    return this.api.delete<string>(`admin/users/${id}`);
  }

  getSettings(): Observable<SystemSetting[]> {
    return this.api.get<SystemSetting[]>('admin/settings');
  }

  updateSetting(setting: SystemSetting): Observable<SystemSetting> {
    return this.api.put<SystemSetting>('admin/settings', setting);
  }

  getAppointmentReport(startDate?: string, endDate?: string): Observable<AppointmentReport> {
    return this.api.get<AppointmentReport>(
      this.withRange('admin/reports/appointments', startDate, endDate),
    );
  }

  getVisitFrequencyReport(startDate?: string, endDate?: string): Observable<VisitFrequencyReport> {
    return this.api.get<VisitFrequencyReport>(
      this.withRange('admin/reports/visits', startDate, endDate),
    );
  }

  private withRange(path: string, startDate?: string, endDate?: string): string {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  }
}
