import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { animate, style, transition, trigger } from '@angular/animations';
import { ToastrService } from 'ngx-toastr';
import { AdminService } from '../../../_services/admin.service';
import { SystemSetting } from '../../../_models/admin.model';

interface SettingMeta {
  label: string;
  description: string;
  unit?: string;
  numeric: boolean;
  min?: number;
  group: SettingGroup;
}

type SettingGroup = 'Booking' | 'Fees' | 'Other';

interface GroupConfig {
  id: SettingGroup;
  title: string;
  description: string;
  icon: string;
  tone: 'primary' | 'accent' | 'amber';
}

const GROUPS: GroupConfig[] = [
  { id: 'Booking', title: 'Booking',  description: 'Default appointment durations.', icon: 'event_note', tone: 'primary' },
  { id: 'Fees',    title: 'Fees',     description: 'Charges applied to patients.',   icon: 'payments',   tone: 'accent' },
  { id: 'Other',   title: 'Other',    description: 'Additional system settings.',    icon: 'tune',       tone: 'amber' },
];

const META: Record<string, SettingMeta> = {
  GeneralConsultationDuration: {
    label: 'General Consultation Duration',
    description: 'Slot length for general consultation visits.',
    unit: 'minutes',
    numeric: true,
    min: 5,
    group: 'Booking',
  },
  FollowUpDuration: {
    label: 'Follow-up Duration',
    description: 'Slot length for follow-up visits.',
    unit: 'minutes',
    numeric: true,
    min: 5,
    group: 'Booking',
  },
  AnnualCheckupDuration: {
    label: 'Annual Checkup Duration',
    description: 'Slot length for annual checkup visits.',
    unit: 'minutes',
    numeric: true,
    min: 5,
    group: 'Booking',
  },
  NoShowFee: {
    label: 'No-show Fee',
    description: 'Charge applied when a patient misses an appointment.',
    unit: 'JOD',
    numeric: true,
    min: 0,
    group: 'Fees',
  },
};

interface SettingRow {
  key: string;
  value: string;
  meta: SettingMeta;
  editing: boolean;
  draft: string;
  error: string | null;
}

@Component({
  selector: 'app-admin-settings',
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  animations: [
    trigger('fadeRow', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(6px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class SettingsComponent {
  private admin = inject(AdminService);
  private toastr = inject(ToastrService);

  protected readonly groups = GROUPS;
  protected loading = signal(true);
  protected saving = signal<string | null>(null);
  protected rows = signal<SettingRow[]>([]);

  protected groupedRows = computed<Record<SettingGroup, SettingRow[]>>(() => {
    const acc: Record<SettingGroup, SettingRow[]> = { Booking: [], Fees: [], Other: [] };
    for (const row of this.rows()) acc[row.meta.group].push(row);
    return acc;
  });

  constructor() {
    this.load();
  }

  protected startEdit(key: string): void {
    this.rows.update(list => list.map(r =>
      r.key === key ? { ...r, editing: true, draft: r.value, error: null } : r,
    ));
  }

  protected cancelEdit(key: string): void {
    this.rows.update(list => list.map(r =>
      r.key === key ? { ...r, editing: false, draft: r.value, error: null } : r,
    ));
  }

  protected updateDraft(key: string, value: string): void {
    this.rows.update(list => list.map(r =>
      r.key === key ? { ...r, draft: value, error: this.validate(r.meta, value) } : r,
    ));
  }

  protected save(row: SettingRow): void {
    const error = this.validate(row.meta, row.draft);
    if (error) {
      this.rows.update(list => list.map(r => r.key === row.key ? { ...r, error } : r));
      return;
    }

    const trimmed = row.draft.trim();
    if (trimmed === row.value) {
      this.cancelEdit(row.key);
      return;
    }

    this.saving.set(row.key);
    this.admin.updateSetting({ key: row.key, value: trimmed }).subscribe({
      next: updated => {
        this.rows.update(list => list.map(r =>
          r.key === row.key
            ? { ...r, value: updated.value, draft: updated.value, editing: false, error: null }
            : r,
        ));
        this.saving.set(null);
        this.toastr.success(`${row.meta.label} updated`);
      },
      error: () => this.saving.set(null),
    });
  }

  protected onEnter(row: SettingRow, event: Event): void {
    event.preventDefault();
    this.save(row);
  }

  private validate(meta: SettingMeta, raw: string): string | null {
    const value = (raw ?? '').trim();
    if (!value) return 'Value is required';
    if (!meta.numeric) return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return 'Must be a number';
    if (meta.min !== undefined && num < meta.min) return `Must be ≥ ${meta.min}`;
    return null;
  }

  private load(): void {
    this.loading.set(true);
    this.admin.getSettings().subscribe({
      next: list => {
        this.rows.set(list.map(s => this.toRow(s)));
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
      },
    });
  }

  private toRow(s: SystemSetting): SettingRow {
    const meta = META[s.key] ?? this.defaultMeta(s.key);
    return { key: s.key, value: s.value, meta, editing: false, draft: s.value, error: null };
  }

  private defaultMeta(key: string): SettingMeta {
    return {
      label: this.humanize(key),
      description: '',
      numeric: false,
      group: 'Other',
    };
  }

  private humanize(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^\s+/, '')
      .replace(/^./, c => c.toUpperCase());
  }
}
