import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { animate, style, transition, trigger } from '@angular/animations';
import { ToastrService } from 'ngx-toastr';
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import jsPDF from 'jspdf';
import Papa from 'papaparse';
import { AdminService } from '../../../_services/admin.service';
import {
  AppointmentReport,
  VisitFrequencyReport,
} from '../../../_models/admin.model';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

interface SummaryStat {
  key: 'total' | 'completed' | 'noShows' | 'cancelled';
  label: string;
  icon: string;
  tone: 'primary' | 'accent' | 'amber' | 'danger';
}

const SUMMARY_STATS: SummaryStat[] = [
  { key: 'total',     label: 'Total Appointments', icon: 'event',          tone: 'primary' },
  { key: 'completed', label: 'Attended',           icon: 'check_circle',   tone: 'accent' },
  { key: 'noShows',   label: 'No-shows',           icon: 'person_off',     tone: 'amber' },
  { key: 'cancelled', label: 'Cancellations',      icon: 'event_busy',     tone: 'danger' },
];

@Component({
  selector: 'app-admin-reports',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatMenuModule,
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
  animations: [
    trigger('fade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(6px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class ReportsComponent implements AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private admin = inject(AdminService);
  private toastr = inject(ToastrService);

  @ViewChild('doctorChart') doctorChartEl?: ElementRef<HTMLCanvasElement>;
  @ViewChild('visitsChart') visitsChartEl?: ElementRef<HTMLCanvasElement>;

  protected readonly summaryStats = SUMMARY_STATS;

  protected loadingAppointments = signal(false);
  protected loadingVisits = signal(false);
  protected appointmentReport = signal<AppointmentReport | null>(null);
  protected visitReport = signal<VisitFrequencyReport | null>(null);
  protected activeTab = signal<0 | 1>(0);

  private barChart?: Chart;
  private lineChart?: Chart;
  private viewReady = false;

  private startOfMonth = (() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  private today = (() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  })();

  protected range = this.fb.group({
    from: this.fb.control<Date | null>(this.startOfMonth),
    to: this.fb.control<Date | null>(this.today),
  });

  protected attendanceRate = computed(() => {
    const r = this.appointmentReport();
    if (!r || r.total === 0) return 0;
    return Math.round((r.completed / r.total) * 100);
  });

  protected stats = computed(() => {
    const r = this.appointmentReport();
    return {
      total:     r?.total     ?? 0,
      completed: r?.completed ?? 0,
      noShows:   r?.noShows   ?? 0,
      cancelled: r?.cancelled ?? 0,
    };
  });

  protected visitTotal = computed(() =>
    this.visitReport()?.data.reduce((sum, d) => sum + d.count, 0) ?? 0,
  );

  constructor() {
    effect(() => {
      const report = this.appointmentReport();
      if (this.viewReady && this.activeTab() === 0 && report) {
        queueMicrotask(() => this.renderBarChart(report));
      }
    });

    effect(() => {
      const report = this.visitReport();
      if (this.viewReady && this.activeTab() === 1 && report) {
        queueMicrotask(() => this.renderLineChart(report));
      }
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.loadAppointments();
  }

  ngOnDestroy(): void {
    this.barChart?.destroy();
    this.lineChart?.destroy();
  }

  protected onTabChange(index: number): void {
    this.activeTab.set(index === 1 ? 1 : 0);
    if (index === 1 && !this.visitReport() && !this.loadingVisits()) {
      this.loadVisits();
    } else if (index === 1 && this.visitReport()) {
      queueMicrotask(() => this.renderLineChart(this.visitReport()!));
    } else if (index === 0 && this.appointmentReport()) {
      queueMicrotask(() => this.renderBarChart(this.appointmentReport()!));
    }
  }

  protected applyRange(): void {
    if (this.activeTab() === 0) {
      this.loadAppointments();
    } else {
      this.loadVisits();
    }
  }

  protected exportCsv(): void {
    if (this.activeTab() === 0) {
      this.exportAppointmentsCsv();
    } else {
      this.exportVisitsCsv();
    }
  }

  protected exportPdf(): void {
    if (this.activeTab() === 0) {
      this.exportAppointmentsPdf();
    } else {
      this.exportVisitsPdf();
    }
  }

  private loadAppointments(): void {
    this.loadingAppointments.set(true);
    const { from, to } = this.range.value;
    this.admin.getAppointmentReport(this.toIso(from), this.toIso(to)).subscribe({
      next: r => {
        this.appointmentReport.set(r);
        this.loadingAppointments.set(false);
      },
      error: () => {
        this.appointmentReport.set(null);
        this.loadingAppointments.set(false);
      },
    });
  }

  private loadVisits(): void {
    this.loadingVisits.set(true);
    const { from, to } = this.range.value;
    this.admin.getVisitFrequencyReport(this.toIso(from), this.toIso(to)).subscribe({
      next: r => {
        this.visitReport.set(r);
        this.loadingVisits.set(false);
      },
      error: () => {
        this.visitReport.set(null);
        this.loadingVisits.set(false);
      },
    });
  }

  private renderBarChart(report: AppointmentReport): void {
    const canvas = this.doctorChartEl?.nativeElement;
    if (!canvas) return;
    this.barChart?.destroy();

    const labels = report.byDoctor.map(d => d.doctorName);
    const totals = report.byDoctor.map(d => d.total);
    const completed = report.byDoctor.map(d => d.completed);
    const noShows = report.byDoctor.map(d => d.noShows);
    const cancelled = report.byDoctor.map(d => d.cancelled);

    this.barChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Completed', data: completed, backgroundColor: '#00897B', borderRadius: 6, stack: 'a' },
          { label: 'No-shows',  data: noShows,   backgroundColor: '#F57C00', borderRadius: 6, stack: 'a' },
          { label: 'Cancelled', data: cancelled, backgroundColor: '#C62828', borderRadius: 6, stack: 'a' },
          { label: 'Other',     data: totals.map((t, i) => Math.max(0, t - completed[i] - noShows[i] - cancelled[i])), backgroundColor: '#90A4AE', borderRadius: 6, stack: 'a' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12 }, color: '#546E7A', padding: 16, usePointStyle: true } },
          tooltip: { backgroundColor: '#1A1A2E', padding: 10, titleFont: { family: 'Inter' }, bodyFont: { family: 'Inter' } },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { font: { family: 'Inter' }, color: '#546E7A' } },
          y: { stacked: true, beginAtZero: true, grid: { color: '#E0E7EF' }, ticks: { font: { family: 'Inter' }, color: '#546E7A', precision: 0 } },
        },
      },
    });
  }

  private renderLineChart(report: VisitFrequencyReport): void {
    const canvas = this.visitsChartEl?.nativeElement;
    if (!canvas) return;
    this.lineChart?.destroy();

    const labels = report.data.map(d => this.formatShortDate(d.date));
    const counts = report.data.map(d => d.count);

    this.lineChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Visits',
            data: counts,
            borderColor: '#1565C0',
            backgroundColor: 'rgba(21, 101, 192, 0.12)',
            fill: true,
            tension: 0.32,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#1565C0',
            borderWidth: 2.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#1A1A2E', padding: 10, titleFont: { family: 'Inter' }, bodyFont: { family: 'Inter' } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Inter' }, color: '#546E7A', maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
          y: { beginAtZero: true, grid: { color: '#E0E7EF' }, ticks: { font: { family: 'Inter' }, color: '#546E7A', precision: 0 } },
        },
      },
    });
  }

  private exportAppointmentsCsv(): void {
    const report = this.appointmentReport();
    if (!report) { this.toastr.info('Nothing to export'); return; }

    const rows = [
      { Metric: 'Total',     Value: report.total },
      { Metric: 'Completed', Value: report.completed },
      { Metric: 'No-shows',  Value: report.noShows },
      { Metric: 'Cancelled', Value: report.cancelled },
      { Metric: 'Pending',   Value: report.pending },
      { Metric: 'Confirmed', Value: report.confirmed },
    ];

    const byDoctor = report.byDoctor.map(d => ({
      Doctor: d.doctorName,
      Total: d.total,
      Completed: d.completed,
      NoShows: d.noShows,
      Cancelled: d.cancelled,
    }));

    const summaryCsv = Papa.unparse(rows);
    const doctorCsv = Papa.unparse(byDoctor);
    const csv = `Summary\n${summaryCsv}\n\nBy Doctor\n${doctorCsv}\n`;

    this.downloadBlob(csv, this.fileName('appointments', 'csv'), 'text/csv;charset=utf-8');
    this.toastr.success('CSV exported');
  }

  private exportVisitsCsv(): void {
    const report = this.visitReport();
    if (!report) { this.toastr.info('Nothing to export'); return; }

    const rows = report.data.map(d => ({ Date: d.date, Visits: d.count }));
    const csv = Papa.unparse(rows);
    this.downloadBlob(csv, this.fileName('visits', 'csv'), 'text/csv;charset=utf-8');
    this.toastr.success('CSV exported');
  }

  private exportAppointmentsPdf(): void {
    const report = this.appointmentReport();
    if (!report) { this.toastr.info('Nothing to export'); return; }

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Appointment Report', margin, y);
    y += 22;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text(`Date range: ${this.formatRange()}`, margin, y);
    y += 22;

    doc.setTextColor(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Summary', margin, y);
    y += 16;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const summary = [
      ['Total',     report.total],
      ['Completed', report.completed],
      ['No-shows',  report.noShows],
      ['Cancelled', report.cancelled],
      ['Pending',   report.pending],
      ['Confirmed', report.confirmed],
    ];
    summary.forEach(([label, value]) => {
      doc.text(`${label}:`, margin, y);
      doc.text(String(value), margin + 120, y);
      y += 16;
    });

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Appointments per Doctor', margin, y);
    y += 18;

    const chartCanvas = this.doctorChartEl?.nativeElement;
    if (chartCanvas) {
      const img = chartCanvas.toDataURL('image/png', 1.0);
      const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
      const imgHeight = (chartCanvas.height / chartCanvas.width) * pageWidth;
      doc.addImage(img, 'PNG', margin, y, pageWidth, Math.min(imgHeight, 260));
      y += Math.min(imgHeight, 260) + 16;
    }

    if (report.byDoctor.length) {
      if (y > 720) { doc.addPage(); y = margin; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Doctor', margin, y);
      doc.text('Total', margin + 220, y);
      doc.text('Completed', margin + 280, y);
      doc.text('No-shows', margin + 360, y);
      doc.text('Cancelled', margin + 440, y);
      y += 14;
      doc.setDrawColor(220);
      doc.line(margin, y, doc.internal.pageSize.getWidth() - margin, y);
      y += 10;
      doc.setFont('helvetica', 'normal');
      report.byDoctor.forEach(d => {
        if (y > 780) { doc.addPage(); y = margin; }
        doc.text(d.doctorName.slice(0, 32), margin, y);
        doc.text(String(d.total), margin + 220, y);
        doc.text(String(d.completed), margin + 280, y);
        doc.text(String(d.noShows), margin + 360, y);
        doc.text(String(d.cancelled), margin + 440, y);
        y += 14;
      });
    }

    doc.save(this.fileName('appointments', 'pdf'));
    this.toastr.success('PDF exported');
  }

  private exportVisitsPdf(): void {
    const report = this.visitReport();
    if (!report) { this.toastr.info('Nothing to export'); return; }

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Visit Frequency Report', margin, y);
    y += 22;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text(`Date range: ${this.formatRange()}`, margin, y);
    y += 22;

    const totalVisits = report.data.reduce((sum, d) => sum + d.count, 0);
    doc.setTextColor(20);
    doc.text(`Total visits in range: ${totalVisits}`, margin, y);
    y += 20;

    const chartCanvas = this.visitsChartEl?.nativeElement;
    if (chartCanvas) {
      const img = chartCanvas.toDataURL('image/png', 1.0);
      const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
      const imgHeight = (chartCanvas.height / chartCanvas.width) * pageWidth;
      doc.addImage(img, 'PNG', margin, y, pageWidth, Math.min(imgHeight, 300));
      y += Math.min(imgHeight, 300) + 16;
    }

    doc.save(this.fileName('visits', 'pdf'));
    this.toastr.success('PDF exported');
  }

  private downloadBlob(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private fileName(prefix: string, ext: string): string {
    const from = this.toIso(this.range.value.from) ?? 'start';
    const to = this.toIso(this.range.value.to) ?? 'end';
    return `${prefix}_${from}_to_${to}.${ext}`;
  }

  private formatRange(): string {
    const from = this.range.value.from;
    const to = this.range.value.to;
    if (!from || !to) return '—';
    return `${this.formatShortDate(this.toIso(from)!)} – ${this.formatShortDate(this.toIso(to)!)}`;
  }

  private formatShortDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  private toIso(d: Date | null | undefined): string | undefined {
    if (!d) return undefined;
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
