import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm" [class.confirm--danger]="tone === 'danger'">
      <div class="confirm__icon">
        <mat-icon>{{ tone === 'danger' ? 'warning' : 'help_outline' }}</mat-icon>
      </div>
      <h2 class="confirm__title" mat-dialog-title>{{ data.title }}</h2>
      <mat-dialog-content class="confirm__msg">{{ data.message }}</mat-dialog-content>
      <mat-dialog-actions align="end" class="confirm__actions">
        <button mat-button (click)="cancel()">{{ data.cancelLabel ?? 'Cancel' }}</button>
        <button mat-flat-button
                [class.btn-danger]="tone === 'danger'"
                [class.btn-primary]="tone !== 'danger'"
                (click)="confirm()">
          {{ data.confirmLabel ?? 'Confirm' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm { padding: 8px 4px 4px; }
    .confirm__icon {
      width: 48px; height: 48px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: #E3F2FD; color: #1565C0;
      margin-bottom: 12px;
      mat-icon { font-size: 26px; width: 26px; height: 26px; }
    }
    .confirm--danger .confirm__icon { background: #FFEBEE; color: #C62828; }
    .confirm__title {
      margin: 0 0 6px !important;
      font-size: 18px; font-weight: 700; color: #1A1A2E;
      padding: 0 !important;
    }
    .confirm__msg {
      font-size: 14px; color: #546E7A; line-height: 1.5;
      padding: 0 !important;
    }
    .confirm__actions { padding: 16px 0 0 !important; gap: 8px; }
    .btn-primary { background: #1565C0; color: #fff; }
    .btn-primary:hover { background: #0D47A1; }
    .btn-danger  { background: #C62828; color: #fff; }
    .btn-danger:hover  { background: #B71C1C; }
  `],
})
export class ConfirmDialogComponent {
  protected data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<ConfirmDialogComponent, boolean>);

  protected get tone(): 'default' | 'danger' {
    return this.data.tone ?? 'default';
  }

  protected confirm(): void { this.ref.close(true); }
  protected cancel(): void  { this.ref.close(false); }
}
