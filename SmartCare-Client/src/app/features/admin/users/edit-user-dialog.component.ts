import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService } from '../../../_services/admin.service';
import { UpdateUserRequest, UserSummary } from '../../../_models/admin.model';

export interface EditUserDialogData {
  user: UserSummary;
}

@Component({
  selector: 'app-edit-user-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './edit-user-dialog.component.html',
  styleUrl: './add-staff-dialog.component.scss',
})
export class EditUserDialogComponent {
  private fb = inject(FormBuilder);
  private admin = inject(AdminService);
  private ref = inject(MatDialogRef<EditUserDialogComponent, UserSummary>);
  protected data = inject<EditUserDialogData>(MAT_DIALOG_DATA);

  protected submitting = signal(false);

  protected user = this.data.user;
  protected role = this.user.role;

  protected form = this.fb.group({
    fullName: this.fb.control(this.user.fullName, {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    email: this.fb.control(this.user.email, {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    specialization: this.fb.control(this.user.specialization ?? ''),
    licenseNumber: this.fb.control(this.user.licenseNumber ?? ''),
    employeeId: this.fb.control(this.user.employeeId ?? ''),
    dateOfBirth: this.fb.control<Date | null>(
      this.user.dateOfBirth ? this.parseIso(this.user.dateOfBirth) : null,
    ),
    gender: this.fb.control(this.user.gender ?? ''),
    contactNumber: this.fb.control(this.user.contactNumber ?? ''),
    address: this.fb.control(this.user.address ?? ''),
  });

  protected cancel(): void {
    this.ref.close();
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) return;

    const v = this.form.getRawValue();
    const payload: UpdateUserRequest = {
      fullName: v.fullName.trim(),
      email: v.email.trim(),
    };

    if (this.role === 'Doctor') {
      payload.specialization = v.specialization?.trim() || undefined;
      payload.licenseNumber = v.licenseNumber?.trim() || undefined;
    } else if (this.role === 'Receptionist') {
      payload.employeeId = v.employeeId?.trim() || undefined;
    } else if (this.role === 'Patient') {
      payload.dateOfBirth = v.dateOfBirth ? this.toIso(v.dateOfBirth) : undefined;
      payload.gender = v.gender?.trim() || undefined;
      payload.contactNumber = v.contactNumber?.trim() || undefined;
      payload.address = v.address?.trim() || undefined;
    }

    this.submitting.set(true);
    this.admin.updateUser(this.user.id, payload).subscribe({
      next: updated => {
        this.submitting.set(false);
        this.ref.close(updated);
      },
      error: () => this.submitting.set(false),
    });
  }

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private parseIso(value: string): Date {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}
