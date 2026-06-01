import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/confirm-dialog/confirm-dialog.component';
import { EmergencyService } from '../../../_services/emergency.service';
import {
  Coordinates,
  GeolocationFailure,
  GeolocationService,
} from '../../../_services/geolocation.service';
import { EmergencyRequest, NearbyClinic } from '../../../_models/emergency.model';
import { MapViewComponent } from '../../../shared/map/map-view.component';

type Phase =
  | 'idle'
  | 'locating'
  | 'submitting'
  | 'success'
  | 'error-location'
  | 'error-conflict'
  | 'error-network';

@Component({
  selector: 'app-emergency',
  standalone: true,
  imports: [DatePipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MapViewComponent],
  templateUrl: './emergency.component.html',
  styleUrl: './emergency.component.scss',
  animations: [
    trigger('phaseEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(14px)' }),
        animate(
          '360ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ]),
    ]),
    trigger('clinicStagger', [
      transition(':enter', [
        query(
          '.clinic-item',
          [
            style({ opacity: 0, transform: 'translateX(12px)' }),
            stagger(80, [
              animate(
                '300ms cubic-bezier(0.16, 1, 0.3, 1)',
                style({ opacity: 1, transform: 'translateX(0)' }),
              ),
            ]),
          ],
          { optional: true },
        ),
      ]),
    ]),
  ],
})
export class EmergencyComponent {
  private emergency = inject(EmergencyService);
  private geolocation = inject(GeolocationService);
  private dialog = inject(MatDialog);

  protected phase = signal<Phase>('idle');
  protected result = signal<EmergencyRequest | null>(null);
  protected locationFailure = signal<GeolocationFailure | null>(null);
  protected networkMessage = signal<string | null>(null);

  protected patientCoords = computed<Coordinates | null>(() => {
    const r = this.result();
    return r ? { lat: r.latitude, lng: r.longitude } : null;
  });

  protected topClinics = computed<NearbyClinic[]>(() => {
    const list = this.result()?.nearbyClinics ?? [];
    return [...list].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 3);
  });

  protected async triggerSos(): Promise<void> {
    const confirmed = await this.openConfirmDialog();
    if (!confirmed) return;
    this.startRequestFlow();
  }

  protected reset(): void {
    this.phase.set('idle');
    this.result.set(null);
    this.locationFailure.set(null);
    this.networkMessage.set(null);
  }

  protected callClinic(phone: string, event: Event): void {
    event.stopPropagation();
    window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
  }

  protected callEmergencyHotline(): void {
    window.location.href = 'tel:911';
  }

  private openConfirmDialog(): Promise<boolean> {
    const data: ConfirmDialogData = {
      title: 'Send Emergency Alert?',
      message:
        'This will share your current location with medical staff and alert nearby clinics. ' +
        'Only confirm if you need urgent medical help.',
      confirmLabel: 'Yes, send alert',
      cancelLabel: 'Cancel',
      tone: 'danger',
    };
    return new Promise((resolve) => {
      this.dialog
        .open(ConfirmDialogComponent, { data, width: '420px', disableClose: false })
        .afterClosed()
        .subscribe((result) => resolve(Boolean(result)));
    });
  }

  private async startRequestFlow(): Promise<void> {
    this.phase.set('locating');
    this.locationFailure.set(null);

    let coords: Coordinates;
    try {
      coords = await this.geolocation.getCurrentPosition();
    } catch (err) {
      this.locationFailure.set(err as GeolocationFailure);
      this.phase.set('error-location');
      return;
    }

    this.submitRequest(coords);
  }

  private submitRequest(coords: Coordinates): void {
    this.phase.set('submitting');
    this.networkMessage.set(null);

    this.emergency.createEmergencyRequest(coords.lat, coords.lng).subscribe({
      next: (response) => {
        this.result.set(response);
        this.phase.set('success');
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          this.phase.set('error-conflict');
        } else {
          const fallback =
            err.status === 0
              ? 'Could not reach the server. Check your internet connection.'
              : 'Something went wrong while sending your alert.';
          this.networkMessage.set(fallback);
          this.phase.set('error-network');
        }
      },
    });
  }
}
