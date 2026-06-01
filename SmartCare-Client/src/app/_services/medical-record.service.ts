import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { LabResult, MedicalRecord, Prescription } from '../_models/medical-record.model';

export interface CreateMedicalRecordRequest {
  diagnosis: string;
  treatmentPlan: string | null;
}

export interface CreatePrescriptionRequest {
  medicalRecordId: string;
  medicationName: string;
  dosage: string;
  instructions: string | null;
  issueDate: string; // "YYYY-MM-DD"
}

export interface CreateLabResultRequest {
  patientId: string;
  testName: string;
  resultValue: string;
  resultDate: string; // "YYYY-MM-DD"
}

@Injectable({ providedIn: 'root' })
export class MedicalRecordService {
  private api = inject(ApiService);

  getRecord(patientId: string): Observable<MedicalRecord> {
    return this.api.get<MedicalRecord>(`patients/${patientId}/records`);
  }

  createRecord(patientId: string, body: CreateMedicalRecordRequest): Observable<MedicalRecord> {
    return this.api.post<MedicalRecord>(`patients/${patientId}/records`, body);
  }

  updateRecord(recordId: string, body: CreateMedicalRecordRequest): Observable<MedicalRecord> {
    return this.api.put<MedicalRecord>(`records/${recordId}`, body);
  }

  getPrescriptions(recordId: string): Observable<Prescription[]> {
    return this.api.get<Prescription[]>(`records/${recordId}/prescriptions`);
  }

  addPrescription(recordId: string, body: CreatePrescriptionRequest): Observable<Prescription> {
    return this.api.post<Prescription>(`records/${recordId}/prescriptions`, body);
  }

  getLabResults(patientId: string): Observable<LabResult[]> {
    return this.api.get<LabResult[]>(`patients/${patientId}/lab-results`);
  }

  addLabResult(patientId: string, body: CreateLabResultRequest): Observable<LabResult> {
    return this.api.post<LabResult>(`patients/${patientId}/lab-results`, body);
  }
}
