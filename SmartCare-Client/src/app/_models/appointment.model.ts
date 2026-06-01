export type VisitType = 'GeneralConsultation' | 'FollowUp' | 'AnnualCheckup';

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'NoShow';

export type PaymentStatus = 'OnHold' | 'Refunded' | 'Charged';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string; // DateOnly → "YYYY-MM-DD"
  timeSlot: string;        // TimeOnly → "HH:mm:ss"
  endTime: string;         // TimeOnly → "HH:mm:ss"
  visitType: VisitType;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
}

export interface PatientProfile {
  id: string;
  fullName: string;
  dateOfBirth: string; // DateOnly → "YYYY-MM-DD"
  gender: string;
  contactNumber: string | null;
  address: string | null;
}
