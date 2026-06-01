export type Role = 'Admin' | 'Doctor' | 'Receptionist' | 'Patient';

export type AccountStatus = 'Active' | 'Blocked';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  accountStatus: AccountStatus;
}

export interface AuthResponse {
  token: string;
  role: Role;
  userId: string;
  fullName: string;
}

export interface PatientRegisterDto {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  dateOfBirth: string; // "YYYY-MM-DD"
  gender: string;
  contactNumber: string;
  address: string;
}
