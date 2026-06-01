import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { animate, style, transition, trigger } from '@angular/animations';
import { ToastrService } from 'ngx-toastr';
import { AdminService } from '../../../_services/admin.service';
import { UserSummary } from '../../../_models/admin.model';
import { Role } from '../../../_models/user.model';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/confirm-dialog/confirm-dialog.component';
import { AddStaffDialogComponent } from './add-staff-dialog.component';
import { EditUserDialogComponent, EditUserDialogData } from './edit-user-dialog.component';

type RoleFilter = '' | Role;

@Component({
  selector: 'app-admin-users',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  animations: [
    trigger('fadeRow', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(6px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class UsersComponent {
  private fb = inject(FormBuilder);
  private admin = inject(AdminService);
  private toastr = inject(ToastrService);
  private dialog = inject(MatDialog);

  protected readonly displayedColumns = ['name', 'email', 'role', 'status', 'actions'];
  protected readonly roleOptions: { value: RoleFilter; label: string }[] = [
    { value: '', label: 'All roles' },
    { value: 'Admin', label: 'Admin' },
    { value: 'Doctor', label: 'Doctor' },
    { value: 'Receptionist', label: 'Receptionist' },
    { value: 'Patient', label: 'Patient' },
  ];

  protected loading = signal(true);
  protected acting = signal<string | null>(null);
  protected users = signal<UserSummary[]>([]);

  protected filters = this.fb.group({
    role: this.fb.control<RoleFilter>(''),
    search: this.fb.control<string>(''),
  });

  protected filtered = computed<UserSummary[]>(() => {
    const search = (this.filters.controls.search.value ?? '').trim().toLowerCase();
    const list = this.users();
    if (!search) return list;
    return list.filter(
      (u) => u.fullName.toLowerCase().includes(search) || u.email.toLowerCase().includes(search),
    );
  });

  constructor() {
    this.load();
    this.filters.controls.role.valueChanges.subscribe(() => this.load());
  }

  protected initial(name: string): string {
    const trimmed = (name ?? '').trim();
    return trimmed ? trimmed[0].toUpperCase() : '?';
  }

  protected statusClass(status: string): string {
    return `chip chip--${status.toLowerCase()}`;
  }

  protected roleClass(role: Role): string {
    return `role-pill role-pill--${role.toLowerCase()}`;
  }

  protected openAddStaff(): void {
    this.dialog
      .open(AddStaffDialogComponent, { width: '520px', autoFocus: false })
      .afterClosed()
      .subscribe((created: UserSummary | undefined) => {
        if (created) {
          this.toastr.success('Staff account created');
          // Re-fetch so the new row reflects current filter.
          this.load();
        }
      });
  }

  protected openEdit(user: UserSummary): void {
    const data: EditUserDialogData = { user };
    this.dialog
      .open(EditUserDialogComponent, { width: '520px', data, autoFocus: false })
      .afterClosed()
      .subscribe((updated: UserSummary | undefined) => {
        if (updated) {
          this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
          this.toastr.success('User updated');
        }
      });
  }

  protected confirmDeactivate(user: UserSummary): void {
    if (user.accountStatus === 'Blocked') return;

    const data: ConfirmDialogData = {
      title: 'Deactivate user?',
      message: `Block ${user.fullName}'s account? They will no longer be able to log in. This action can be reversed by editing the account.`,
      confirmLabel: 'Yes, deactivate',
      cancelLabel: 'Keep active',
      tone: 'danger',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data, width: '440px', autoFocus: false })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) this.doDeactivate(user);
      });
  }

  private doDeactivate(user: UserSummary): void {
    if (this.acting()) return;
    this.acting.set(user.id);
    this.admin.deactivateUser(user.id).subscribe({
      next: () => {
        this.users.update((list) =>
          list.map((u) => (u.id === user.id ? { ...u, accountStatus: 'Blocked' } : u)),
        );
        this.acting.set(null);
        this.toastr.success(`${user.fullName} deactivated`);
      },
      error: () => this.acting.set(null),
    });
  }

  private load(): void {
    this.loading.set(true);
    const role = this.filters.controls.role.value || undefined;
    this.admin.getUsers(role || '').subscribe({
      next: (list) => {
        this.users.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.users.set([]);
        this.loading.set(false);
      },
    });
  }
}
