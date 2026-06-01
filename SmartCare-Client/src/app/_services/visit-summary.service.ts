import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { VisitSummary } from '../_models/visit-summary.model';

@Injectable({ providedIn: 'root' })
export class VisitSummaryService {
  private api = inject(ApiService);

  submit(appointmentId: string, summary: VisitSummary): Observable<VisitSummary> {
    return this.api.post<VisitSummary>(`appointments/${appointmentId}/summary`, summary);
  }

  get(appointmentId: string): Observable<VisitSummary> {
    return this.api.get<VisitSummary>(`appointments/${appointmentId}/summary`);
  }
}
