export interface MedicalRecord {
  id: string;
  patientId: string;
  patientName: string;
  diagnosis: string;
  treatmentPlan: string | null;
  lastUpdated: string; // DateTime → ISO string
}

export interface Prescription {
  id: string;
  medicalRecordId: string;
  medicationName: string;
  dosage: string;
  instructions: string | null;
  issueDate: string; // DateOnly → "YYYY-MM-DD"
}

export interface LabResult {
  id: string;
  patientId: string;
  patientName: string;
  testName: string;
  resultValue: string;
  resultDate: string; // DateOnly → "YYYY-MM-DD"
}
