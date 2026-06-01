import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { catchError, of } from 'rxjs';
import {
  CreateLabResultRequest,
  CreateMedicalRecordRequest,
  CreatePrescriptionRequest,
  MedicalRecordService,
} from '../../../_services/medical-record.service';
import { LabResult, MedicalRecord, Prescription } from '../../../_models/medical-record.model';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/confirm-dialog/confirm-dialog.component';

type TabKey = 'prescriptions' | 'labs';

@Component({
  selector: 'app-patient-records',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './patient-records.component.html',
  styleUrl: './patient-records.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(6px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    trigger('slideForm', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-8px)', height: 0 }),
        animate(
          '260ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateY(0)', height: '*' }),
        ),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-8px)', height: 0 })),
      ]),
    ]),
    trigger('listItem', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px) scale(0.98)' }),
        animate(
          '300ms cubic-bezier(0.16, 1, 0.3, 1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }),
        ),
      ]),
      transition(':leave', [
        animate('180ms ease-in', style({ opacity: 0, transform: 'translateY(-6px) scale(0.98)' })),
      ]),
    ]),
    trigger('listStagger', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(8px)' }),
            stagger(60, [
              animate('260ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
            ]),
          ],
          { optional: true },
        ),
      ]),
    ]),
  ],
})
export class PatientRecordsComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private medicalRecords = inject(MedicalRecordService);
  private toastr = inject(ToastrService);
  private dialog = inject(MatDialog);

  protected readonly maxIssueDate = new Date();

  protected patientId = signal<string>('');

  protected loading = signal(true);
  protected notFound = signal(false);

  protected record = signal<MedicalRecord | null>(null);
  protected savingRecord = signal(false);
  protected editingRecord = signal(false);

  protected activeTab = signal<TabKey>('prescriptions');

  protected prescriptionsLoading = signal(false);
  protected prescriptions = signal<Prescription[]>([]);
  protected prescriptionsLoaded = signal(false);
  protected showPrescriptionForm = signal(false);
  protected savingPrescription = signal(false);

  protected labsLoading = signal(true);
  protected labs = signal<LabResult[]>([]);
  protected showLabForm = signal(false);
  protected savingLab = signal(false);

  protected groupedPrescriptions = computed(() => this.groupByRecency(this.prescriptions()));

  protected patientName = computed(() => this.record()?.patientName ?? 'Patient');

  protected patientInitials = computed(() => this.toInitials(this.patientName()));

  protected recordForm = this.fb.nonNullable.group({
    diagnosis: ['', [Validators.required, Validators.maxLength(500)]],
    treatmentPlan: ['', [Validators.maxLength(1000)]],
  });

  protected prescriptionForm = this.fb.nonNullable.group({
    medicationName: ['', [Validators.required, Validators.maxLength(200)]],
    dosage: ['', [Validators.required, Validators.maxLength(100)]],
    instructions: ['', [Validators.maxLength(500)]],
    issueDate: [new Date() as Date | null, [Validators.required, this.notInFuture]],
  });

  protected labForm = this.fb.nonNullable.group({
    testName: ['', [Validators.required, Validators.maxLength(200)]],
    resultValue: ['', [Validators.required, Validators.maxLength(500)]],
    resultDate: [new Date() as Date | null, [Validators.required, this.notInFuture]],
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.patientId.set(id);
      this.loadAll();
    } else {
      this.loading.set(false);
      this.notFound.set(true);
    }
  }

  protected back(): void {
    this.router.navigate(['/doctor/schedule']);
  }

  protected onTabChange(index: number): void {
    const key: TabKey = (['prescriptions', 'labs'] as const)[index];
    this.activeTab.set(key);
    if (key === 'prescriptions' && !this.prescriptionsLoaded() && this.record()) {
      this.loadPrescriptions(this.record()!.id);
    }
  }

  protected startEditRecord(): void {
    const r = this.record();
    this.recordForm.reset({
      diagnosis: r?.diagnosis ?? '',
      treatmentPlan: r?.treatmentPlan ?? '',
    });
    this.editingRecord.set(true);
  }

  protected cancelEditRecord(): void {
    this.editingRecord.set(false);
  }

  protected saveRecord(): void {
    if (this.recordForm.invalid || this.savingRecord()) {
      this.recordForm.markAllAsTouched();
      return;
    }

    const existing = this.record();
    if (existing) {
      this.confirm(
        {
          title: 'Overwrite medical record?',
          message: `This will replace the existing diagnosis and treatment plan for ${this.patientName()}. The previous values cannot be recovered. Continue?`,
          confirmLabel: 'Save changes',
          cancelLabel: 'Cancel',
          tone: 'default',
        },
        () => this.persistRecord(existing),
      );
      return;
    }

    this.persistRecord(null);
  }

  private persistRecord(existing: MedicalRecord | null): void {
    const v = this.recordForm.getRawValue();
    const body: CreateMedicalRecordRequest = {
      diagnosis: v.diagnosis.trim(),
      treatmentPlan: v.treatmentPlan.trim() || null,
    };

    this.savingRecord.set(true);
    const obs = existing
      ? this.medicalRecords.updateRecord(existing.id, body)
      : this.medicalRecords.createRecord(this.patientId(), body);

    obs.subscribe({
      next: (rec) => {
        const wasCreate = !existing;
        this.record.set(rec);
        this.editingRecord.set(false);
        this.savingRecord.set(false);
        this.toastr.success(wasCreate ? 'Medical record created' : 'Medical record updated');
        if (wasCreate && !this.prescriptionsLoaded()) {
          this.loadPrescriptions(rec.id);
        }
      },
      error: () => this.savingRecord.set(false),
    });
  }

  private confirm(data: ConfirmDialogData, onConfirm: () => void): void {
    this.dialog
      .open(ConfirmDialogComponent, { data, width: '440px', autoFocus: false })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) onConfirm();
      });
  }

  protected togglePrescriptionForm(): void {
    if (!this.record()) {
      this.toastr.info('Create a medical record before adding prescriptions');
      return;
    }
    this.showPrescriptionForm.update((v) => !v);
    if (this.showPrescriptionForm()) {
      this.prescriptionForm.reset({
        medicationName: '',
        dosage: '',
        instructions: '',
        issueDate: new Date(),
      });
    }
  }

  protected submitPrescription(): void {
    const rec = this.record();
    if (!rec || this.prescriptionForm.invalid || this.savingPrescription()) {
      this.prescriptionForm.markAllAsTouched();
      return;
    }

    const v = this.prescriptionForm.getRawValue();
    const body: CreatePrescriptionRequest = {
      medicalRecordId: rec.id,
      medicationName: v.medicationName.trim(),
      dosage: v.dosage.trim(),
      instructions: v.instructions.trim() || null,
      issueDate: this.toIsoDate(v.issueDate!),
    };

    this.savingPrescription.set(true);
    this.medicalRecords.addPrescription(rec.id, body).subscribe({
      next: (created) => {
        this.prescriptions.update((list) =>
          [created, ...list].sort((a, b) => b.issueDate.localeCompare(a.issueDate)),
        );
        this.showPrescriptionForm.set(false);
        this.savingPrescription.set(false);
        this.toastr.success('Prescription added');
      },
      error: () => this.savingPrescription.set(false),
    });
  }

  protected toggleLabForm(): void {
    this.showLabForm.update((v) => !v);
    if (this.showLabForm()) {
      this.labForm.reset({
        testName: '',
        resultValue: '',
        resultDate: new Date(),
      });
    }
  }

  protected submitLabResult(): void {
    if (this.labForm.invalid || this.savingLab()) {
      this.labForm.markAllAsTouched();
      return;
    }

    const v = this.labForm.getRawValue();
    const body: CreateLabResultRequest = {
      patientId: this.patientId(),
      testName: v.testName.trim(),
      resultValue: v.resultValue.trim(),
      resultDate: this.toIsoDate(v.resultDate!),
    };

    this.savingLab.set(true);
    this.medicalRecords.addLabResult(this.patientId(), body).subscribe({
      next: (created) => {
        this.labs.update((list) =>
          [created, ...list].sort((a, b) => b.resultDate.localeCompare(a.resultDate)),
        );
        this.showLabForm.set(false);
        this.savingLab.set(false);
        this.toastr.success('Lab result added');
      },
      error: () => this.savingLab.set(false),
    });
  }

  protected formatDateTime(value: string): string {
    return new Date(value).toLocaleString('en-US', {
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

  private loadAll(): void {
    this.loading.set(true);
    this.medicalRecords
      .getRecord(this.patientId())
      .pipe(catchError(() => of(null)))
      .subscribe((rec) => {
        this.record.set(rec);
        this.loading.set(false);
        if (rec) {
          this.loadPrescriptions(rec.id);
        } else {
          this.editingRecord.set(true);
        }
        this.loadLabs();
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
    this.labsLoading.set(true);
    this.medicalRecords
      .getLabResults(this.patientId())
      .pipe(catchError(() => of([] as LabResult[])))
      .subscribe((list) => {
        this.labs.set([...list].sort((a, b) => b.resultDate.localeCompare(a.resultDate)));
        this.labsLoading.set(false);
      });
  }

  private notInFuture(control: { value: Date | null }) {
    if (!control.value) return null;
    const d = new Date(control.value);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d.getTime() > today.getTime() ? { future: true } : null;
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
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
    recent: boolean;
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

    const groups: { label: string; items: Prescription[]; recent: boolean }[] = [];
    if (recent.length) groups.push({ label: 'Recent (last 30 days)', items: recent, recent: true });
    if (lastQuarter.length)
      groups.push({ label: 'Last 90 days', items: lastQuarter, recent: false });
    if (older.length) groups.push({ label: 'Older', items: older, recent: false });
    return groups;
  }
}
