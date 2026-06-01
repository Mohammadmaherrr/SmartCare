import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { ApiService } from './api.service';
import { DoctorService } from './doctor.service';
import { Appointment } from '../_models/appointment.model';
import { UserSummary } from '../_models/admin.model';

export interface PatientLookupResult {
  id: string;
  fullName: string;
  email: string;
  contactNumber: string | null;
}

@Injectable({ providedIn: 'root' })
export class ReceptionistService {
  private api = inject(ApiService);
  private doctorService = inject(DoctorService);

  // Aggregates appointments across the whole clinic by fetching each doctor's
  // schedule for the given range. Backend has no all-clinic endpoint yet.
  getAllAppointments(from?: string, to?: string): Observable<Appointment[]> {
    return this.doctorService.getAll().pipe(
      switchMap((doctors) => {
        if (doctors.length === 0) return of<Appointment[][]>([]);
        return forkJoin(doctors.map((d) => this.doctorService.getSchedule(d.id, from, to)));
      }),
      map((lists) => {
        const seen = new Set<string>();
        const out: Appointment[] = [];
        for (const list of lists) {
          for (const a of list) {
            if (!seen.has(a.id)) {
              seen.add(a.id);
              out.push(a);
            }
          }
        }
        return out;
      }),
    );
  }

  searchPatients(query: string): Observable<PatientLookupResult[]> {
    const q = query.trim().toLowerCase();
    return this.api.get<UserSummary[]>('patients').pipe(
      map((list) => list.map(toLookupResult)),
      map((list) =>
        q
          ? list.filter(
              (p) => p.fullName.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
            )
          : list,
      ),
    );
  }
}

function toLookupResult(u: UserSummary): PatientLookupResult {
  return {
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    contactNumber: u.contactNumber ?? null,
  };
}
