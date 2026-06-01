import type { Role, AccountStatus } from './user.model';

export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  accountStatus: AccountStatus;
  // Doctor
  specialization: string | null;
  licenseNumber: string | null;
  // Receptionist
  employeeId: string | null;
  // Patient
  dateOfBirth: string | null; // DateOnly → "YYYY-MM-DD"
  gender: string | null;
  contactNumber: string | null;
  address: string | null;
  // Admin
  adminLevel: number | null;
}

export interface DoctorAppointmentBreakdown {
  doctorId: string;
  doctorName: string;
  total: number;
  completed: number;
  noShows: number;
  cancelled: number;
}

export interface AppointmentReport {
  startDate: string | null; // DateOnly → "YYYY-MM-DD"
  endDate: string | null;
  total: number;
  completed: number;
  noShows: number;
  cancelled: number;
  pending: number;
  confirmed: number;
  byDoctor: DoctorAppointmentBreakdown[];
}

export interface DailyVisitCount {
  date: string; // DateOnly → "YYYY-MM-DD"
  count: number;
}

export interface VisitFrequencyReport {
  startDate: string | null;
  endDate: string | null;
  data: DailyVisitCount[];
}

export interface SystemSetting {
  key: string;
  value: string;
}

export type StaffRole = 'Doctor' | 'Receptionist';

export interface CreateStaffRequest {
  fullName: string;
  email: string;
  password: string;
  role: StaffRole;
  // Doctor
  specialization?: string;
  licenseNumber?: string;
  // Receptionist
  employeeId?: string;
}

export interface UpdateUserRequest {
  fullName?: string;
  email?: string;
  // Doctor
  specialization?: string;
  licenseNumber?: string;
  // Receptionist
  employeeId?: string;
  // Patient
  dateOfBirth?: string;
  gender?: string;
  contactNumber?: string;
  address?: string;
}
