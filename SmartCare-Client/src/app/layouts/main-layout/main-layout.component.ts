import { Component, inject, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { animate, group, query, style, transition, trigger } from '@angular/animations';
import { AuthService } from '../../_services/auth.service';
import { Role } from '../../_models/user.model';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  sos?: boolean;
}

const NAV: Record<Role, NavItem[]> = {
  Patient: [
    { label: 'Dashboard', icon: 'dashboard', route: '/patient/dashboard' },
    { label: 'Book Appointment', icon: 'event_available', route: '/patient/book-appointment' },
    { label: 'My Appointments', icon: 'calendar_month', route: '/patient/appointments' },
    { label: 'Medical Records', icon: 'folder_open', route: '/patient/records' },
    { label: 'Nearby Clinics', icon: 'location_on', route: '/patient/nearby-clinics' },
    { label: 'Emergency SOS', icon: 'sos', route: '/patient/emergency', sos: true },
  ],
  Doctor: [
    { label: 'Dashboard', icon: 'dashboard', route: '/doctor/dashboard' },
    { label: "Today's Schedule", icon: 'today', route: '/doctor/schedule' },
    { label: 'Patient Records', icon: 'folder_open', route: '/doctor/patient-records' },
    { label: 'Emergencies', icon: 'sos', route: '/doctor/emergencies' },
  ],
  Receptionist: [
    { label: 'Dashboard', icon: 'dashboard', route: '/receptionist/dashboard' },
    { label: 'Appointments', icon: 'calendar_today', route: '/receptionist/appointments' },
    { label: 'Emergencies', icon: 'sos', route: '/receptionist/emergencies' },
  ],
  Admin: [
    { label: 'Dashboard', icon: 'dashboard', route: '/admin/dashboard' },
    { label: 'Users', icon: 'manage_accounts', route: '/admin/users' },
    { label: 'Emergencies', icon: 'sos', route: '/admin/emergencies' },
    { label: 'Reports', icon: 'bar_chart', route: '/admin/reports' },
    { label: 'Settings', icon: 'settings', route: '/admin/settings' },
  ],
};

@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  animations: [
    trigger('routeAnimation', [
      transition('* <=> *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(8px)' }),
            animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
          ],
          { optional: true },
        ),
        group([
          query(':leave', [animate('120ms ease-in', style({ opacity: 0 }))], { optional: true }),
        ]),
      ]),
    ]),
  ],
})
export class MainLayoutComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  protected user = this.auth.currentUser;
  protected navItems = computed<NavItem[]>(() => {
    const role = this.user()?.role;
    return role ? NAV[role] : [];
  });

  protected getRouteKey(outlet: RouterOutlet): string {
    return outlet.isActivated ? (outlet.activatedRoute.snapshot.routeConfig?.path ?? '') : '';
  }

  protected logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
