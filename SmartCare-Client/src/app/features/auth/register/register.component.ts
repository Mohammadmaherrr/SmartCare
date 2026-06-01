import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { TextFieldModule } from '@angular/cdk/text-field';
import { animate, style, transition, trigger } from '@angular/animations';
import { AuthService } from '../../../_services/auth.service';
import { PatientRegisterDto } from '../../../_models/user.model';

function matchValues(matchTo: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const parent = control.parent;
    if (!parent) return null;
    return control.value === parent.get(matchTo)?.value ? null : { passwordMismatch: true };
  };
}

const today = new Date().toISOString().split('T')[0];

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule,
    TextFieldModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(30px)' }),
        animate(
          '400ms cubic-bezier(0.25, 0.8, 0.25, 1)',
          style({ opacity: 1, transform: 'translateX(0)' }),
        ),
      ]),
    ]),
  ],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  protected loading = signal(false);
  protected hidePassword = signal(true);
  protected hideConfirm = signal(true);
  protected readonly maxDate = today;

  protected form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, matchValues('password')]],
    dateOfBirth: ['', Validators.required],
    gender: ['', Validators.required],
    contactNumber: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-().]{7,20}$/)]],
    address: ['', [Validators.required, Validators.minLength(10)]],
  });

  constructor() {
    // Re-validate confirmPassword whenever password changes
    this.form.controls.password.valueChanges.subscribe(() => {
      this.form.controls.confirmPassword.updateValueAndValidity();
    });
  }

  protected submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);

    const v = this.form.value;
    const dto: PatientRegisterDto = {
      fullName: v.fullName!,
      email: v.email!,
      password: v.password!,
      role: 'Patient',
      dateOfBirth: v.dateOfBirth!,
      gender: v.gender!,
      contactNumber: v.contactNumber!,
      address: v.address!,
    };

    this.auth.register(dto).subscribe({
      next: () => this.router.navigateByUrl('/patient'),
      error: () => this.loading.set(false),
    });
  }
}
