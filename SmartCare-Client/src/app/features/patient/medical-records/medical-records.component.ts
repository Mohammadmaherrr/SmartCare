import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { animate, style, transition, trigger } from '@angular/animations';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../../_services/auth.service';
import { MedicalRecordService } from '../../../_services/medical-record.service';
import { LabResult, MedicalRecord, Prescription } from '../../../_models/medical-record.model';

type TabKey = 'record' | 'prescriptions' | 'labs';

@Component({
  selector: 'app-medical-records',
  imports: [
    CommonModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './medical-records.component.html',
  styleUrl: './medical-records.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(6px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class MedicalRecordsComponent {
  private auth = inject(AuthService);
  private medicalRecords = inject(MedicalRecordService);

  protected readonly labColumns = ['testName', 'value', 'date'];

  protected user = this.auth.currentUser;
  protected patientInitials = computed(() => this.toInitials(this.user()?.fullName ?? ''));

  protected activeTab = signal<TabKey>('record');

  protected recordLoading = signal(true);
  protected record = signal<MedicalRecord | null>(null);

  protected prescriptionsLoading = signal(false);
  protected prescriptions = signal<Prescription[]>([]);
  protected prescriptionsLoaded = signal(false);

  protected labsLoading = signal(true);
  protected labs = signal<LabResult[]>([]);

  protected groupedPrescriptions = computed(() => this.groupByRecency(this.prescriptions()));

  constructor() {
    this.loadRecord();
    this.loadLabs();
  }

  protected onTabChange(index: number): void {
    const key: TabKey = (['record', 'prescriptions', 'labs'] as const)[index];
    this.activeTab.set(key);

    if (key === 'prescriptions' && !this.prescriptionsLoaded() && this.record()) {
      this.loadPrescriptions(this.record()!.id);
    }
  }

  protected print(): void {
    window.print();
  }

  protected formatDateTime(value: string): string {
    const dt = new Date(value);
    return dt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  protected formatDate(value: string): string {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private loadRecord(): void {
    const id = this.user()?.id;
    if (!id) {
      this.recordLoading.set(false);
      return;
    }

    this.recordLoading.set(true);
    this.medicalRecords
      .getRecord(id)
      .pipe(catchError(() => of(null)))
      .subscribe((rec) => {
        this.record.set(rec);
        this.recordLoading.set(false);
      });
  }

  private loadPrescriptions(recordId: string): void {
    this.prescriptionsLoading.set(true);
    this.medicalRecords
      .getPrescriptions(recordId)
      .pipe(catchError(() => of([] as Prescription[])))
      .subscribe((list) => {
        this.prescriptions.set([...list].sort((a, b) => b.issueDate.localeCompare(a.issueDate)));
        this.prescriptionsLoading.set(false);
        this.prescriptionsLoaded.set(true);
      });
  }

  private loadLabs(): void {
    const id = this.user()?.id;
    if (!id) {
      this.labsLoading.set(false);
      return;
    }

    this.labsLoading.set(true);
    this.medicalRecords
      .getLabResults(id)
      .pipe(catchError(() => of([] as LabResult[])))
      .subscribe((list) => {
        this.labs.set([...list].sort((a, b) => b.resultDate.localeCompare(a.resultDate)));
        this.labsLoading.set(false);
      });
  }

  private toInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  private groupByRecency(list: Prescription[]): {
    label: string;
    items: Prescription[];
  }[] {
    if (list.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);

    const recent: Prescription[] = [];
    const lastQuarter: Prescription[] = [];
    const older: Prescription[] = [];

    for (const p of list) {
      const [y, m, d] = p.issueDate.split('-').map(Number);
      const issued = new Date(y, m - 1, d);
      if (issued >= thirtyDaysAgo) recent.push(p);
      else if (issued >= ninetyDaysAgo) lastQuarter.push(p);
      else older.push(p);
    }

    const groups: { label: string; items: Prescription[] }[] = [];
    if (recent.length) groups.push({ label: 'Recent (last 30 days)', items: recent });
    if (lastQuarter.length) groups.push({ label: 'Last 90 days', items: lastQuarter });
    if (older.length) groups.push({ label: 'Older', items: older });
    return groups;
  }
}
