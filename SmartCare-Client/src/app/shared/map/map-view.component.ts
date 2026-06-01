import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { NearbyClinic } from '../../_models/emergency.model';
import { Coordinates } from '../../_services/geolocation.service';

@Component({
  selector: 'app-map-view',
  standalone: true,
  template: `<div #mapEl class="map-canvas"></div>`,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .map-canvas {
      width: 100%;
      height: 100%;
      border-radius: 14px;
      overflow: hidden;
      background: #E5EBF1;
    }
  `],
})
export class MapViewComponent implements AfterViewInit {
  clinics = input<NearbyClinic[]>([]);
  patientCoords = input<Coordinates | null>(null);
  selectedClinicId = input<string | null>(null);

  clinicSelect = output<string>();

  private mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');
  private destroyRef = inject(DestroyRef);

  private map = signal<L.Map | null>(null);
  private markers = new Map<string, L.Marker>();
  private patientMarker: L.Marker | null = null;

  constructor() {
    effect(() => {
      const map = this.map();
      if (!map) return;
      this.renderPatient(map, this.patientCoords());
      this.renderClinics(map, this.clinics());
      this.highlightSelected(this.selectedClinicId());
    });
  }

  ngAfterViewInit(): void {
    const initial = this.patientCoords() ?? { lat: 31.9539, lng: 35.9106 };

    const map = L.map(this.mapEl().nativeElement, {
      center: [initial.lat, initial.lng],
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    this.map.set(map);

    this.destroyRef.onDestroy(() => {
      map.remove();
      this.markers.clear();
      this.patientMarker = null;
    });
  }

  private renderPatient(map: L.Map, coords: Coordinates | null): void {
    if (this.patientMarker) {
      map.removeLayer(this.patientMarker);
      this.patientMarker = null;
    }
    if (!coords) return;

    const icon = L.divIcon({
      className: 'patient-marker',
      html: `<div class="pulse"></div><div class="dot"></div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    this.patientMarker = L.marker([coords.lat, coords.lng], { icon, zIndexOffset: 1000 })
      .addTo(map)
      .bindTooltip('You are here', { direction: 'top', offset: [0, -10] });
  }

  private renderClinics(map: L.Map, clinics: NearbyClinic[]): void {
    for (const m of this.markers.values()) {
      map.removeLayer(m);
    }
    this.markers.clear();

    for (const clinic of clinics) {
      const icon = this.clinicIcon(false);
      const marker = L.marker([clinic.latitude, clinic.longitude], { icon })
        .addTo(map)
        .bindPopup(this.popupHtml(clinic), { closeButton: true, offset: [0, -14] });

      marker.on('click', () => {
        this.clinicSelect.emit(clinic.id);
      });

      this.markers.set(clinic.id, marker);
    }

    if (clinics.length > 0) {
      const patient = this.patientCoords();
      const points: L.LatLngTuple[] = clinics.map(c => [c.latitude, c.longitude]);
      if (patient) points.push([patient.lat, patient.lng]);
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }

  private highlightSelected(id: string | null): void {
    const map = this.map();
    if (!map) return;

    for (const [clinicId, marker] of this.markers.entries()) {
      marker.setIcon(this.clinicIcon(clinicId === id));
    }

    if (id) {
      const marker = this.markers.get(id);
      if (marker) {
        map.panTo(marker.getLatLng(), { animate: true });
        marker.openPopup();
      }
    }
  }

  private clinicIcon(active: boolean): L.DivIcon {
    return L.divIcon({
      className: 'clinic-marker' + (active ? ' clinic-marker--active' : ''),
      html: `<div class="pin"><span class="cross"></span></div>`,
      iconSize: [32, 40],
      iconAnchor: [16, 38],
      popupAnchor: [0, -34],
    });
  }

  private popupHtml(clinic: NearbyClinic): string {
    const phone = clinic.phoneNumber ? `<div class="row"><span>Phone:</span> ${this.escape(clinic.phoneNumber)}</div>` : '';
    return `
      <div class="clinic-popup">
        <div class="title">${this.escape(clinic.name)}</div>
        <div class="row">${this.escape(clinic.address)}</div>
        ${phone}
        <div class="row distance">${clinic.distanceKm.toFixed(1)} km away</div>
      </div>
    `;
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
