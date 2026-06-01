import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { animate, style, transition, trigger } from '@angular/animations';
import { AuthService } from '../../../_services/auth.service';
import { DoctorService } from '../../../_services/doctor.service';
import { Appointment, AppointmentStatus, VisitType } from '../../../_models/appointment.model';

type ScheduleView = 'week' | 'day';

interface DayColumn {
  date: Date;
  isoDate: string;
  weekday: string;
  day: number;
  isToday: boolean;
  isWeekend: boolean;
}

interface PositionedAppointment {
  appointment: Appointment;
  top: number;
  height: number;
  laneIndex: number;
  laneCount: number;
}

const VISIT_TYPE_LABEL: Record<VisitType, string> = {
  GeneralConsultation: 'General Consultation',
  FollowUp: 'Follow-up',
  AnnualCheckup: 'Annual Checkup',
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  Pending: 'Pending',
  Confirmed: 'Confirmed',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
  NoShow: 'No-show',
};

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 20;
const SLOT_MINUTES = 30;
const PX_PER_MINUTE = 2;

@Component({
  selector: 'app-doctor-schedule',
  imports: [
    CommonModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(6px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class ScheduleComponent {
  private auth = inject(AuthService);
  private doctorService = inject(DoctorService);
  private router = inject(Router);

  protected readonly slotPx = SLOT_MINUTES * PX_PER_MINUTE;
  protected readonly columnHeightPx = (DAY_END_HOUR - DAY_START_HOUR) * 60 * PX_PER_MINUTE;

  protected user = this.auth.currentUser;

  protected view = signal<ScheduleView>('week');
  protected loading = signal(true);
  protected items = signal<Appointment[]>([]);
  protected anchorDate = signal<Date>(this.startOfWeek(new Date()));
  protected selectedDay = signal<Date>(this.startOfDay(new Date()));

  protected timeSlots = this.buildTimeSlots();

  protected weekColumns = computed<DayColumn[]>(() => {
    const start = this.anchorDate();
    return Array.from({ length: 7 }, (_, i) => this.toColumn(this.addDays(start, i)));
  });

  protected dayColumns = computed<DayColumn[]>(() => [this.toColumn(this.selectedDay())]);

  protected columns = computed<DayColumn[]>(() =>
    this.view() === 'week' ? this.weekColumns() : this.dayColumns(),
  );

  protected periodLabel = computed<string>(() => {
    if (this.view() === 'day') {
      return this.selectedDay().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    const cols = this.weekColumns();
    const first = cols[0].date;
    const last = cols[cols.length - 1].date;
    const sameMonth = first.getMonth() === last.getMonth();
    const fmtStart = first.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const fmtEnd = last.toLocaleDateString('en-US', {
      month: sameMonth ? undefined : 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${fmtStart} – ${fmtEnd}`;
  });

  protected positionedByColumn = computed<Map<string, PositionedAppointment[]>>(() => {
    const map = new Map<string, PositionedAppointment[]>();
    const cols = this.columns();
    for (const col of cols) map.set(col.isoDate, []);

    const grouped = new Map<string, Appointment[]>();
    for (const a of this.items()) {
      if (!map.has(a.appointmentDate)) continue;
      const list = grouped.get(a.appointmentDate) ?? [];
      list.push(a);
      grouped.set(a.appointmentDate, list);
    }

    for (const [iso, list] of grouped) {
      map.set(iso, this.layoutDay(list));
    }
    return map;
  });

  constructor() {
    this.load();
  }

  protected setView(view: ScheduleView): void {
    if (this.view() === view) return;
    this.view.set(view);
    if (view === 'day') {
      const sel = this.selectedDay();
      const anchor = this.anchorDate();
      const end = this.addDays(anchor, 6);
      if (sel < anchor || sel > end) this.selectedDay.set(anchor);
    }
    this.load();
  }

  protected previous(): void {
    if (this.view() === 'week') {
      this.anchorDate.set(this.addDays(this.anchorDate(), -7));
    } else {
      this.selectedDay.set(this.addDays(this.selectedDay(), -1));
    }
    this.load();
  }

  protected next(): void {
    if (this.view() === 'week') {
      this.anchorDate.set(this.addDays(this.anchorDate(), 7));
    } else {
      this.selectedDay.set(this.addDays(this.selectedDay(), 1));
    }
    this.load();
  }

  protected today(): void {
    const now = new Date();
    this.anchorDate.set(this.startOfWeek(now));
    this.selectedDay.set(this.startOfDay(now));
    this.load();
  }

  protected pickDay(col: DayColumn): void {
    if (this.view() !== 'week') return;
    this.selectedDay.set(new Date(col.date));
    this.view.set('day');
    this.load();
  }

  protected open(appointment: Appointment): void {
    this.router.navigate(['/doctor/appointments', appointment.id]);
  }

  protected blockTooltip(a: Appointment): string {
    return `${this.formatTime(a.timeSlot)} – ${this.formatTime(a.endTime)}\n${a.patientName}\n${VISIT_TYPE_LABEL[a.visitType]} · ${STATUS_LABEL[a.status]}`;
  }

  protected statusLabel(status: AppointmentStatus): string {
    return STATUS_LABEL[status];
  }

  protected visitTypeLabel(type: VisitType): string {
    return VISIT_TYPE_LABEL[type];
  }

  protected formatTime(timeSlot: string): string {
    const [h, m] = timeSlot.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  }

  protected hourLabel(hour: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12} ${period}`;
  }

  private load(): void {
    const id = this.user()?.id;
    if (!id) return;
    this.loading.set(true);
    const cols = this.view() === 'week' ? this.weekColumns() : this.dayColumns();
    const from = cols[0].isoDate;
    const to = cols[cols.length - 1].isoDate;

    this.doctorService.getSchedule(id, from, to).subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.loading.set(false);
      },
    });
  }

  private layoutDay(list: Appointment[]): PositionedAppointment[] {
    const sorted = [...list].sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
    const lanes: number[] = [];
    const placed: { item: Appointment; lane: number; start: number; end: number }[] = [];

    for (const a of sorted) {
      const start = this.toMinutes(a.timeSlot);
      const end = this.toMinutes(a.endTime);
      let lane = lanes.findIndex((laneEnd) => laneEnd <= start);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(end);
      } else {
        lanes[lane] = end;
      }
      placed.push({ item: a, lane, start, end });
    }

    const clusters = this.computeClusters(placed);
    const result: PositionedAppointment[] = [];

    for (const cluster of clusters) {
      const laneCount = cluster.laneCount;
      for (const p of cluster.items) {
        const startOffset = (p.start - DAY_START_HOUR * 60) * PX_PER_MINUTE;
        const height = (p.end - p.start) * PX_PER_MINUTE;
        result.push({
          appointment: p.item,
          top: Math.max(0, startOffset),
          height: Math.max(this.slotPx * 0.7, height - 2),
          laneIndex: p.lane,
          laneCount,
        });
      }
    }
    return result;
  }

  private computeClusters(
    placed: { item: Appointment; lane: number; start: number; end: number }[],
  ): { items: typeof placed; laneCount: number }[] {
    const clusters: { items: typeof placed; laneCount: number }[] = [];
    let current: typeof placed = [];
    let currentEnd = -1;

    const sorted = [...placed].sort((a, b) => a.start - b.start);

    for (const p of sorted) {
      if (current.length === 0 || p.start < currentEnd) {
        current.push(p);
        currentEnd = Math.max(currentEnd, p.end);
      } else {
        const lc = Math.max(...current.map((x) => x.lane)) + 1;
        clusters.push({ items: current, laneCount: lc });
        current = [p];
        currentEnd = p.end;
      }
    }
    if (current.length) {
      const lc = Math.max(...current.map((x) => x.lane)) + 1;
      clusters.push({ items: current, laneCount: lc });
    }
    return clusters;
  }

  private toMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  private buildTimeSlots(): { hour: number; label: string }[] {
    const slots: { hour: number; label: string }[] = [];
    for (let h = DAY_START_HOUR; h < DAY_END_HOUR; h++) {
      slots.push({ hour: h, label: this.hourLabel(h) });
    }
    return slots;
  }

  private toColumn(date: Date): DayColumn {
    const todayIso = this.toIso(new Date());
    const iso = this.toIso(date);
    const dow = date.getDay();
    return {
      date: new Date(date),
      isoDate: iso,
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      day: date.getDate(),
      isToday: iso === todayIso,
      isWeekend: dow === 0 || dow === 6,
    };
  }

  private startOfDay(d: Date): Date {
    const out = new Date(d);
    out.setHours(0, 0, 0, 0);
    return out;
  }

  private startOfWeek(d: Date): Date {
    const out = this.startOfDay(d);
    const day = out.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    out.setDate(out.getDate() + diff);
    return out;
  }

  private addDays(d: Date, n: number): Date {
    const out = new Date(d);
    out.setDate(out.getDate() + n);
    return out;
  }

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
