export type EmergencyStatus = 'Pending' | 'Dispatched' | 'Resolved';

export interface EmergencyRequest {
  id: string;
  patientId: string;
  patientName: string;
  latitude: number;
  longitude: number;
  requestTime: string; // DateTime → ISO string
  status: EmergencyStatus;
  nearbyClinics: NearbyClinic[];
}

export interface NearbyClinic {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber: string | null;
  workingHours: string | null;
  distanceKm: number;
}

export interface ActiveEmergency {
  requestId: string;
  patientName: string;
  latitude: number;
  longitude: number;
  requestTime: string; // DateTime → ISO string
  status: EmergencyStatus;
}
