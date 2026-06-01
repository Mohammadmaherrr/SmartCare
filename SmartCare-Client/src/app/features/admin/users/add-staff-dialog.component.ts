import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminService } from '../../../_services/admin.service';
import { CreateStaffRequest, StaffRole, UserSummary } from '../../../_models/admin.model';

@Component({
  selector: 'app-add-staff-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './add-staff-dialog.component.html',
  styleUrl: './add-staff-dialog.component.scss',
})
export class AddStaffDialogComponent {
  private fb = inject(FormBuilder);
  private admin = inject(AdminService);
  private ref = inject(MatDialogRef<AddStaffDialogComponent, UserSummary>);

  protected submitting = signal(false);
  protected showPassword = signal(false);

  protected form = this.fb.group({
    role: this.fb.control<StaffRole>('Doctor', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    fullName: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200)],
    }),
    email: this.fb.control('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: this.fb.control('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/),
      ],
    }),
    specialization: this.fb.control(''),
    licenseNumber: this.fb.control(''),
    employeeId: this.fb.control(''),
  });

  protected role = signal<StaffRole>('Doctor');

  protected isDoctor = computed(() => this.role() === 'Doctor');

  constructor() {
    this.form.controls.role.valueChanges.subscribe((value) => {
      this.role.set(value);
      this.applyRoleValidators(value);
    });
    this.applyRoleValidators('Doctor');
  }

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected cancel(): void {
    this.ref.close();
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) return;

    const v = this.form.getRawValue();
    const payload: CreateStaffRequest = {
      role: v.role,
      fullName: v.fullName.trim(),
      email: v.email.trim(),
      password: v.password,
      ...(v.role === 'Doctor'
        ? {
            specialization: v.specialization?.trim() || undefined,
            licenseNumber: v.licenseNumber?.trim() || undefined,
          }
        : {
            employeeId: v.employeeId?.trim() || undefined,
          }),
    };

    this.submitting.set(true);
    this.admin.createStaff(payload).subscribe({
      next: (created) => {
        this.submitting.set(false);
        this.ref.close(created);
      },
      error: () => this.submitting.set(false),
    });
  }

  private applyRoleValidators(role: StaffRole): void {
    const { specialization, licenseNumber, employeeId } = this.form.controls;
    specialization.clearValidators();
    licenseNumber.clearValidators();
    employeeId.clearValidators();

    if (role === 'Doctor') {
      specialization.setValidators([Validators.required, Validators.maxLength(100)]);
      licenseNumber.setValidators([Validators.required, Validators.maxLength(50)]);
      employeeId.setValue('');
    } else {
      employeeId.setValidators([Validators.required, Validators.maxLength(50)]);
      specialization.setValue('');
      licenseNumber.setValue('');
    }

    specialization.updateValueAndValidity();
    licenseNumber.updateValueAndValidity();
    employeeId.updateValueAndValidity();
  }
}
