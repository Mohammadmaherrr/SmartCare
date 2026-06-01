import { Injectable } from '@angular/core';

export interface Coordinates {
  lat: number;
  lng: number;
}

export type GeolocationFailureReason = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export interface GeolocationFailure {
  reason: GeolocationFailureReason;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  getCurrentPosition(timeoutMs = 10_000): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(<GeolocationFailure>{
          reason: 'unsupported',
          message: 'Your browser does not support location services.',
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(this.mapError(err)),
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
      );
    });
  }

  private mapError(err: GeolocationPositionError): GeolocationFailure {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return {
          reason: 'denied',
          message: 'Location access was denied. Please enable it in your browser settings.',
        };
      case err.POSITION_UNAVAILABLE:
        return { reason: 'unavailable', message: 'Your device could not determine your location.' };
      case err.TIMEOUT:
        return { reason: 'timeout', message: 'Location request timed out. Please try again.' };
      default:
        return { reason: 'unavailable', message: 'Unable to get your location.' };
    }
  }
}
