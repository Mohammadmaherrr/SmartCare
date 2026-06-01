import {
  AfterViewInit,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { animate, style, transition, trigger, query, stagger } from '@angular/animations';
import { catchError, of } from 'rxjs';
import { EmergencyService } from '../../../_services/emergency.service';
import {
  Coordinates,
  GeolocationFailure,
  GeolocationService,
} from '../../../_services/geolocation.service';
import { NearbyClinic } from '../../../_models/emergency.model';
import { MapViewComponent } from '../../../shared/map/map-view.component';

type Phase = 'locating' | 'loading' | 'ready' | 'error';

const AMMAN_FALLBACK: Coordinates = { lat: 31.9539, lng: 35.9106 };

@Component({
  selector: 'app-nearby-clinics',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MapViewComponent,
  ],
  templateUrl: './nearby-clinics.component.html',
  styleUrl: './nearby-clinics.component.scss',
  animations: [
    trigger('panelEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate(
          '360ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ]),
    ]),
    trigger('listStagger', [
      transition(':enter', [
        query(
          '.clinic-card',
          [
            style({ opacity: 0, transform: 'translateX(12px)' }),
            stagger(60, [
              animate(
                '280ms cubic-bezier(0.16, 1, 0.3, 1)',
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
export class NearbyClinicsComponent implements AfterViewInit {
  private emergency = inject(EmergencyService);
  private geolocation = inject(GeolocationService);

  protected phase = signal<Phase>('locating');
  protected coords = signal<Coordinates | null>(null);
  protected clinics = signal<NearbyClinic[]>([]);
  protected selectedId = signal<string | null>(null);
  protected locationFailure = signal<GeolocationFailure | null>(null);
  protected usingFallback = signal(false);
  protected errorMessage = signal<string | null>(null);

  protected sortedClinics = computed(() =>
    [...this.clinics()].sort((a, b) => a.distanceKm - b.distanceKm),
  );

  protected hasResults = computed(() => this.clinics().length > 0);

  private cardEls = viewChildren<ElementRef<HTMLElement>>('clinicCard');

  constructor() {
    effect(() => {
      const id = this.selectedId();
      if (!id) return;
      const cards = this.cardEls();
      const card = cards.find((el) => el.nativeElement.dataset['clinicId'] === id);
      card?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.locate());
  }

  protected onClinicSelect(id: string): void {
    this.selectedId.set(id);
  }

  protected selectFromList(clinic: NearbyClinic): void {
    this.selectedId.set(clinic.id);
  }

  protected getDirections(clinic: NearbyClinic, event: Event): void {
    event.stopPropagation();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${clinic.latitude},${clinic.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  protected retryLocation(): void {
    this.locationFailure.set(null);
    this.usingFallback.set(false);
    this.locate();
  }

  protected refresh(): void {
    const coords = this.coords();
    if (!coords) {
      this.locate();
      return;
    }
    this.loadClinics(coords);
  }

  private async locate(): Promise<void> {
    this.phase.set('locating');
    this.errorMessage.set(null);

    try {
      const coords = await this.geolocation.getCurrentPosition();
      this.coords.set(coords);
      this.usingFallback.set(false);
      this.loadClinics(coords);
    } catch (err) {
      const failure = err as GeolocationFailure;
      this.locationFailure.set(failure);
      this.coords.set(AMMAN_FALLBACK);
      this.usingFallback.set(true);
      this.loadClinics(AMMAN_FALLBACK);
    }
  }

  private loadClinics(coords: Coordinates): void {
    this.phase.set('loading');
    this.selectedId.set(null);

    this.emergency
      .getNearbyClinics(coords.lat, coords.lng)
      .pipe(
        catchError(() => {
          this.errorMessage.set('Could not load nearby clinics. Please try again.');
          return of<NearbyClinic[] | null>(null);
        }),
      )
      .subscribe((list) => {
        if (list === null) {
          this.phase.set('error');
          return;
        }
        this.clinics.set(list);
        this.phase.set('ready');
      });
  }
}
