import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Appointment } from '../../../_models/appointment.model';
import { VisitSummary } from '../../../_models/visit-summary.model';

export interface VisitSummaryDialogData {
  summary: VisitSummary;
  appointment: Appointment;
}

@Component({
  selector: 'app-visit-summary-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dlg">
      <div class="dlg__header">
        <div class="dlg__icon">
          <mat-icon>description</mat-icon>
        </div>
        <div>
          <h2 mat-dialog-title class="dlg__title">Visit Summary</h2>
          <p class="dlg__sub">{{ data.appointment.doctorName }} · {{ data.appointment.appointmentDate }}</p>
        </div>
        <button mat-icon-button mat-dialog-close class="dlg__close" aria-label="Close">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dlg__content">
        <section class="field">
          <h4>Symptoms</h4>
          <p>{{ data.summary.symptoms }}</p>
        </section>

        @if (data.summary.description) {
          <section class="field">
            <h4>Description</h4>
            <p>{{ data.summary.description }}</p>
          </section>
        }

        <div class="field-row">
          <section class="field">
            <h4>Pain Level</h4>
            <div class="pain">
              <span class="pain__value">{{ data.summary.painLevel }}</span>
              <span class="pain__scale">/ 10</span>
            </div>
            <div class="pain__bar">
              <div class="pain__fill"
                   [style.width.%]="data.summary.painLevel * 10"
                   [style.background]="painColor(data.summary.painLevel)">
              </div>
            </div>
          </section>

          @if (data.summary.symptomDuration) {
            <section class="field">
              <h4>Duration</h4>
              <p>{{ data.summary.symptomDuration }}</p>
            </section>
          }
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dlg__actions">
        <button mat-flat-button class="btn-primary" mat-dialog-close>Close</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dlg { padding: 4px; }
    .dlg__header {
      display: grid;
      grid-template-columns: 48px 1fr auto;
      gap: 14px;
      align-items: center;
      padding-bottom: 14px;
      border-bottom: 1px solid #E0E7EF;
    }
    .dlg__icon {
      width: 48px; height: 48px;
      border-radius: 12px;
      background: #E3F2FD; color: #1565C0;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 26px; width: 26px; height: 26px; }
    }
    .dlg__title { margin: 0 !important; font-size: 18px; font-weight: 700; color: #1A1A2E; padding: 0 !important; }
    .dlg__sub { margin: 2px 0 0; font-size: 13px; color: #546E7A; }
    .dlg__close { color: #90A4AE; }

    .dlg__content { padding: 16px 0 !important; max-height: 60vh; }

    .field { margin-bottom: 18px; }
    .field h4 {
      margin: 0 0 6px;
      font-size: 12px; font-weight: 700;
      color: #546E7A;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .field p {
      margin: 0;
      font-size: 14px; color: #1A1A2E; line-height: 1.55;
      white-space: pre-wrap;
    }
    .field-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      @media (max-width: 480px) { grid-template-columns: 1fr; }
    }

    .pain { display: flex; align-items: baseline; gap: 4px; }
    .pain__value { font-size: 22px; font-weight: 700; color: #1A1A2E; }
    .pain__scale { font-size: 13px; color: #90A4AE; }
    .pain__bar {
      margin-top: 6px;
      height: 6px;
      background: #ECEFF1;
      border-radius: 4px;
      overflow: hidden;
    }
    .pain__fill {
      height: 100%;
      border-radius: 4px;
      transition: width 200ms ease-out;
    }

    .dlg__actions { padding: 8px 0 0 !important; }
    .btn-primary { background: #1565C0; color: #fff; }
    .btn-primary:hover { background: #0D47A1; }
  `],
})
export class VisitSummaryDialogComponent {
  protected data = inject<VisitSummaryDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<VisitSummaryDialogComponent>);

  protected painColor(level: number): string {
    if (level <= 3) return '#00897B';
    if (level <= 6) return '#F57C00';
    return '#C62828';
  }
}
