import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { interval, startWith, switchMap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { EmergencyService } from '../../../_services/emergency.service';
import {
  ActiveEmergency,
  EmergencyStatus,
  NearbyClinic,
} from '../../../_models/emergency.model';
import { Coordinates } from '../../../_services/geolocation.service';
import { MapViewComponent } from '../../../shared/map/map-view.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/confirm-dialog/confirm-dialog.component';

const REFRESH_MS = 30_000;

@Component({
  selector: 'app-active-emergencies',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MapViewComponent,
  ],
  templateUrl: './active-emergencies.component.html',
  styleUrl: './active-emergencies.component.scss',
  animations: [
    trigger('listStagger', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(8px)' }),
          stagger(40, [
            animate('220ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
          ]),
        ], { optional: true }),
      ]),
    ]),
    trigger('detailFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('260ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class ActiveEmergenciesComponent {
  private emergency = inject(EmergencyService);
  private dialog = inject(MatDialog);
  private toastr = inject(ToastrService);
  private destroyRef = inject(DestroyRef);

  protected items = signal<ActiveEmergency[]>([]);
  protected loading = signal(true);
  protected refreshing = signal(false);
  protected acting = signal<string | null>(null);
  protected selectedId = signal<string | null>(null);
  protected lastUpdated = signal<Date | null>(null);
  protected clinicsById = signal<Record<string, NearbyClinic[]>>({});

  protected selected = computed<ActiveEmergency | null>(() => {
    const id = this.selectedId();
    return id ? this.items().find(e => e.requestId === id) ?? null : null;
  });

  protected selectedCoords = computed<Coordinates | null>(() => {
    const e = this.selected();
    return e ? { lat: e.latitude, lng: e.longitude } : null;
  });

  protected selectedClinics = computed<NearbyClinic[]>(() => {
    const id = this.selectedId();
    return id ? this.clinicsById()[id] ?? [] : [];
  });

  protected stats = computed(() => {
    const list = this.items();
    return {
      total: list.length,
      pending: list.filter(e => e.status === 'Pending').length,
      dispatched: list.filter(e => e.status === 'Dispatched').length,
    };
  });

  constructor() {
    interval(REFRESH_MS)
      .pipe(
        startWith(0),
        switchMap(() => {
          if (this.items().length === 0) this.loading.set(true);
          else this.refreshing.set(true);
          return this.emergency.getActive();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: list => {
          this.items.set(list);
          this.loading.set(false);
          this.refreshing.set(false);
          this.lastUpdated.set(new Date());

          if (this.selectedId() && !list.some(e => e.requestId === this.selectedId())) {
            this.selectedId.set(null);
          }
        },
        error: () => {
          this.loading.set(false);
          this.refreshing.set(false);
        },
      });
  }

  protected select(id: string): void {
    this.selectedId.set(id);
  }

  protected closeDetail(): void {
    this.selectedId.set(null);
  }

  protected statusClass(status: EmergencyStatus): string {
    return `chip chip--${status.toLowerCase()}`;
  }

  protected formatTime(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  protected formatRelative(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  protected formatCoords(lat: number, lng: number): string {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  protected openInMaps(e: ActiveEmergency, ev?: Event): void {
    ev?.stopPropagation();
    const url = `https://www.openstreetmap.org/?mlat=${e.latitude}&mlon=${e.longitude}#map=16/${e.latitude}/${e.longitude}`;
    window.open(url, '_blank', 'noopener');
  }

  protected confirmDispatch(e: ActiveEmergency): void {
    const data: ConfirmDialogData = {
      title: 'Dispatch help?',
      message: `Mark ${e.patientName}'s emergency as dispatched? This notifies the patient that help is on the way.`,
      confirmLabel: 'Yes, dispatch',
      cancelLabel: 'Not yet',
      tone: 'danger',
    };
    this.dialog
      .open(ConfirmDialogComponent, { data, width: '440px', autoFocus: false })
      .afterClosed()
      .subscribe(ok => { if (ok) this.changeStatus(e, 'Dispatched'); });
  }

  protected confirmResolve(e: ActiveEmergency): void {
    const data: ConfirmDialogData = {
      title: 'Resolve emergency?',
      message: `Mark ${e.patientName}'s emergency as resolved? This removes it from the active list.`,
      confirmLabel: 'Yes, resolve',
      cancelLabel: 'Keep active',
      tone: 'default',
    };
    this.dialog
      .open(ConfirmDialogComponent, { data, width: '440px', autoFocus: false })
      .afterClosed()
      .subscribe(ok => { if (ok) this.changeStatus(e, 'Resolved'); });
  }

  private changeStatus(e: ActiveEmergency, newStatus: EmergencyStatus): void {
    if (this.acting()) return;
    this.acting.set(e.requestId);

    this.emergency.updateStatus(e.requestId, newStatus).subscribe({
      next: response => {
        if (newStatus === 'Resolved') {
          this.items.update(list => list.filter(x => x.requestId !== e.requestId));
          if (this.selectedId() === e.requestId) this.selectedId.set(null);
          this.toastr.success(`${e.patientName}'s emergency resolved`);
        } else {
          this.items.update(list => list.map(x =>
            x.requestId === e.requestId ? { ...x, status: newStatus } : x,
          ));
          if (response.nearbyClinics?.length) {
            this.clinicsById.update(m => ({ ...m, [e.requestId]: response.nearbyClinics }));
          }
          this.toastr.success(`Dispatched help to ${e.patientName}`);
        }
        this.acting.set(null);
      },
      error: () => this.acting.set(null),
    });
  }
}
